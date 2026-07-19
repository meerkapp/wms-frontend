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
    expect(await db.organizations.get(1)).toBeDefined()
    expect(await db.syncState.get('organizations')).toMatchObject({ cursor: 'cursor-1' })
  })

  it('configures an offline account without starting transport or resetting shared state', async () => {
    const service = new LocalSyncService()
    await db.syncState.put({ id: 'organizations', cursor: 'cursor-1', status: 'idle' })

    await service.activateOfflineAccount({ accountId: 'account-a', homeWarehouseId: 10 })

    expect(transport.configureAccount).toHaveBeenCalledWith('account-a', 10)
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
