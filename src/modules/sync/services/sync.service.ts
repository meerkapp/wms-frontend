import { reactive, readonly } from 'vue'
import { connectSocket, disconnectSocket, socket } from '@/core/api/socket'
import { syncApi } from '../api/sync.api'
import { db } from '../db/db'
import { productItemStatsRepository } from '../repositories/product-item-stats.repository'
import { chunkArray, nextFrame } from '../utils/batching'
import {
  hasSyncCursorChanged,
  isOlderEntity,
  normalizePullResponse,
  normalizeSocketPayload,
} from '../utils/sync.helpers'
import { getSyncCollectionByTableName, syncCollections } from './collections'
import type { LocalEntity, LocalProductItemStats } from '../types/entities.types'
import type {
  NormalizedSyncBatch,
  SyncCollection,
  SyncProgress,
  SyncReason,
  SyncRuntimeState,
  SyncState,
} from '../types/sync.types'

const APPLY_CHUNK_SIZE = 1000
const PULL_PAGE_SIZE = 1000
const MAX_PULL_ITERATIONS = 1000

const initialSyncCollections = syncCollections.filter(
  (collection) => collection.initialSync !== false,
)

interface SyncAllOptions {
  reason?: SyncReason
  onProgress?: (progress: SyncProgress) => void
}

interface SyncSessionContext {
  accountId: string
  homeWarehouseId: number | null
}

