import { apiClient } from '@/core/api/client'
import type { Warehouse, CreateWarehouseDto, UpdateWarehouseDto } from '@meerkapp/wms-contracts'

export const warehouseApi = {
  create: (dto: CreateWarehouseDto) =>
    apiClient<Warehouse>('/warehouse', { method: 'POST', body: dto }),

  update: (id: number, dto: UpdateWarehouseDto) =>
    apiClient<Warehouse>(`/warehouse/${id}`, { method: 'PATCH', body: dto }),
}
