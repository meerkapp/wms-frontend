import { apiClient } from '@/core/api/client'
import type { ProductType, CreateProductTypeDto, UpdateProductTypeDto } from '@meerkapp/wms-contracts'

export const productTypeApi = {
  create: (dto: CreateProductTypeDto) =>
    apiClient<ProductType>('/product-type', { method: 'POST', body: dto }),

  update: (id: number, dto: UpdateProductTypeDto) =>
    apiClient<ProductType>(`/product-type/${id}`, { method: 'PATCH', body: dto }),
}
