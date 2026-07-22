import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db, WMS_LOCAL_DB_NAME } from '../db/db'
import { productReadModelRepository } from './product-read-model.repository'

beforeEach(async () => {
  db.close()
  await Dexie.delete(WMS_LOCAL_DB_NAME)
  await db.open()
})

afterEach(async () => {
  db.close()
  await Dexie.delete(WMS_LOCAL_DB_NAME)
})

describe('productReadModelRepository', () => {
  it('removes an archived product graph while preserving other products and account metadata', async () => {
    const product = (id: number) => ({
      id,
      sku: `SKU-${id}`,
      name: `Product ${id}`,
      productCollectionId: 1,
      productTypeId: 1,
      productBrandId: null,
      productMeasureId: 1,
      countryId: null,
      characteristics: {},
      writeoffStrategy: null,
      isPublic: true,
      archivedAt: null,
      archivedByEmployeeId: null,
      updatedAt: '2026-07-23T00:00:00.000Z',
      productBrand: null,
      productMeasure: null,
    })
    await db.productItems.bulkPut([product(1), product(2)])
    await db.productBarcodes.bulkPut([
      { id: 1, code: 'BARCODE-1', type: 'FACTORY', productItemId: 1, updatedAt: '2026-07-23' },
      { id: 2, code: 'BARCODE-2', type: 'FACTORY', productItemId: 2, updatedAt: '2026-07-23' },
    ])
    await db.productPackages.bulkPut([
      {
        id: 1,
        name: null,
        isBase: true,
        productItemId: 1,
        conversionFactor: '1',
        updatedAt: '2026-07-23',
      },
      {
        id: 2,
        name: null,
        isBase: true,
        productItemId: 2,
        conversionFactor: '1',
        updatedAt: '2026-07-23',
      },
    ])
    await db.productShipments.bulkPut([
      {
        id: 1,
        warehouseId: 1,
        productItemId: 1,
        arrivalDate: '2026-07-23',
        expiryDate: null,
        quantity: 0,
        priceAmount: 0n,
        currency: 'RUB',
        updatedAt: '2026-07-23',
      },
      {
        id: 2,
        warehouseId: 1,
        productItemId: 2,
        arrivalDate: '2026-07-23',
        expiryDate: null,
        quantity: 0,
        priceAmount: 0n,
        currency: 'RUB',
        updatedAt: '2026-07-23',
      },
    ])
    await db.productItemStats.bulkPut([
      {
        id: 1,
        productItemId: 1,
        warehouseId: 1,
        quantity: '0',
        retailPrice: null,
        currency: null,
        updatedAt: '2026-07-23',
      },
      {
        id: 2,
        productItemId: 2,
        warehouseId: 1,
        quantity: '0',
        retailPrice: null,
        currency: null,
        updatedAt: '2026-07-23',
      },
    ])
    await db.productItemFavorites.put({
      accountId: 'account-a',
      productItemId: 1,
      createdAt: '2026-07-23',
    })

    await productReadModelRepository.removeProductItems([1])

    expect(await db.productItems.toCollection().primaryKeys()).toEqual([2])
    expect(await db.productBarcodes.toCollection().primaryKeys()).toEqual([2])
    expect(await db.productPackages.toCollection().primaryKeys()).toEqual([2])
    expect(await db.productShipments.toCollection().primaryKeys()).toEqual([2])
    expect(await db.productItemStats.toCollection().primaryKeys()).toEqual([2])
    expect(await db.productItemFavorites.get(['account-a', 1])).toBeDefined()
  })
})
