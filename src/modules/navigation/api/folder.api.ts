import { apiClient } from '@/core/api/client'
import type { Folder, CreateFolderDto, UpdateFolderDto } from '@meerkapp/wms-contracts'

export const folderApi = {
  create: (dto: CreateFolderDto) =>
    apiClient<Folder>('/folder', { method: 'POST', body: dto }),

  update: (id: number, dto: UpdateFolderDto) =>
    apiClient<Folder>(`/folder/${id}`, { method: 'PATCH', body: dto }),

  pin: (id: number) =>
    apiClient<Folder>(`/folder/${id}/pin`, { method: 'POST' }),

  unpin: (id: number) =>
    apiClient<Folder>(`/folder/${id}/pin`, { method: 'DELETE' }),

  moveUp: (id: number) =>
    apiClient<Folder>(`/folder/${id}/move-up`, { method: 'PATCH' }),

  moveDown: (id: number) =>
    apiClient<Folder>(`/folder/${id}/move-down`, { method: 'PATCH' }),
}
