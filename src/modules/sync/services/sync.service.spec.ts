import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db, WMS_LOCAL_DB_NAME } from '../db/db'
import type { LocalProductItemStats } from '../types/entities.types'

const transport = vi.hoisted(() => ({
  socket: {
    connected: false,
    on: vi.fn(),
    off: vi.fn(),
  },
  connectSocket: vi.fn(),
  disconnectSocket: vi.fn(),
  pull: vi.fn(),
  configureAccount: vi.fn(),
  deactivateAccount: vi.fn(),
  cleanupExpired: vi.fn(),
  ensureForWarehouse: vi.fn(),
  removeAccountScopes: vi.fn(),
  listAllFavorites: vi.fn(),
  replaceFavoriteSnapshot: vi.fn(),
  applyFavoriteChange: vi.fn(),
  removeAccountFavorites: vi.fn(),
  hasPendingFetch: vi.fn(),
  waitForPendingFetch: vi.fn(),
  waitForPendingFetches: vi.fn(),
  shouldApplySocketUpdate: vi.fn(),
}))

vi.mock('@/core/api/socket', () => ({
  socket: transport.socket,
  connectSocket: transport.connectSocket,
  disconnectSocket: transport.disconnectSocket,
}))

vi.mock('../api/sync.api', () => ({
  syncApi: {
    pull: transport.pull,
  },
}))

vi.mock('@/modules/product-favorite/api/product-item-favorite.api', () => ({
  productItemFavoriteApi: {
    listAll: transport.listAllFavorites,
  },
}))

vi.mock('../repositories/product-item-favorite.repository', () => ({
  productItemFavoriteRepository: {
    replaceAccountSnapshot: transport.replaceFavoriteSnapshot,
    applyServerChange: transport.applyFavoriteChange,
    removeAccount: transport.removeAccountFavorites,
  },
}))

vi.mock('../repositories/product-item-stats.repository', () => ({
  productItemStatsRepository: {
    configureAccount: transport.configureAccount,
    deactivateAccount: transport.deactivateAccount,
    cleanupExpired: transport.cleanupExpired,
    ensureForWarehouse: transport.ensureForWarehouse,
    removeAccountScopes: transport.removeAccountScopes,
    hasPendingFetch: transport.hasPendingFetch,
    waitForPendingFetch: transport.waitForPendingFetch,
    waitForPendingFetches: transport.waitForPendingFetches,
    shouldApplySocketUpdate: transport.shouldApplySocketUpdate,
  },
}))

import { LocalSyncService } from './sync.service'

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

beforeEach(async () => {
  db.close()
  await Dexie.delete(WMS_LOCAL_DB_NAME)
  await db.open()

  vi.clearAllMocks()
  transport.socket.connected = false
  transport.configureAccount.mockResolvedValue(undefined)
  transport.cleanupExpired.mockResolvedValue([])
  transport.ensureForWarehouse.mockResolvedValue([])
  transport.removeAccountScopes.mockResolvedValue([])
  transport.listAllFavorites.mockResolvedValue([])
  transport.replaceFavoriteSnapshot.mockResolvedValue(undefined)
  transport.applyFavoriteChange.mockResolvedValue(undefined)
  transport.removeAccountFavorites.mockResolvedValue(undefined)
  transport.hasPendingFetch.mockReturnValue(false)
  transport.waitForPendingFetch.mockResolvedValue(undefined)
  transport.waitForPendingFetches.mockResolvedValue(undefined)
  transport.shouldApplySocketUpdate.mockResolvedValue(true)
  transport.pull.mockResolvedValue({ items: [], cursor: null, hasMore: false })
})

afterEach(async () => {
  db.close()
  await Dexie.delete(WMS_LOCAL_DB_NAME)
})

