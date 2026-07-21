import { apiClient } from '@/core/api/client'
import type { LoginDto, SetupInitDto } from '@meerkapp/wms-contracts'
import type {
  AuthTokens,
  DeviceAccountsResponse,
  SetupStatusResponse,
  JwtPayload,
} from '@/modules/auth/types/auth.types'

export const authApi = {
  login: (dto: LoginDto) =>
    apiClient<AuthTokens>('/auth/login', { method: 'POST', body: dto, authMode: 'device' }),

  refresh: (accountId: string) =>
    apiClient<AuthTokens>('/auth/refresh', {
      method: 'POST',
      body: { accountId },
      authMode: 'device',
    }),

  accounts: () => apiClient<DeviceAccountsResponse>('/auth/accounts', { authMode: 'device' }),

  activateAccount: (accountId: string) =>
    apiClient<AuthTokens>(`/auth/accounts/${accountId}/activate`, {
      method: 'POST',
      authMode: 'device',
    }),

  removeAccount: (accountId: string) =>
    apiClient(`/auth/accounts/${accountId}`, { method: 'DELETE', authMode: 'device' }),

  me: () => apiClient<JwtPayload>('/auth/me'),

  setupStatus: () => apiClient<SetupStatusResponse>('/setup/status', { authMode: 'device' }),

  setupInit: (dto: SetupInitDto) =>
    apiClient<AuthTokens>('/setup/init', {
      method: 'POST',
      body: dto,
      authMode: 'device',
    }),
}
