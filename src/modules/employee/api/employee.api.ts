import { apiClient } from '@/core/api/client'
import type { CreateEmployeeDto, Employee, UpdateEmployeeDto } from '@meerkapp/wms-contracts'

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  pages: number
}

export const employeeApi = {
  getAll: (page = 1, limit = 20) =>
    apiClient<PaginatedResponse<Employee>>(`/employee?page=${page}&limit=${limit}`),

  getOne: (id: Employee['id']) => apiClient<Employee>(`/employee/${id}`),

  create: (dto: CreateEmployeeDto) =>
    apiClient<Employee>('/employee', { method: 'POST', body: dto }),

  update: (id: Employee['id'], dto: UpdateEmployeeDto) =>
    apiClient<Employee>(`/employee/${id}`, { method: 'PATCH', body: dto }),

  assignRole: (employeeId: Employee['id'], roleId: number) =>
    apiClient(`/employee/${employeeId}/roles/${roleId}`, { method: 'POST' }),

  removeRole: (employeeId: Employee['id'], roleId: number) =>
    apiClient(`/employee/${employeeId}/roles/${roleId}`, { method: 'DELETE' }),
}
