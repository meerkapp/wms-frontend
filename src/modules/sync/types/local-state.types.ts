import type { Permission } from '@meerkapp/wms-contracts'

export type ThemePreference = 'light' | 'dark' | 'system'

export interface LocalAccountPreferences {
  theme?: ThemePreference
}

export interface LocalAccountAvatarCache {
  accountId: string
  sourceUrl: string
  blob: Blob
  cachedAt: number
}

export interface LocalAccountProfile {
  accountId: string
  email: string
  firstName: string
  lastName: string
  warehouseId: number | null
  isActive: boolean
  permissions: Permission[]
  lastSeen: string | null
  avatarUrl: string | null
  lastAuthenticatedAt: number
  preferences?: LocalAccountPreferences
}

export interface LocalSetting {
  key: 'activeAccountId'
  value: string
}

export interface ReadModelMetadata {
  key: 'initialSyncCompletedAt'
  value: string
}
