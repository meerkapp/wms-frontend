import { apiClient } from '@/core/api/client'
import type { Locality, CreateLocalityDto } from '@meerkapp/wms-contracts'

export const localityApi = {
  create: (dto: CreateLocalityDto) =>
    apiClient<Locality>('/locality', { method: 'POST', body: dto }),
}
