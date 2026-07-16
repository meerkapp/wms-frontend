import { db } from '../db/db'
import { syncApi } from '../api/sync.api'
import { isOlderEntity } from '../utils/sync.helpers'
import type { LocalProductItemStats, ProductItemStatsCacheScope } from '../types/entities.types'

export const FOREIGN_WAREHOUSE_STATS_TTL_MS = 24 * 60 * 60 * 1000
export const PRODUCT_ITEM_STATS_FETCH_LIMIT = 5000

const CLEANUP_INTERVAL_MS = 15 * 60 * 1000
const MAX_FETCH_PAGES = 1000

type AccountId = ProductItemStatsCacheScope['accountId']
type CacheScopeKey = [AccountId, ProductItemStatsCacheScope['warehouseId']]

export interface EnsureProductItemStatsOptions {
  pinned?: boolean
  force?: boolean
}

let activeAccountId: AccountId | null = null
let homeWarehouseId: number | null = null
let activeWarehouseId: number | null = null
let lastCleanupAt = 0

// Snapshot rows are dataset-scoped, so concurrent accounts may safely share a
// single warehouse fetch. Each waiter writes its own account-scoped metadata.
const pendingFetches = new Map<number, Promise<LocalProductItemStats[]>>()
const accountGenerations = new Map<AccountId, number>()
const pendingAccountOperations = new Map<AccountId, Map<number, Set<Promise<unknown>>>>()

function cacheScopeKey(accountId: AccountId, warehouseId: number): CacheScopeKey {
  return [accountId, warehouseId]
}

function accountGeneration(accountId: AccountId): number {
  return accountGenerations.get(accountId) ?? 0
}

function invalidateAccountOperations(accountId: AccountId) {
  accountGenerations.set(accountId, accountGeneration(accountId) + 1)
}

function trackAccountOperation<T>(
  accountId: AccountId,
  warehouseId: number,
  operation: Promise<T>,
): Promise<T> {
  let operationsByWarehouse = pendingAccountOperations.get(accountId)
  if (!operationsByWarehouse) {
    operationsByWarehouse = new Map()
    pendingAccountOperations.set(accountId, operationsByWarehouse)
  }

  let warehouseOperations = operationsByWarehouse.get(warehouseId)
  if (!warehouseOperations) {
    warehouseOperations = new Set()
    operationsByWarehouse.set(warehouseId, warehouseOperations)
  }

  const trackedOperation = operation.finally(() => {
    const currentOperationsByWarehouse = pendingAccountOperations.get(accountId)
    const currentWarehouseOperations = currentOperationsByWarehouse?.get(warehouseId)
    currentWarehouseOperations?.delete(trackedOperation)
    if (currentWarehouseOperations?.size === 0) {
      currentOperationsByWarehouse?.delete(warehouseId)
    }
    if (currentOperationsByWarehouse?.size === 0) pendingAccountOperations.delete(accountId)
  })
  warehouseOperations.add(trackedOperation)
  return trackedOperation
}

function snapshotAccountOperations(accountId: AccountId) {
  const operationsByWarehouse = pendingAccountOperations.get(accountId)
  if (!operationsByWarehouse) return { warehouseIds: [], operations: [] }

  return {
    warehouseIds: [...operationsByWarehouse.keys()],
    operations: [...operationsByWarehouse.values()].flatMap((operations) => [...operations]),
  }
}

function hasPendingAccountOperation(warehouseId: number) {
  return [...pendingAccountOperations.values()].some((operationsByWarehouse) =>
    operationsByWarehouse.has(warehouseId),
  )
}

function requireActiveAccount(): { accountId: AccountId; generation: number } {
  if (activeAccountId === null) {
    throw new Error('Product item stats cache requires an active account')
  }
  return { accountId: activeAccountId, generation: accountGeneration(activeAccountId) }
}

export function isProductItemStatsScopeFresh(
  scope: ProductItemStatsCacheScope | undefined,
  now = Date.now(),
): boolean {
  if (!scope) return false
  return scope.pinned || (scope.expiresAt !== null && scope.expiresAt > now)
}

function isCurrentAccountScopeActive(scope: ProductItemStatsCacheScope): boolean {
  return (
    scope.accountId === activeAccountId &&
    (scope.warehouseId === homeWarehouseId || scope.warehouseId === activeWarehouseId)
  )
}

function isScopeRequired(scope: ProductItemStatsCacheScope, now: number): boolean {
  return (
    isCurrentAccountScopeActive(scope) ||
    isProductItemStatsScopeFresh(scope, now) ||
    hasPendingAccountOperation(scope.warehouseId)
  )
}

function expiresAtFor(pinned: boolean, now: number): number | null {
  return pinned ? null : now + FOREIGN_WAREHOUSE_STATS_TTL_MS
}

