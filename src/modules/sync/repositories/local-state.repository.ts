import { db } from '../db/db'
import type { LocalAccountProfile, ThemePreference } from '../types/local-state.types'

export const OFFLINE_ACCESS_GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000

const ACTIVE_ACCOUNT_ID_KEY = 'activeAccountId' as const
const INITIAL_SYNC_COMPLETED_AT_KEY = 'initialSyncCompletedAt' as const

async function getActiveAccountId() {
  return (await db.localSettings.get(ACTIVE_ACCOUNT_ID_KEY))?.value ?? null
}

export const localStateRepository = {
  async saveAuthenticatedAccount(profile: LocalAccountProfile) {
    await db.transaction(
      'rw',
      db.accountProfiles,
      db.accountAvatarCache,
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
        await db.localSettings.put({ key: ACTIVE_ACCOUNT_ID_KEY, value: profile.accountId })
      },
    )
  },

  getActiveAccountId,

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

  async getOfflineAccount(now = Date.now()) {
    const activeAccountId = await getActiveAccountId()
    if (activeAccountId === null) return null

    const [profile, initialSync] = await Promise.all([
      db.accountProfiles.get(activeAccountId),
      db.readModelMetadata.get(INITIAL_SYNC_COMPLETED_AT_KEY),
    ])
    if (!profile || !profile.isActive || !initialSync) return null
    if (now - profile.lastAuthenticatedAt > OFFLINE_ACCESS_GRACE_PERIOD_MS) return null
    return profile
  },

  async removeAccount(accountId: string) {
    await db.transaction(
      'rw',
      db.accountProfiles,
      db.accountAvatarCache,
      db.localSettings,
      async () => {
        await db.accountProfiles.delete(accountId)
        await db.accountAvatarCache.delete(accountId)
        const activeAccount = await db.localSettings.get(ACTIVE_ACCOUNT_ID_KEY)
        if (activeAccount?.value === accountId) {
          await db.localSettings.delete(ACTIVE_ACCOUNT_ID_KEY)
        }
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