class SyncSessionStoppedError extends Error {
  constructor() {
    super('Sync session stopped')
    this.name = 'SyncSessionStoppedError'
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export class LocalSyncService {
  private socketHandlersRegistered = false
  private started = false
  private hasConnected = false
  private accountId: string | null = null
  private homeWarehouseId: number | null = null
  private homeWarehouseConfiguration: Promise<void> = Promise.resolve()
  private sessionEpoch = 0
  private syncAllPromise: Promise<void> | null = null
  private readonly collectionQueues = new Map<string, Promise<void>>()
  private readonly socketCollectionHandlers = new Map<string, (payload: unknown) => void>()
  private readonly runtimeState = reactive<SyncRuntimeState>({
    status: 'idle',
    reason: null,
    current: 0,
    total: initialSyncCollections.length,
    currentTable: null,
    error: null,
  })

  readonly state = readonly(this.runtimeState)

  private readonly onSocketConnect = () => {
    if (!this.started) return
    const reason: SyncReason = this.hasConnected ? 'reconnect' : 'connect'
    this.hasConnected = true
    void this.syncAll({ reason }).catch((error) => this.logError(`[sync:${reason}]`, error))
  }

  private readonly onSocketConnectError = (error: Error) => {
    if (!this.started) return
    console.error('[sync:socket-connect]', error)
    if (this.runtimeState.status !== 'syncing') {
      this.runtimeState.status = 'error'
      this.runtimeState.error = `WebSocket: ${error.message}`
    }
  }

  start(token: string, context: SyncSessionContext) {
    if (this.started && this.accountId !== context.accountId) this.stop()

    this.accountId = context.accountId
    this.homeWarehouseId = context.homeWarehouseId
    this.homeWarehouseConfiguration = productItemStatsRepository.configureAccount(
      context.accountId,
      context.homeWarehouseId,
    )

    const isNewSession = !this.started
    if (isNewSession) {
      this.started = true
      this.sessionEpoch += 1
      this.hasConnected = false
      Object.assign(this.runtimeState, {
        status: 'idle',
        reason: null,
        current: 0,
        total: initialSyncCollections.length,
        currentTable: null,
        error: null,
      } satisfies SyncRuntimeState)
    }

    this.registerSocketHandlers()
    connectSocket(token)
    void this.homeWarehouseConfiguration
      .then(() => productItemStatsRepository.cleanupExpired())
      .catch((error) => this.logError('[product-item-stats:cleanup]', error))

    // Normally connectSocket emits `connect` asynchronously. This covers an
    // already-connected singleton without scheduling a duplicate catch-up.
    if (isNewSession && socket.connected) this.onSocketConnect()
  }

  stop() {
    const accountId = this.accountId
    if (!this.started && !this.socketHandlersRegistered) {
      productItemStatsRepository.deactivateAccount(accountId ?? undefined)
      this.accountId = null
      this.homeWarehouseId = null
      this.homeWarehouseConfiguration = Promise.resolve()
      disconnectSocket()
      return
    }

    this.started = false
    this.sessionEpoch += 1
    this.hasConnected = false
    this.accountId = null
    this.homeWarehouseId = null
    this.homeWarehouseConfiguration = Promise.resolve()
    productItemStatsRepository.deactivateAccount(accountId ?? undefined)
    this.syncAllPromise = null
    this.collectionQueues.clear()
    this.unregisterSocketHandlers()
    disconnectSocket()

    Object.assign(this.runtimeState, {
      status: 'idle',
      reason: null,
      current: 0,
      total: initialSyncCollections.length,
      currentTable: null,
      error: null,
    } satisfies SyncRuntimeState)
  }

  async removeAccount(accountId: string) {
    if (this.accountId === accountId) this.stop()
    return productItemStatsRepository.removeAccountScopes(accountId)
  }

  initialSync(onProgress?: (progress: SyncProgress) => void) {
    return this.syncAll({ reason: 'initial', onProgress })
  }

  syncAll(options: SyncAllOptions = {}): Promise<void> {
    if (!this.started) return Promise.reject(new SyncSessionStoppedError())
    if (this.syncAllPromise) return this.syncAllPromise

    const epoch = this.sessionEpoch
    const promise = this.runSyncAll(epoch, options).finally(() => {
      if (this.syncAllPromise === promise) this.syncAllPromise = null
    })
    this.syncAllPromise = promise
    return promise
  }

  async syncCollection(collectionOrTableName: SyncCollection | string): Promise<void> {
    const collection =
      typeof collectionOrTableName === 'string'
        ? getSyncCollectionByTableName(collectionOrTableName)
        : collectionOrTableName
    if (!collection) throw new Error(`Unknown sync table: ${collectionOrTableName}`)

    const epoch = this.sessionEpoch
    this.assertActiveSession(epoch)
    return this.enqueueCollection(collection.id, () => this.pullCollection(collection, epoch))
  }

  async applyServerUpsert<T extends LocalEntity>(tableName: string, entity: T): Promise<void> {
    const collection = getSyncCollectionByTableName(tableName)
    if (!collection) throw new Error(`Unknown sync table: ${tableName}`)
    if (!this.started) return

    const epoch = this.sessionEpoch
    try {
      await this.enqueueCollection(collection.id, async () => {
        await this.applyBatch(
          collection,
          {
            upserted: [entity],
            deletedIds: [],
            cursor: null,
            hasMore: false,
          },
          epoch,
          false,
        )
      })
    } catch (error) {
      if (error instanceof SyncSessionStoppedError) return
      throw error
    }
  }

  async handleSocketEvent(tableName: string, payload: unknown): Promise<void> {
    if (!this.started) return
    const collection = getSyncCollectionByTableName(tableName)
    if (!collection) {
      console.warn(`[sync] Ignoring event for an unknown table: ${tableName}`)
      return
    }

    const epoch = this.sessionEpoch
    await this.enqueueCollection(collection.id, async () => {
      this.assertActiveSession(epoch)

      if (tableName === 'product_item_stats') {
        const batch = normalizeSocketPayload<LocalProductItemStats>(payload, null)
        const warehouseIds = [...new Set(batch.upserted.map((stat) => stat.warehouseId))]
        const warehousesWithPendingSnapshot = new Set(
          warehouseIds.filter((warehouseId) =>
            productItemStatsRepository.hasPendingFetch(warehouseId),
          ),
        )
        if (batch.deletedIds.length > 0) {
          await productItemStatsRepository.waitForPendingFetches()
        } else {
          await Promise.all(
            warehouseIds.map((warehouseId) =>
              productItemStatsRepository.waitForPendingFetch(warehouseId),
            ),
          )
        }
        this.assertActiveSession(epoch)
        const applyByWarehouse = new Map(
          await Promise.all(
            warehouseIds.map(
              async (warehouseId) =>
                [
                  warehouseId,
                  warehousesWithPendingSnapshot.has(warehouseId) ||
                    (await productItemStatsRepository.shouldApplySocketUpdate({ warehouseId })),
                ] as const,
            ),
          ),
        )
        this.assertActiveSession(epoch)
        await this.applyBatch(
          collection as SyncCollection<LocalProductItemStats>,
          {
            ...batch,
            upserted: batch.upserted.filter((stat) => applyByWarehouse.get(stat.warehouseId)),
          },
          epoch,
          false,
        )
        return
      }

      const batch = normalizeSocketPayload(payload, null)
      // Live events update the read model but never advance the pull checkpoint.
      // Only an ordered, successful /sync/pull response may persist its cursor.
      await this.applyBatch(collection, batch, epoch, false)
    })
  }

  private async runSyncAll(epoch: number, options: SyncAllOptions) {
    const reason = options.reason ?? 'manual'
    const collections = initialSyncCollections
    Object.assign(this.runtimeState, {
      status: 'syncing',
      reason,
      current: 0,
      total: collections.length,
      currentTable: null,
      error: null,
    } satisfies SyncRuntimeState)

    try {
      for (const [index, collection] of collections.entries()) {
        this.assertActiveSession(epoch)
        const progress: SyncProgress = {
          current: index + 1,
          total: collections.length,
          collection,
        }
        this.runtimeState.current = progress.current
        this.runtimeState.currentTable = collection.tableName
        options.onProgress?.(progress)

        await this.enqueueCollection(collection.id, () => this.pullCollection(collection, epoch))
        await nextFrame()
      }

      this.assertActiveSession(epoch)
      this.runtimeState.status = 'done'
      this.runtimeState.current = collections.length
      this.runtimeState.currentTable = null
      this.scheduleProductItemStatsMaintenance(epoch)
    } catch (error) {
      if (error instanceof SyncSessionStoppedError) throw error
      if (this.isActiveSession(epoch)) {
        this.runtimeState.status = 'error'
        this.runtimeState.error = errorMessage(error)
      }
      throw error
    }
  }

  private async pullCollection<T extends LocalEntity>(
    collection: SyncCollection<T>,
    epoch: number,
  ) {
    this.assertActiveSession(epoch)
    const existingState = await db.syncState.get(collection.id)
    this.assertActiveSession(epoch)
    let cursor = existingState?.cursor ?? null

    await this.setCollectionState(
      collection.id,
      {
        cursor,
        status: 'syncing',
        error: null,
        lastSyncedAt: existingState?.lastSyncedAt,
      },
      epoch,
    )

    try {
      for (let iteration = 1; iteration <= MAX_PULL_ITERATIONS; iteration += 1) {
        this.assertActiveSession(epoch)
        const response = await syncApi.pull<T>(collection.tableName, cursor, PULL_PAGE_SIZE)
        this.assertActiveSession(epoch)
        const batch = normalizePullResponse(response, cursor)
        const appliedCursor = await this.applyBatch(collection, batch, epoch)

        if (!batch.hasMore) return
        if (!hasSyncCursorChanged(cursor, appliedCursor)) {
          const message =
            `Sync pull for ${collection.tableName} returned hasMore=true ` +
            `without advancing cursor (${String(cursor)})`
          console.warn(`[sync:${collection.tableName}] ${message}`)
          throw new Error(message)
        }

        cursor = appliedCursor
        await nextFrame()
      }

      throw new Error(
        `Sync pull for ${collection.tableName} exceeded ${MAX_PULL_ITERATIONS} iterations`,
      )
    } catch (error) {
      if (error instanceof SyncSessionStoppedError) throw error
      if (this.isActiveSession(epoch)) {
        const latestState = await db.syncState.get(collection.id)
        this.assertActiveSession(epoch)
        await this.setCollectionState(
          collection.id,
          {
            cursor: latestState?.cursor ?? cursor,
            status: 'error',
            error: errorMessage(error),
            lastSyncedAt: latestState?.lastSyncedAt,
          },
          epoch,
        )
      }
      throw error
    }
  }

  private async applyBatch<T extends LocalEntity>(
    collection: SyncCollection<T>,
    batch: NormalizedSyncBatch<T>,
    epoch: number,
    persistState = true,
  ) {
    this.assertActiveSession(epoch)
    await db.transaction('rw', collection.table, db.syncState, async () => {
      this.assertActiveSession(epoch)

      for (const chunk of chunkArray(batch.upserted, APPLY_CHUNK_SIZE)) {
        this.assertActiveSession(epoch)
        const existing = await collection.table.bulkGet(
          chunk.map((item) => item.id) as Parameters<typeof collection.table.bulkGet>[0],
        )
        const freshItems = chunk.filter((item, index) => {
          const localItem = existing[index]
          return !localItem || !isOlderEntity(item, localItem)
        })
        if (freshItems.length > 0) await collection.table.bulkPut(freshItems)
      }

      for (const chunk of chunkArray(batch.deletedIds, APPLY_CHUNK_SIZE)) {
        this.assertActiveSession(epoch)
        await collection.table.bulkDelete(
          chunk as Parameters<typeof collection.table.bulkDelete>[0],
        )
      }

      if (!persistState) return
      this.assertActiveSession(epoch)
      await db.syncState.put({
        id: collection.id,
        cursor: batch.cursor,
        lastSyncedAt: new Date().toISOString(),
        status: batch.hasMore ? 'syncing' : 'idle',
        error: null,
      })
    })

    // TODO(sync): timestamp pulls cannot recover physical deletes missed while
    // offline. Reliable replay needs backend revisions plus tombstones/outbox.
    return batch.cursor
  }

  private enqueueCollection(id: string, task: () => Promise<void>): Promise<void> {
    const previous = this.collectionQueues.get(id) ?? Promise.resolve()
    const next = previous.catch(() => undefined).then(task)
    this.collectionQueues.set(id, next)
    const cleanup = () => {
      if (this.collectionQueues.get(id) === next) this.collectionQueues.delete(id)
    }
    void next.then(cleanup, cleanup)
    return next
  }

  private registerSocketHandlers() {
    if (this.socketHandlersRegistered) return
    this.socketHandlersRegistered = true

    socket.on('connect', this.onSocketConnect)
    socket.on('connect_error', this.onSocketConnectError)

    for (const collection of syncCollections) {
      if (collection.socketSync === false) continue
      const handler = (payload: unknown) => {
        void this.handleSocketEvent(collection.tableName, payload).catch((error) => {
          this.logError(`[sync:${collection.tableName}]`, error)
          if (this.started && !(error instanceof SyncSessionStoppedError)) {
            this.runtimeState.status = 'error'
            this.runtimeState.error = errorMessage(error)
            this.runtimeState.currentTable = collection.tableName
          }
        })
      }
      this.socketCollectionHandlers.set(collection.tableName, handler)
      socket.on(`sync:${collection.tableName}`, handler)
    }
  }

  private unregisterSocketHandlers() {
    if (!this.socketHandlersRegistered) return
    this.socketHandlersRegistered = false

    socket.off('connect', this.onSocketConnect)
    socket.off('connect_error', this.onSocketConnectError)
    for (const [tableName, handler] of this.socketCollectionHandlers) {
      socket.off(`sync:${tableName}`, handler)
    }
    this.socketCollectionHandlers.clear()
  }

  private setCollectionState(id: string, state: Omit<SyncState, 'id'>, epoch: number) {
    return db.transaction('rw', db.syncState, async () => {
      this.assertActiveSession(epoch)
      await db.syncState.put({ id, ...state })
      this.assertActiveSession(epoch)
    })
  }

  private isActiveSession(epoch: number) {
    return this.started && this.sessionEpoch === epoch
  }

  private assertActiveSession(epoch: number) {
    if (!this.isActiveSession(epoch)) throw new SyncSessionStoppedError()
  }

  private logError(prefix: string, error: unknown) {
    if (!(error instanceof SyncSessionStoppedError)) console.error(prefix, error)
  }

  private scheduleProductItemStatsMaintenance(epoch: number) {
    const warehouseId = this.homeWarehouseId
    void (async () => {
      await this.homeWarehouseConfiguration
      if (!this.isActiveSession(epoch)) return
      await productItemStatsRepository.cleanupExpired()
      if (warehouseId !== null && this.isActiveSession(epoch)) {
        await productItemStatsRepository.ensureForWarehouse(warehouseId, {
          pinned: true,
          force: true,
        })
      }
    })().catch((error) => this.logError('[product-item-stats:prefetch]', error))
  }
}

export const localSyncService = new LocalSyncService()
