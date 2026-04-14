import { apiClient } from '@/core/api/client'
import type { CreateEmployeeDto, Employee, UpdateEmployeeDto, UpdateOwnPasswordDto, UpdateOwnProfileDto } from '@meerkapp/wms-contracts'

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

  updateMe: (dto: UpdateOwnProfileDto) =>
    apiClient<Employee>('/employee/me', { method: 'PATCH', body: dto }),

  updateMePassword: (dto: UpdateOwnPasswordDto) =>
    apiClient<Employee>('/employee/me/password', { method: 'PATCH', body: dto }),

  uploadAvatar: (id: string, file: File) => {
    const body = new FormData()
    body.append('file', file)
    return apiClient<{ avatarUrl: string }>(`/employee/${id}/avatar`, { method: 'POST', body })
  },

  uploadOwnAvatar: (file: File) => {
    const body = new FormData()
    body.append('file', file)
    return apiClient<{ avatarUrl: string }>('/employee/me/avatar', { method: 'POST', body })
  },

  deleteAvatar: (id: string) =>
    apiClient<{ avatarUrl: null }>(`/employee/${id}/avatar`, { method: 'DELETE' }),

  deleteOwnAvatar: () =>
    apiClient<{ avatarUrl: null }>('/employee/me/avatar', { method: 'DELETE' }),
}
