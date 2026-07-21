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

export interface PendingAccountRemoval {
  accountId: string
  createdAt: number
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

export interface ActiveAccountSelection {
  accountId: string | null
  revision: number
}

export interface ActiveAccountUpdate {
  selection: ActiveAccountSelection
  changed: boolean
}

export type LocalSetting =
  | { key: 'activeAccountId'; value: string }
  | { key: 'activeAccountRevision'; value: number }

export interface ReadModelMetadata {
  key: 'initialSyncCompletedAt'
  value: string
}