async function fetchAndCacheWarehouse(warehouseId: number): Promise<LocalProductItemStats[]> {
  const itemsById = new Map<LocalProductItemStats['id'], LocalProductItemStats>()
  let cursor: string | undefined
  let complete = false

  for (let page = 1; page <= MAX_FETCH_PAGES; page += 1) {
    const response = await syncApi.fetchProductItemStats({
      warehouseId,
      cursor,
      limit: PRODUCT_ITEM_STATS_FETCH_LIMIT,
    })

    for (const item of response.items) {
      const existing = itemsById.get(item.id)
      if (!existing || !isOlderEntity(item, existing)) itemsById.set(item.id, item)
    }

    if (!response.hasMore) {
      complete = true
      break
    }
    if (typeof response.cursor !== 'string' || response.cursor === cursor) {
      throw new Error('Product item stats pagination did not advance its cursor')
    }
    cursor = response.cursor
  }

  if (!complete) {
    throw new Error(`Product item stats pagination exceeded ${MAX_FETCH_PAGES} pages`)
  }

  const responseItems = [...itemsById.values()]

  await db.transaction('rw', db.productItemStats, async () => {
    const existingItems = await db.productItemStats
      .where('warehouseId')
      .equals(warehouseId)
      .toArray()
    const existingById = new Map(existingItems.map((item) => [item.id, item]))
    const freshItems = responseItems.filter((item) => {
      const existing = existingById.get(item.id)
      return !existing || !isOlderEntity(item, existing)
    })

    // Socket application waits for the complete in-flight snapshot, so rows
    // absent from all fetched pages are stale for the shared dataset.
    const responseIds = new Set(responseItems.map((item) => item.id))
    const deletedIds = existingItems
      .filter((item) => !responseIds.has(item.id))
      .map((item) => item.id)
    if (deletedIds.length > 0) await db.productItemStats.bulkDelete(deletedIds)

    if (freshItems.length > 0) await db.productItemStats.bulkPut(freshItems)
  })

  return responseItems
}

function getOrCreatePendingFetch(warehouseId: number): Promise<LocalProductItemStats[]> {
  const pending = pendingFetches.get(warehouseId)
  if (pending) return pending

  const promise = fetchAndCacheWarehouse(warehouseId).finally(() => {
    if (pendingFetches.get(warehouseId) === promise) pendingFetches.delete(warehouseId)
  })
  pendingFetches.set(warehouseId, promise)
  return promise
}

async function storeFetchedScope(
  accountId: AccountId,
  generation: number,
  warehouseId: number,
  pinned: boolean,
) {
  if (accountGeneration(accountId) !== generation) return

  const now = Date.now()
  await db.productItemStatsCache.put({
    accountId,
    warehouseId,
    pinned,
    loadedAt: now,
    accessedAt: now,
    expiresAt: expiresAtFor(pinned, now),
  })
}

async function touchScope(
  accountId: AccountId,
  generation: number,
  warehouseId: number,
  pin?: boolean,
) {
  if (accountGeneration(accountId) !== generation) return

  const key = cacheScopeKey(accountId, warehouseId)
  const scope = await db.productItemStatsCache.get(key)
  if (!scope || accountGeneration(accountId) !== generation) return

  const now = Date.now()
  const pinned = pin ?? scope.pinned
  await db.productItemStatsCache.update(key, {
    pinned,
    accessedAt: now,
    expiresAt: expiresAtFor(pinned, now),
  })
}

async function deleteStatsWithoutRequiredScopes(warehouseIds: number[], now: number) {
  const uniqueWarehouseIds = [...new Set(warehouseIds)]
  if (uniqueWarehouseIds.length === 0) return []

  const remainingScopes = await db.productItemStatsCache
    .where('warehouseId')
    .anyOf(uniqueWarehouseIds)
    .toArray()
  const requiredWarehouseIds = new Set(
    remainingScopes
      .filter((scope) => isScopeRequired(scope, now))
      .map((scope) => scope.warehouseId),
  )
  if (activeAccountId !== null) {
    if (homeWarehouseId !== null) requiredWarehouseIds.add(homeWarehouseId)
    if (activeWarehouseId !== null) requiredWarehouseIds.add(activeWarehouseId)
  }
  for (const warehouseId of uniqueWarehouseIds) {
    if (hasPendingAccountOperation(warehouseId)) requiredWarehouseIds.add(warehouseId)
  }
  const orphanedWarehouseIds = uniqueWarehouseIds.filter(
    (warehouseId) => !requiredWarehouseIds.has(warehouseId),
  )

  if (orphanedWarehouseIds.length > 0) {
    await db.productItemStats.where('warehouseId').anyOf(orphanedWarehouseIds).delete()
  }
  return orphanedWarehouseIds
}

