import { apiClient } from '@/core/api/client'
import type { CreateOrganizationDto, UpdateOrganizationDto, Organization, OrganizationStats } from '@meerkapp/wms-contracts'

export const organizationApi = {
  create: (dto: CreateOrganizationDto) =>
    apiClient<Organization>('/organization', { method: 'POST', body: dto }),

  update: (id: number, dto: UpdateOrganizationDto) =>
    apiClient<Organization>(`/organization/${id}`, { method: 'PATCH', body: dto }),

  stats: (id: number) =>
    apiClient<OrganizationStats>(`/organization/${id}/stats`),
}
