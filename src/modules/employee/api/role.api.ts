import { apiClient } from '@/core/api/client'
import type { Role } from '@meerkapp/wms-contracts'

export const roleApi = {
  getAll: () => apiClient<Role[]>('/role'),
}
