import { apiClient } from '@/core/api/client'
import type { Role, CreateRoleDto, UpdateRoleDto } from '@meerkapp/wms-contracts'

export const roleApi = {
  getAll: () => apiClient<Role[]>('/role'),
  getAllPermissions: () => apiClient<{ id: number; name: string }[]>('/role/permissions'),
  create: (dto: CreateRoleDto) => apiClient<Role>('/role', { method: 'POST', body: dto }),
  update: (id: number, dto: UpdateRoleDto) => apiClient<Role>(`/role/${id}`, { method: 'PATCH', body: dto }),
}
