import { apiClient } from '@/core/api/client'
import type {
  CreatePriceListDto,
  PriceList,
  PriceListSummary,
  ProductPrice,
  SetDirectPriceListAssignmentDto,
  UpdatePriceListDto,
  UpdatePriceListPricesDto,
} from '@meerkapp/wms-contracts'

export const priceListApi = {
  getAll: () => apiClient<PriceListSummary[]>('/price-list'),

  create: (dto: CreatePriceListDto) =>
    apiClient<PriceList>('/price-list', { method: 'POST', body: dto }),

  update: (id: number, dto: UpdatePriceListDto) =>
    apiClient<PriceList>(`/price-list/${id}`, { method: 'PATCH', body: dto }),

  getWarehouseAssignment: (warehouseId: number) =>
    apiClient<SetDirectPriceListAssignmentDto>(`/price-list/assignments/warehouse/${warehouseId}`),

  setWarehouseAssignment: (warehouseId: number, dto: SetDirectPriceListAssignmentDto) =>
    apiClient<SetDirectPriceListAssignmentDto>(`/price-list/assignments/warehouse/${warehouseId}`, {
      method: 'PUT',
      body: dto,
    }),

  getOrganizationAssignment: (organizationId: number) =>
    apiClient<SetDirectPriceListAssignmentDto>(
      `/price-list/assignments/organization/${organizationId}`,
    ),

  setOrganizationAssignment: (organizationId: number, dto: SetDirectPriceListAssignmentDto) =>
    apiClient<SetDirectPriceListAssignmentDto>(
      `/price-list/assignments/organization/${organizationId}`,
      { method: 'PUT', body: dto },
    ),

  getPrices: (id: number) => apiClient<ProductPrice[]>(`/price-list/${id}/prices`),

  updatePrices: (id: number, dto: UpdatePriceListPricesDto) =>
    apiClient<ProductPrice[]>(`/price-list/${id}/prices`, { method: 'PUT', body: dto }),
}
