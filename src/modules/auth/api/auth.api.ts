import { apiClient } from '@/core/api/client'
import type {
  AuthTokens,
  LoginDto,
  SetupInitDto,
  SetupStatusResponse,
  JwtPayload,
} from '@/modules/auth/types/auth.types'

export const authApi = {
  login: (dto: LoginDto) =>
    apiClient<AuthTokens>('/auth/login', { method: 'POST', body: dto }),

  // refresh_token is sent automatically via httpOnly cookie
  refresh: () =>
    apiClient<AuthTokens>('/auth/refresh', { method: 'POST' }),

  // backend clears the httpOnly cookie on logout
  logout: () =>
    apiClient('/auth/logout', { method: 'POST' }),

  me: () =>
    apiClient<JwtPayload>('/auth/me'),

  setupStatus: () =>
    apiClient<SetupStatusResponse>('/setup/status'),

  setupInit: (dto: SetupInitDto) =>
    apiClient<AuthTokens>('/setup/init', { method: 'POST', body: dto }),

  // request one-time code for Electron launcher redirect
  getLauncherCode: () =>
    apiClient<{ code: string }>('/auth/launcher-code', { method: 'POST' }),
}
