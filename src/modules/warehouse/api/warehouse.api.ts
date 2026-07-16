import { apiClient } from '@/core/api/client'
import type {
  CreateWarehouseDto,
  SetDirectPriceListAssignmentDto,
  UpdateWarehouseDto,
  Warehouse,
} from '@meerkapp/wms-contracts'

type CreateWarehouseWithPriceListAssignmentDto = CreateWarehouseDto &
  SetDirectPriceListAssignmentDto
type UpdateWarehouseWithPriceListAssignmentDto = UpdateWarehouseDto &
  SetDirectPriceListAssignmentDto

export const warehouseApi = {
  create: (dto: CreateWarehouseDto) =>
    apiClient<Warehouse>('/warehouse', { method: 'POST', body: dto }),

  createWithPriceListAssignment: (dto: CreateWarehouseWithPriceListAssignmentDto) =>
    apiClient<Warehouse>('/warehouse/with-price-list-assignment', {
      method: 'POST',
      body: dto,
    }),

  update: (id: number, dto: UpdateWarehouseDto) =>
    apiClient<Warehouse>(`/warehouse/${id}`, { method: 'PATCH', body: dto }),

  updateWithPriceListAssignment: (id: number, dto: UpdateWarehouseWithPriceListAssignmentDto) =>
    apiClient<Warehouse>(`/warehouse/${id}/with-price-list-assignment`, {
      method: 'PATCH',
      body: dto,
    }),
}
