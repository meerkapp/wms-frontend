import { db } from '../db/db'
import type { ProductItemFavoriteChange } from '@meerkapp/wms-contracts'
import type { BoundedProductItemList } from './product.repository'
import { PRODUCT_TABLE_LIMIT } from '@/modules/product-table/product-table.constants'
import type { LocalProductItemFavorite } from '../types/entities.types'

type SessionAssertion = () => void

const noSessionAssertion: SessionAssertion = () => undefined

export const productItemFavoriteRepository = {
  listByAccount: (accountId: string) =>
    db.productItemFavorites.where('accountId').equals(accountId).sortBy('productItemId'),

  async listProductItems(accountId: string): Promise<BoundedProductItemList> {
    return db.transaction('r', db.productItemFavorites, db.productItems, async () => {
      const favorites = await db.productItemFavorites.where('accountId').equals(accountId).toArray()
      const productItemIds = new Set(favorites.map((favorite) => favorite.productItemId))
      if (productItemIds.size === 0) return { items: [], truncated: false }

      const items = await db.productItems
        .orderBy('sku')
        .filter((item) => productItemIds.has(item.id))
        .limit(PRODUCT_TABLE_LIMIT + 1)
        .toArray()

      return {
        items: items.slice(0, PRODUCT_TABLE_LIMIT),
        truncated: items.length > PRODUCT_TABLE_LIMIT,
      }
    })
  },

  replaceAccountSnapshot(
    accountId: string,
    favorites: Array<Omit<LocalProductItemFavorite, 'accountId'>>,
    assertSession: SessionAssertion = noSessionAssertion,
  ) {
    return db.transaction('rw', db.productItemFavorites, async () => {
      assertSession()
      await db.productItemFavorites.where('accountId').equals(accountId).delete()
      assertSession()
      if (favorites.length > 0) {
        await db.productItemFavorites.bulkPut(
          favorites.map((favorite) => ({ accountId, ...favorite })),
        )
      }
      assertSession()
    })
  },

  applyServerChange(
    accountId: string,
    change: ProductItemFavoriteChange,
    assertSession: SessionAssertion = noSessionAssertion,
  ) {
    return db.transaction('rw', db.productItemFavorites, async () => {
      assertSession()
      if (change.isFavorite) {
        if (change.createdAt === null) throw new Error('Favorite creation date is required')
        await db.productItemFavorites.put({
          accountId,
          productItemId: change.productItemId,
          createdAt: change.createdAt,
        })
      } else {
        await db.productItemFavorites.delete([accountId, change.productItemId])
      }
      assertSession()
    })
  },

  removeAccount: (accountId: string) =>
    db.productItemFavorites.where('accountId').equals(accountId).delete(),
}
