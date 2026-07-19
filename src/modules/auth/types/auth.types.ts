import type { Permission } from '@meerkapp/wms-contracts'

export interface JwtPayload {
  sub: string
  email: string
  firstName: string
  lastName: string
  warehouseId: number | null
  isActive: boolean
  permissions: Permission[]
  lastSeen: string | null
  avatarUrl: string | null
}

export interface AuthTokens {
  access_token: string
  // refresh_token is set as httpOnly cookie by the backend
}

export interface SetupStatusResponse {
  setupRequired: boolean
}
