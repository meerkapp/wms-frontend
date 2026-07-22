import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db, WMS_LOCAL_DB_NAME } from '../db/db'
import type { LocalProductItem } from '../types/entities.types'
import { productItemFavoriteRepository } from './product-item-favorite.repository'

function product(id: number, sku: string): LocalProductItem {
  return {
    id,
    sku,
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
    updatedAt: '2026-07-22T00:00:00.000Z',
    productBrand: null,
    productMeasure: null,
  }
}

beforeEach(async () => {
  db.close()
  await Dexie.delete(WMS_LOCAL_DB_NAME)
  await db.open()
  await db.productItems.bulkPut([product(1, 'SKU-002'), product(2, 'SKU-001')])
})

afterEach(async () => {
  db.close()
  await Dexie.delete(WMS_LOCAL_DB_NAME)
})

describe('productItemFavoriteRepository', () => {
  it('replaces one account snapshot without touching another account', async () => {
    await productItemFavoriteRepository.replaceAccountSnapshot('account-a', [
      { productItemId: 1, createdAt: '2026-07-22T00:00:00.000Z' },
    ])
    await productItemFavoriteRepository.replaceAccountSnapshot('account-b', [
      { productItemId: 2, createdAt: '2026-07-22T00:00:01.000Z' },
    ])

    await productItemFavoriteRepository.replaceAccountSnapshot('account-a', [
      { productItemId: 2, createdAt: '2026-07-22T00:00:02.000Z' },
    ])

    expect(await productItemFavoriteRepository.listByAccount('account-a')).toEqual([
      expect.objectContaining({ accountId: 'account-a', productItemId: 2 }),
    ])
    expect(await productItemFavoriteRepository.listByAccount('account-b')).toEqual([
      expect.objectContaining({ accountId: 'account-b', productItemId: 2 }),
    ])
  })

  it('returns favorite products in SKU order from the shared read model', async () => {
    await productItemFavoriteRepository.replaceAccountSnapshot('account-a', [
      { productItemId: 1, createdAt: '2026-07-22T00:00:00.000Z' },
      { productItemId: 2, createdAt: '2026-07-22T00:00:01.000Z' },
    ])

    const result = await productItemFavoriteRepository.listProductItems('account-a')

    expect(result.truncated).toBe(false)
    expect(result.items.map(({ id }) => id)).toEqual([2, 1])
  })

  it('applies server changes only inside the supplied account scope', async () => {
    await productItemFavoriteRepository.applyServerChange('account-a', {
      productItemId: 1,
      isFavorite: true,
      createdAt: '2026-07-22T00:00:00.000Z',
    })
    await productItemFavoriteRepository.applyServerChange('account-b', {
      productItemId: 1,
      isFavorite: true,
      createdAt: '2026-07-22T00:00:00.000Z',
    })
    await productItemFavoriteRepository.applyServerChange('account-a', {
      productItemId: 1,
      isFavorite: false,
      createdAt: null,
    })

    expect(await productItemFavoriteRepository.listByAccount('account-a')).toEqual([])
    expect(await productItemFavoriteRepository.listByAccount('account-b')).toHaveLength(1)
  })
})
