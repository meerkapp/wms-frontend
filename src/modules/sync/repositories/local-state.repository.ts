import { db } from '../db/db'
import type {
  ActiveAccountSelection,
  ActiveAccountUpdate,
  LocalAccountProfile,
  ThemePreference,
} from '../types/local-state.types'

export const OFFLINE_ACCESS_GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000

const ACTIVE_ACCOUNT_ID_KEY = 'activeAccountId' as const
const ACTIVE_ACCOUNT_REVISION_KEY = 'activeAccountRevision' as const
const INITIAL_SYNC_COMPLETED_AT_KEY = 'initialSyncCompletedAt' as const

async function getActiveAccountSelection(): Promise<ActiveAccountSelection> {
  const [accountSetting, revisionSetting] = await Promise.all([
    db.localSettings.get(ACTIVE_ACCOUNT_ID_KEY),
    db.localSettings.get(ACTIVE_ACCOUNT_REVISION_KEY),
  ])
  return {
    accountId: accountSetting?.key === ACTIVE_ACCOUNT_ID_KEY ? accountSetting.value : null,
    revision: revisionSetting?.key === ACTIVE_ACCOUNT_REVISION_KEY ? revisionSetting.value : 0,
  }
}

async function updateActiveAccount(accountId: string | null): Promise<ActiveAccountUpdate> {
  const current = await getActiveAccountSelection()
  if (current.accountId === accountId) return { selection: current, changed: false }

  const selection = { accountId, revision: current.revision + 1 }
  if (accountId === null) {
    await db.localSettings.delete(ACTIVE_ACCOUNT_ID_KEY)
  } else {
    await db.localSettings.put({ key: ACTIVE_ACCOUNT_ID_KEY, value: accountId })
  }
  await db.localSettings.put({
    key: ACTIVE_ACCOUNT_REVISION_KEY,
    value: selection.revision,
  })
  return { selection, changed: true }
}

async function getActiveAccountId() {
  return (await getActiveAccountSelection()).accountId
}

export const localStateRepository = {
  async saveAuthenticatedAccount(
    profile: LocalAccountProfile,
    options: { activate?: boolean } = {},
  ): Promise<ActiveAccountUpdate> {
    return db.transaction(
      'rw',
      db.accountProfiles,
      db.accountAvatarCache,
      db.pendingAccountRemovals,
      db.localSettings,
      async () => {
        const existingProfile = await db.accountProfiles.get(profile.accountId)
        if (profile.avatarUrl === null || existingProfile?.avatarUrl !== profile.avatarUrl) {
          await db.accountAvatarCache.delete(profile.accountId)
        }
        await db.accountProfiles.put({
          ...profile,
          preferences: profile.preferences ?? existingProfile?.preferences,
        })
        await db.pendingAccountRemovals.delete(profile.accountId)
        if (options.activate === false) {
          return {
            selection: await getActiveAccountSelection(),
            changed: false,
          }
        }
        return updateActiveAccount(profile.accountId)
      },
    )
  },

  getActiveAccountId,
  getActiveAccountSelection,

  listAccountProfiles() {
    return db.accountProfiles.orderBy('lastAuthenticatedAt').reverse().toArray()
  },

  async setActiveAccountId(accountId: string): Promise<ActiveAccountUpdate> {
    return db.transaction('rw', db.accountProfiles, db.localSettings, async () => {
      if (!(await db.accountProfiles.get(accountId))) {
        throw new Error(`Cannot activate unknown local account: ${accountId}`)
      }
      return updateActiveAccount(accountId)
    })
  },

  listPendingAccountRemovals() {
    return db.pendingAccountRemovals.toArray()
  },

  async markAccountRemovalPending(accountId: string) {
    await db.pendingAccountRemovals.put({ accountId, createdAt: Date.now() })
  },

  async clearPendingAccountRemoval(accountId: string) {
    await db.pendingAccountRemovals.delete(accountId)
  },

  async getAccountAvatarCache(accountId: string) {
    return (await db.accountAvatarCache.get(accountId)) ?? null
  },

  async cacheAccountAvatar(accountId: string, sourceUrl: string, blob: Blob): Promise<boolean> {
    return db.transaction('rw', db.accountProfiles, db.accountAvatarCache, async () => {
      const profile = await db.accountProfiles.get(accountId)
      if (!profile || profile.avatarUrl !== sourceUrl) return false

      await db.accountAvatarCache.put({
        accountId,
        sourceUrl,
        blob,
        cachedAt: Date.now(),
      })
      return true
    })
  },

  async replaceAccountAvatar(accountId: string, sourceUrl: string, blob: Blob) {
    await db.transaction('rw', db.accountProfiles, db.accountAvatarCache, async () => {
      if (!(await db.accountProfiles.update(accountId, { avatarUrl: sourceUrl }))) return
      await db.accountAvatarCache.put({
        accountId,
        sourceUrl,
        blob,
        cachedAt: Date.now(),
      })
    })
  },

  async removeAccountAvatar(accountId: string) {
    await db.transaction('rw', db.accountProfiles, db.accountAvatarCache, async () => {
      await db.accountProfiles.update(accountId, { avatarUrl: null })
      await db.accountAvatarCache.delete(accountId)
    })
  },

  async getThemePreference(accountId: string) {
    return (await db.accountProfiles.get(accountId))?.preferences?.theme ?? null
  },

  async setThemePreference(accountId: string, theme: ThemePreference) {
    await db.transaction('rw', db.accountProfiles, async () => {
      const profile = await db.accountProfiles.get(accountId)
      if (!profile) return

      await db.accountProfiles.update(accountId, {
        preferences: {
          ...profile.preferences,
          theme,
        },
      })
    })
  },

  async getOfflineAccount(accountId?: string, now = Date.now()) {
    const resolvedAccountId = accountId ?? (await getActiveAccountId())
    if (resolvedAccountId === null) return null

    const [profile, initialSync] = await Promise.all([
      db.accountProfiles.get(resolvedAccountId),
      db.readModelMetadata.get(INITIAL_SYNC_COMPLETED_AT_KEY),
    ])
    if (!profile || !profile.isActive || !initialSync) return null
    if (now - profile.lastAuthenticatedAt > OFFLINE_ACCESS_GRACE_PERIOD_MS) return null
    return profile
  },

  async removeAccount(accountId: string): Promise<ActiveAccountUpdate> {
    return db.transaction(
      'rw',
      db.accountProfiles,
      db.accountAvatarCache,
      db.localSettings,
      async () => {
        await db.accountProfiles.delete(accountId)
        await db.accountAvatarCache.delete(accountId)
        const activeAccount = await getActiveAccountSelection()
        if (activeAccount.accountId === accountId) return updateActiveAccount(null)
        return { selection: activeAccount, changed: false }
      },
    )
  },

  async markInitialSyncCompleted() {
    await db.readModelMetadata.put({
      key: INITIAL_SYNC_COMPLETED_AT_KEY,
      value: new Date().toISOString(),
    })
  },
}
