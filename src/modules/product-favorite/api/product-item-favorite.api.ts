import type { Paginated, ProductItem, ProductItemFavorite } from '@meerkapp/wms-contracts'
import { apiClient } from '@/core/api/client'

const FAVORITES_PAGE_SIZE = 100
const MAX_FAVORITES_PAGES = 10_000

function listFavoritePage(page: number, accountId: string) {
  return apiClient<Paginated<ProductItemFavorite>>('/product-item/favorites', {
    params: { page, limit: FAVORITES_PAGE_SIZE },
    authAccountId: accountId,
  })
}

export const productItemFavoriteApi = {
  list: listFavoritePage,

  async listAll(accountId: string): Promise<ProductItemFavorite[]> {
    const favorites: ProductItemFavorite[] = []

    for (let page = 1; page <= MAX_FAVORITES_PAGES; page += 1) {
      const response = await listFavoritePage(page, accountId)
      favorites.push(...response.items)
      if (page >= response.pages) return favorites
    }

    throw new Error(`Favorites sync exceeded ${MAX_FAVORITES_PAGES} pages`)
  },

  add(productItemId: ProductItem['id'], accountId: string) {
    return apiClient<ProductItemFavorite>(`/product-item/${productItemId}/favorite`, {
      method: 'PUT',
      authAccountId: accountId,
    })
  },

  remove(productItemId: ProductItem['id'], accountId: string) {
    return apiClient<void>(`/product-item/${productItemId}/favorite`, {
      method: 'DELETE',
      authAccountId: accountId,
    })
  },
}
