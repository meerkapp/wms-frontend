import type {
  ProductItem,
  ProductItemArchivePage,
  ProductItemWithRelations,
} from '@meerkapp/wms-contracts'
import { apiClient } from '@/core/api/client'
import { PRODUCT_TABLE_LIMIT } from '@/modules/product-table/product-table.constants'

const ARCHIVE_PAGE_SIZE = 100

function listPage(page: number, accountId: string) {
  return apiClient<ProductItemArchivePage>('/product-item/archive', {
    params: { page, limit: ARCHIVE_PAGE_SIZE },
    authAccountId: accountId,
  })
}

export const productItemArchiveApi = {
  async listBounded(accountId: string) {
    const firstPage = await listPage(1, accountId)
    const items = [...firstPage.items]
    const requiredItems = Math.min(firstPage.total, PRODUCT_TABLE_LIMIT)
    const lastPage = Math.min(
      firstPage.pages,
      Math.ceil(requiredItems / ARCHIVE_PAGE_SIZE),
    )

    for (let page = 2; items.length < requiredItems && page <= lastPage; page += 1) {
      const response = await listPage(page, accountId)
      items.push(...response.items)
    }

    return {
      items: items.slice(0, PRODUCT_TABLE_LIMIT),
      truncated: firstPage.total > PRODUCT_TABLE_LIMIT,
    }
  },

  archive(productItemId: ProductItem['id'], accountId: string) {
    return apiClient<ProductItemWithRelations>(`/product-item/${productItemId}/archive`, {
      method: 'PUT',
      authAccountId: accountId,
    })
  },

  restore(productItemId: ProductItem['id'], accountId: string) {
    return apiClient<ProductItemWithRelations>(`/product-item/${productItemId}/archive`, {
      method: 'DELETE',
      authAccountId: accountId,
    })
  },

  findByBarcode(code: string, accountId: string) {
    return apiClient<ProductItemWithRelations>('/product-item/barcode', {
      params: { code },
      authAccountId: accountId,
    })
  },
}