export const productItemStatsRepository = {
  async configureAccount(accountId: AccountId, warehouseId: number | null) {
    activeAccountId = accountId
    homeWarehouseId = warehouseId
    activeWarehouseId = null

    const now = Date.now()
    await db.transaction('rw', db.productItemStatsCache, async () => {
      await db.productItemStatsCache
        .where('accountId')
        .equals(accountId)
        .filter((scope) => scope.pinned && scope.warehouseId !== warehouseId)
        .modify({
          pinned: false,
          expiresAt: now + FOREIGN_WAREHOUSE_STATS_TTL_MS,
        })

      if (warehouseId === null) return
      const key = cacheScopeKey(accountId, warehouseId)
      if (await db.productItemStatsCache.get(key)) {
        await db.productItemStatsCache.update(key, {
          pinned: true,
          accessedAt: now,
          expiresAt: null,
        })
      }
    })
  },

  deactivateAccount(accountId?: AccountId) {
    if (accountId !== undefined && accountId !== activeAccountId) return
    activeAccountId = null
    homeWarehouseId = null
    activeWarehouseId = null
  },

  setActiveWarehouse(warehouseId: number | null) {
    activeWarehouseId = warehouseId
  },

  hasPendingFetch(warehouseId: number) {
    return pendingFetches.has(warehouseId)
  },

  async waitForPendingFetch(warehouseId: number) {
    try {
      await pendingFetches.get(warehouseId)
    } catch {
      // A live event is still useful when the parallel snapshot request failed.
    }
  },

  async waitForPendingFetches() {
    await Promise.all(
      [...pendingFetches.values()].map(async (pending) => {
        try {
          await pending
        } catch {
          // Removed ids are still safe to apply after a failed snapshot.
        }
      }),
    )
  },

  async ensureForWarehouse(
    warehouseId: number,
    options: EnsureProductItemStatsOptions = {},
  ): Promise<LocalProductItemStats[]> {
    const { accountId, generation } = requireActiveAccount()
    const pinned = options.pinned ?? warehouseId === homeWarehouseId
    const operation = (async () => {
      const now = Date.now()
      const scope = await db.productItemStatsCache.get(cacheScopeKey(accountId, warehouseId))

      if (!options.force && isProductItemStatsScopeFresh(scope, now)) {
        await touchScope(accountId, generation, warehouseId, pinned)
        return this.listByWarehouse(warehouseId)
      }

      // removeAccountScopes() invalidates the generation before waiting for
      // tracked work, so an operation paused on the cache lookup must not start
      // a new snapshot for an account that has already been removed.
      if (accountGeneration(accountId) !== generation) return this.listByWarehouse(warehouseId)

      const items = await getOrCreatePendingFetch(warehouseId)
      await storeFetchedScope(accountId, generation, warehouseId, pinned)
      return items
    })()

    return trackAccountOperation(accountId, warehouseId, operation)
  },

  listByWarehouse(warehouseId: number) {
    return db.productItemStats.where('warehouseId').equals(warehouseId).toArray()
  },

  getByWarehouseAndItem(warehouseId: number, productItemId: number) {
    return db.productItemStats
      .where('[warehouseId+productItemId]')
      .equals([warehouseId, productItemId])
      .first()
  },

  async cleanupExpired(force = false) {
    const now = Date.now()
    if (!force && now - lastCleanupAt < CLEANUP_INTERVAL_MS) return []
    lastCleanupAt = now

    return db.transaction('rw', db.productItemStats, db.productItemStatsCache, async () => {
      const expiredScopes = await db.productItemStatsCache
        .filter((scope) => !isScopeRequired(scope, now))
        .toArray()
      if (expiredScopes.length === 0) return []

      const keys = expiredScopes.map((scope) => cacheScopeKey(scope.accountId, scope.warehouseId))
      const warehouseIds = expiredScopes.map((scope) => scope.warehouseId)
      await db.productItemStatsCache.bulkDelete(keys)
      return deleteStatsWithoutRequiredScopes(warehouseIds, now)
    })
  },

  async removeAccountScopes(accountId: AccountId) {
    invalidateAccountOperations(accountId)
    this.deactivateAccount(accountId)
    const pending = snapshotAccountOperations(accountId)
    await Promise.all(pending.operations.map((operation) => operation.catch(() => undefined)))

    const now = Date.now()

    return db.transaction('rw', db.productItemStats, db.productItemStatsCache, async () => {
      const scopes = await db.productItemStatsCache.where('accountId').equals(accountId).toArray()
      const keys = scopes.map((scope) => cacheScopeKey(scope.accountId, scope.warehouseId))
      const warehouseIds = [
        ...new Set([...pending.warehouseIds, ...scopes.map((scope) => scope.warehouseId)]),
      ]
      if (keys.length > 0) await db.productItemStatsCache.bulkDelete(keys)
      return deleteStatsWithoutRequiredScopes(warehouseIds, now)
    })
  },

  async hasActiveScope(warehouseId: number) {
    if (!Number.isInteger(warehouseId) || warehouseId <= 0) return false
    if (warehouseId === homeWarehouseId || warehouseId === activeWarehouseId) return true

    const now = Date.now()
    const scopes = await db.productItemStatsCache.where('warehouseId').equals(warehouseId).toArray()
    return scopes.some((scope) => isScopeRequired(scope, now))
  },

  shouldApplySocketUpdate(stat: Pick<LocalProductItemStats, 'warehouseId'>) {
    return this.hasActiveScope(stat.warehouseId)
  },
}
