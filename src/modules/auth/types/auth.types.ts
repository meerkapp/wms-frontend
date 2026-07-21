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
}

export interface DeviceAccountSummary {
  accountId: string
  firstName: string
  lastName: string
  warehouseId: number | null
  avatarUrl: string | null
}

export interface DeviceAccountsResponse {
  accounts: DeviceAccountSummary[]
}

export interface SetupStatusResponse {
  setupRequired: boolean
}
