import { apiClient } from '@/core/api/client'
import type { LocalEntity } from '../types/entities.types'
import type { LocalProductItemStats } from '../types/entities.types'
import type { SyncCursor, SyncPullResponse } from '../types/sync.types'

interface TypedFetchResponse<T> {
  items: T[]
  cursor: SyncCursor
  hasMore: boolean
}

export const syncApi = {
  pull<T extends LocalEntity>(tableName: string, cursor: SyncCursor, limit: number) {
    return apiClient<SyncPullResponse<T>>('/sync/pull', {
      params: {
        table: tableName,
        ...(cursor === null ? {} : { since: cursor }),
        limit,
      },
    })
  },

  fetchProductItems<T>(params: { id: number } | { productCollectionId: number | null }) {
    return apiClient<TypedFetchResponse<T>>('/sync/fetch/product-items', {
      params: {
        ...params,
        ...('productCollectionId' in params && params.productCollectionId === null
          ? { productCollectionId: 'null' }
          : {}),
      },
    })
  },

  fetchProductBarcodes<T>(code: string) {
    return apiClient<TypedFetchResponse<T>>('/sync/fetch/product-barcodes', {
      params: { code },
    })
  },

  fetchProductItemStats(params: {
    warehouseId: number
    productCollectionId?: number
    cursor?: string
    limit?: number
  }) {
    return apiClient<TypedFetchResponse<LocalProductItemStats>>('/sync/fetch/product-item-stats', {
      params,
    })
  },
}
