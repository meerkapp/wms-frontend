import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db, WMS_LOCAL_DB_NAME } from '../db/db'
import type { LocalProductItemStats } from '../types/entities.types'

const fetchProductItemStats = vi.hoisted(() => vi.fn())

vi.mock('../api/sync.api', () => ({
  syncApi: { fetchProductItemStats },
}))

import {
  FOREIGN_WAREHOUSE_STATS_TTL_MS,
  productItemStatsRepository,
} from './product-item-stats.repository'

function stat(id: number, warehouseId: number): LocalProductItemStats {
  return {
    id,
    warehouseId,
    productItemId: id,
    quantity: '1',
    retailPrice: null,
    currency: null,
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

function response(items: LocalProductItemStats[]) {
  return { items, cursor: null, hasMore: false }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

beforeEach(async () => {
  productItemStatsRepository.deactivateAccount()
  db.close()
  await Dexie.delete(WMS_LOCAL_DB_NAME)
  await db.open()
  fetchProductItemStats.mockReset()
})

afterEach(async () => {
  productItemStatsRepository.deactivateAccount()
  db.close()
  await Dexie.delete(WMS_LOCAL_DB_NAME)
})

describe('productItemStatsRepository account scopes', () => {
  it('stores home and foreign warehouse scopes per account', async () => {
    fetchProductItemStats
      .mockResolvedValueOnce(response([stat(1, 10)]))
      .mockResolvedValueOnce(response([stat(2, 20)]))
      .mockResolvedValueOnce(response([stat(2, 20)]))

    await productItemStatsRepository.configureAccount('account-a', 10)
    await productItemStatsRepository.ensureForWarehouse(10)
    await productItemStatsRepository.ensureForWarehouse(20)

    await productItemStatsRepository.configureAccount('account-b', 20)
    await productItemStatsRepository.ensureForWarehouse(20)

    expect(await db.productItemStatsCache.get(['account-a', 10])).toMatchObject({
      pinned: true,
      expiresAt: null,
    })
    expect(await db.productItemStatsCache.get(['account-a', 20])).toMatchObject({
      pinned: false,
    })
    expect(await db.productItemStatsCache.get(['account-b', 20])).toMatchObject({
      pinned: true,
      expiresAt: null,
    })
    expect(fetchProductItemStats).toHaveBeenCalledTimes(3)
  })

  it('keeps shared stats while another account still has a required scope', async () => {
    const now = Date.now()
    await db.productItemStats.put(stat(1, 10))
    await db.productItemStatsCache.bulkPut([
      {
        accountId: 'account-a',
        warehouseId: 10,
        pinned: false,
        loadedAt: now - FOREIGN_WAREHOUSE_STATS_TTL_MS,
        accessedAt: now - FOREIGN_WAREHOUSE_STATS_TTL_MS,
        expiresAt: now - 1,
      },
      {
        accountId: 'account-b',
        warehouseId: 10,
        pinned: true,
        loadedAt: now,
        accessedAt: now,
        expiresAt: null,
      },
    ])

    const deletedWarehouseIds = await productItemStatsRepository.cleanupExpired(true)

    expect(deletedWarehouseIds).toEqual([])
    expect(await db.productItemStatsCache.get(['account-a', 10])).toBeUndefined()
    expect(await db.productItemStatsCache.get(['account-b', 10])).toBeDefined()
    expect(await db.productItemStats.get(1)).toBeDefined()
  })

  it('does not leave rows behind when an account is removed during its first fetch', async () => {
    const request = deferred<ReturnType<typeof response>>()
    fetchProductItemStats.mockReturnValueOnce(request.promise)
    await productItemStatsRepository.configureAccount('account-a', 10)

    const ensure = productItemStatsRepository.ensureForWarehouse(10)
    await vi.waitFor(() => expect(fetchProductItemStats).toHaveBeenCalledOnce())
    const remove = productItemStatsRepository.removeAccountScopes('account-a')

    request.resolve(response([stat(1, 10)]))
    await Promise.all([ensure, remove])

    expect(await db.productItemStatsCache.count()).toBe(0)
    expect(await db.productItemStats.count()).toBe(0)
  })

  it('preserves a shared pending fetch needed by another account', async () => {
    const request = deferred<ReturnType<typeof response>>()
    fetchProductItemStats.mockReturnValueOnce(request.promise)
    await productItemStatsRepository.configureAccount('account-a', 10)

    const accountAEnsure = productItemStatsRepository.ensureForWarehouse(10)
    await vi.waitFor(() => expect(fetchProductItemStats).toHaveBeenCalledOnce())

    await productItemStatsRepository.configureAccount('account-b', 10)
    const accountBEnsure = productItemStatsRepository.ensureForWarehouse(10)
    const removeAccountA = productItemStatsRepository.removeAccountScopes('account-a')

    request.resolve(response([stat(1, 10)]))
    await Promise.all([accountAEnsure, accountBEnsure, removeAccountA])

    expect(await db.productItemStatsCache.get(['account-a', 10])).toBeUndefined()
    expect(await db.productItemStatsCache.get(['account-b', 10])).toMatchObject({ pinned: true })
    expect(await db.productItemStats.get(1)).toBeDefined()
    expect(fetchProductItemStats).toHaveBeenCalledOnce()
  })
})
