import { apiClient } from '@/core/api/client'
import type {
  CreateOrganizationDto,
  Organization,
  OrganizationStats,
  SetDirectPriceListAssignmentDto,
  UpdateOrganizationDto,
} from '@meerkapp/wms-contracts'

type CreateOrganizationWithPriceListAssignmentDto = CreateOrganizationDto &
  SetDirectPriceListAssignmentDto
type UpdateOrganizationWithPriceListAssignmentDto = UpdateOrganizationDto &
  SetDirectPriceListAssignmentDto

export const organizationApi = {
  create: (dto: CreateOrganizationDto) =>
    apiClient<Organization>('/organization', { method: 'POST', body: dto }),

  createWithPriceListAssignment: (dto: CreateOrganizationWithPriceListAssignmentDto) =>
    apiClient<Organization>('/organization/with-price-list-assignment', {
      method: 'POST',
      body: dto,
    }),

  update: (id: number, dto: UpdateOrganizationDto) =>
    apiClient<Organization>(`/organization/${id}`, { method: 'PATCH', body: dto }),

  updateWithPriceListAssignment: (id: number, dto: UpdateOrganizationWithPriceListAssignmentDto) =>
    apiClient<Organization>(`/organization/${id}/with-price-list-assignment`, {
      method: 'PATCH',
      body: dto,
    }),

  stats: (id: number) => apiClient<OrganizationStats>(`/organization/${id}/stats`),
}
