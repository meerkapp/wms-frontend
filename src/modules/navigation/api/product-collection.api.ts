import { apiClient } from '@/core/api/client'
import type {
  ProductCollection,
  CreateProductCollectionDto,
  UpdateProductCollectionDto,
} from '@meerkapp/wms-contracts'

export const productCollectionApi = {
  create: (dto: CreateProductCollectionDto) =>
    apiClient<ProductCollection>('/product-collection', { method: 'POST', body: dto }),

  update: (id: number, dto: UpdateProductCollectionDto) =>
    apiClient<ProductCollection>(`/product-collection/${id}`, { method: 'PATCH', body: dto }),

  pin: (id: number) =>
    apiClient<ProductCollection>(`/product-collection/${id}/pin`, { method: 'POST' }),

  unpin: (id: number) =>
    apiClient<ProductCollection>(`/product-collection/${id}/pin`, { method: 'DELETE' }),

  moveUp: (id: number) =>
    apiClient<ProductCollection>(`/product-collection/${id}/move-up`, { method: 'PATCH' }),

  moveDown: (id: number) =>
    apiClient<ProductCollection>(`/product-collection/${id}/move-down`, { method: 'PATCH' }),
}