describe('LocalSyncService account lifecycle', () => {
  it('switches accounts without clearing shared rows or sync cursors', async () => {
    const service = new LocalSyncService()
    await db.organizations.put({
      id: 1,
      name: 'Shared organization',
      website: null,
      priceListAssignments: [],
      updatedAt: '2026-01-01T00:00:00.000Z',
    })
    await db.syncState.put({ id: 'organizations', cursor: 'cursor-1', status: 'idle' })

    service.start('token-a', { accountId: 'account-a', homeWarehouseId: 10 })
    service.start('token-b', { accountId: 'account-b', homeWarehouseId: 20 })
    await service.removeAccount('account-b')
    service.stop()

    expect(transport.configureAccount).toHaveBeenNthCalledWith(1, 'account-a', 10)
    expect(transport.configureAccount).toHaveBeenNthCalledWith(2, 'account-b', 20)
    expect(transport.removeAccountScopes).toHaveBeenCalledWith('account-b')
    expect(transport.removeAccountFavorites).toHaveBeenCalledWith('account-b')
    expect(await db.organizations.get(1)).toBeDefined()
    expect(await db.syncState.get('organizations')).toMatchObject({ cursor: 'cursor-1' })
  })

  it('configures an offline account without starting transport or resetting shared state', async () => {
    const service = new LocalSyncService()
    await db.syncState.put({ id: 'organizations', cursor: 'cursor-1', status: 'idle' })

    await service.activateOfflineAccount({ accountId: 'account-a', homeWarehouseId: 10 })

    expect(transport.configureAccount).toHaveBeenCalledWith('account-a', 10)
    expect(transport.listAllFavorites).not.toHaveBeenCalled()
    expect(transport.cleanupExpired).toHaveBeenCalledOnce()
    expect(transport.connectSocket).not.toHaveBeenCalled()
    expect(transport.socket.on).not.toHaveBeenCalled()
    expect(await db.syncState.get('organizations')).toMatchObject({ cursor: 'cursor-1' })
    service.stop()
  })

  it('full sync includes product items, excludes stats, and prefetches the account home warehouse', async () => {
    const service = new LocalSyncService()
    service.start('token-a', { accountId: 'account-a', homeWarehouseId: 10 })

    await service.initialSync()
    await vi.waitFor(() =>
      expect(transport.ensureForWarehouse).toHaveBeenCalledWith(10, {
        pinned: true,
        force: true,
      }),
    )

    const pulledTables = transport.pull.mock.calls.map(([tableName]) => tableName)
    expect(pulledTables).toContain('product_item')
    expect(pulledTables).not.toContain('product_item_stats')
    expect(transport.configureAccount).toHaveBeenCalledWith('account-a', 10)
    expect(transport.listAllFavorites).toHaveBeenCalledWith('account-a')
    expect(transport.replaceFavoriteSnapshot).toHaveBeenCalledWith(
      'account-a',
      [],
      expect.any(Function),
    )
    expect(await db.readModelMetadata.get('initialSyncCompletedAt')).toBeDefined()
    service.stop()
  })

  it('runs catch-up sync on both initial socket connect and reconnect', async () => {
    const service = new LocalSyncService()
    service.start('token-a', { accountId: 'account-a', homeWarehouseId: 10 })
    const connectRegistration = transport.socket.on.mock.calls.find(
      ([eventName]) => eventName === 'connect',
    )
    const onConnect = connectRegistration?.[1] as (() => void) | undefined
    if (!onConnect) throw new Error('Socket connect handler was not registered')

    onConnect()
    await vi.waitFor(() => {
      expect(service.state.status).toBe('done')
      expect(service.state.reason).toBe('connect')
    })
    const initialPullCount = transport.pull.mock.calls.length

    onConnect()
    await vi.waitFor(() => {
      expect(service.state.status).toBe('done')
      expect(service.state.reason).toBe('reconnect')
      expect(transport.pull.mock.calls.length).toBeGreaterThan(initialPullCount)
    })

    service.stop()
  })

  it('runs a socket catch-up after an in-flight initial sync completes', async () => {
    let resolveFavorites!: (value: []) => void
    transport.listAllFavorites.mockImplementationOnce(
      () =>
        new Promise<[]>((resolve) => {
          resolveFavorites = resolve
        }),
    )

    const service = new LocalSyncService()
    service.start('token-a', { accountId: 'account-a', homeWarehouseId: 10 })
    const pendingInitialSync = service.initialSync()
    await vi.waitFor(() => expect(transport.listAllFavorites).toHaveBeenCalledOnce())

    const connectRegistration = transport.socket.on.mock.calls.find(
      ([eventName]) => eventName === 'connect',
    )
    const onConnect = connectRegistration?.[1] as (() => void) | undefined
    if (!onConnect) throw new Error('Socket connect handler was not registered')
    onConnect()

    resolveFavorites([])
    await pendingInitialSync
    await vi.waitFor(() => {
      expect(transport.listAllFavorites).toHaveBeenCalledTimes(2)
      expect(service.state.status).toBe('done')
      expect(service.state.reason).toBe('connect')
    })

    service.stop()
  })

  it('does not apply a pending favorites snapshot after switching accounts', async () => {
    let resolveFavorites!: (value: []) => void
    transport.listAllFavorites.mockImplementationOnce(
      () =>
        new Promise<[]>((resolve) => {
          resolveFavorites = resolve
        }),
    )

    const service = new LocalSyncService()
    service.start('token-a', { accountId: 'account-a', homeWarehouseId: 10 })
    const pendingSync = service.initialSync()
    await vi.waitFor(() => expect(transport.listAllFavorites).toHaveBeenCalledWith('account-a'))

    service.start('token-b', { accountId: 'account-b', homeWarehouseId: 20 })
    resolveFavorites([])

    await expect(pendingSync).rejects.toMatchObject({ name: 'SyncSessionStoppedError' })
    expect(transport.replaceFavoriteSnapshot).not.toHaveBeenCalledWith(
      'account-a',
      expect.anything(),
      expect.any(Function),
    )
    service.stop()
  })

  it('applies account-scoped favorite socket changes for the active session', async () => {
    const service = new LocalSyncService()
    service.start('token-a', { accountId: 'account-a', homeWarehouseId: 10 })
    const favoriteRegistration = transport.socket.on.mock.calls.find(
      ([eventName]) => eventName === 'product-item-favorite:changed',
    )
    const onFavoriteChanged = favoriteRegistration?.[1] as ((payload: unknown) => void) | undefined
    if (!onFavoriteChanged) throw new Error('Favorite socket handler was not registered')

    onFavoriteChanged({
      productItemId: 7,
      isFavorite: true,
      createdAt: '2026-07-22T00:00:00.000Z',
    })

    await vi.waitFor(() =>
      expect(transport.applyFavoriteChange).toHaveBeenCalledWith(
        'account-a',
        {
          productItemId: 7,
          isFavorite: true,
          createdAt: '2026-07-22T00:00:00.000Z',
        },
        expect.any(Function),
      ),
    )
    service.stop()
  })

  it('applies socket changes after an in-flight favorites snapshot', async () => {
    let resolveFavorites!: (value: []) => void
    transport.listAllFavorites.mockImplementationOnce(
      () =>
        new Promise<[]>((resolve) => {
          resolveFavorites = resolve
        }),
    )

    const service = new LocalSyncService()
    service.start('token-a', { accountId: 'account-a', homeWarehouseId: 10 })
    const pendingSync = service.initialSync()
    await vi.waitFor(() => expect(transport.listAllFavorites).toHaveBeenCalledOnce())

    const favoriteRegistration = transport.socket.on.mock.calls.find(
      ([eventName]) => eventName === 'product-item-favorite:changed',
    )
    const onFavoriteChanged = favoriteRegistration?.[1] as ((payload: unknown) => void) | undefined
    if (!onFavoriteChanged) throw new Error('Favorite socket handler was not registered')
    onFavoriteChanged({
      productItemId: 7,
      isFavorite: true,
      createdAt: '2026-07-22T00:00:00.000Z',
    })

    expect(transport.applyFavoriteChange).not.toHaveBeenCalled()
    resolveFavorites([])
    await pendingSync
    await vi.waitFor(() => expect(transport.applyFavoriteChange).toHaveBeenCalledOnce())
    expect(transport.replaceFavoriteSnapshot.mock.invocationCallOrder[0]).toBeLessThan(
      transport.applyFavoriteChange.mock.invocationCallOrder[0]!,
    )
    service.stop()
  })

  it('applies product stats socket updates only for warehouses with an active scope', async () => {
    transport.shouldApplySocketUpdate.mockImplementation(async ({ warehouseId }) => {
      return warehouseId === 10
    })
    const service = new LocalSyncService()
    service.start('token-a', { accountId: 'account-a', homeWarehouseId: 10 })

    await service.handleSocketEvent('product_item_stats', {
      upserted: [stat(1, 10), stat(2, 20)],
    })

    expect(await db.productItemStats.toArray()).toEqual([stat(1, 10)])
    expect(await db.syncState.get('productItemStats')).toBeUndefined()
    service.stop()
  })
})
