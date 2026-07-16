import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'
import { WmsLocalDb, WMS_LOCAL_DB_SCHEMAS } from './db'

const databaseNames = new Set<string>()

function databaseName(label: string) {
  const name = `wms-local-db-${label}-${crypto.randomUUID()}`
  databaseNames.add(name)
  return name
}

function createLegacyDatabase(name: string, version: 1 | 2) {
  const legacy = new Dexie(name)
  legacy.version(1).stores(WMS_LOCAL_DB_SCHEMAS[1])
  if (version >= 2) legacy.version(2).stores(WMS_LOCAL_DB_SCHEMAS[2])
  return legacy
}

afterEach(async () => {
  await Promise.all([...databaseNames].map((name) => Dexie.delete(name)))
  databaseNames.clear()
})

describe('WmsLocalDb migrations', () => {
  it('opens a new database at the current schema version', async () => {
    const current = new WmsLocalDb(databaseName('fresh'))

    await current.open()

    expect(current.verno).toBe(4)
    expect(current.tables.map((table) => table.name)).toEqual(
      expect.arrayContaining([
        'productItems',
        'productItemStats',
        'productItemStatsCache',
        'syncState',
      ]),
    )
    expect(current.productItemStatsCache.schema.primKey.keyPath).toEqual([
      'accountId',
      'warehouseId',
    ])
    current.close()
  })

  it('upgrades a version 1 database without losing shared read-model state', async () => {
    const name = databaseName('v1')
    const legacy = createLegacyDatabase(name, 1)
    await legacy.open()
    await legacy.table('organizations').put({
      id: 17,
      name: 'North Hub',
      updatedAt: '2026-01-01T00:00:00.000Z',
    })
    await legacy.table('syncState').put({
      id: 'organizations',
      cursor: 'cursor-17',
      status: 'idle',
    })
    legacy.close()

    const current = new WmsLocalDb(name)
    await current.open()

    expect(await current.organizations.get(17)).toMatchObject({ name: 'North Hub' })
    expect(await current.syncState.get('organizations')).toMatchObject({ cursor: 'cursor-17' })
    expect(current.productItemStatsCache.schema.primKey.keyPath).toEqual([
      'accountId',
      'warehouseId',
    ])
    current.close()
  })

  it('keeps version 2 stats while replacing unattributed cache scopes', async () => {
    const name = databaseName('v2')
    const legacy = createLegacyDatabase(name, 2)
    await legacy.open()
    await legacy.table('productItemStats').put({
      id: 31,
      productItemId: 7,
      warehouseId: 5,
      quantity: '12',
      retailPrice: null,
      updatedAt: '2026-01-01T00:00:00.000Z',
    })
    await legacy.table('productItemStatsCache').put({
      warehouseId: 5,
      pinned: true,
      loadedAt: 1,
      accessedAt: 1,
      expiresAt: null,
    })
    legacy.close()

    const current = new WmsLocalDb(name)
    await current.open()

    expect(await current.productItemStats.get(31)).toMatchObject({
      productItemId: 7,
      warehouseId: 5,
      quantity: '12',
    })
    expect(await current.productItemStatsCache.count()).toBe(0)

    await current.productItemStatsCache.put({
      accountId: 'account-a',
      warehouseId: 5,
      pinned: true,
      loadedAt: 2,
      accessedAt: 2,
      expiresAt: null,
    })
    expect(await current.productItemStatsCache.get(['account-a', 5])).toMatchObject({
      accountId: 'account-a',
      warehouseId: 5,
    })
    current.close()
  })
})
