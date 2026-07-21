import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db, WMS_LOCAL_DB_NAME } from '../db/db'
import { localStateRepository, OFFLINE_ACCESS_GRACE_PERIOD_MS } from './local-state.repository'
import type { LocalAccountProfile } from '../types/local-state.types'

function account(lastAuthenticatedAt: number, accountId = 'account-a'): LocalAccountProfile {
  return {
    accountId,
    email: `${accountId}@test.local`,
    firstName: 'Offline',
    lastName: 'User',
    warehouseId: 10,
    isActive: true,
    permissions: [],
    lastSeen: null,
    avatarUrl: null,
    lastAuthenticatedAt,
  }
}

beforeEach(async () => {
  db.close()
  await Dexie.delete(WMS_LOCAL_DB_NAME)
  await db.open()
})

afterEach(async () => {
  db.close()
  await Dexie.delete(WMS_LOCAL_DB_NAME)
})

describe('local state repository', () => {
  it('restores the active account only after a complete initial sync', async () => {
    const now = Date.now()
    await localStateRepository.saveAuthenticatedAccount(account(now))

    await expect(localStateRepository.getOfflineAccount(undefined, now)).resolves.toBeNull()

    await localStateRepository.markInitialSyncCompleted()

    await expect(localStateRepository.getOfflineAccount(undefined, now)).resolves.toMatchObject({
      accountId: 'account-a',
      warehouseId: 10,
    })
  })

  it('enforces the seven-day offline grace period', async () => {
    const authenticatedAt = Date.now()
    await localStateRepository.saveAuthenticatedAccount(account(authenticatedAt))
    await localStateRepository.markInitialSyncCompleted()

    await expect(
      localStateRepository.getOfflineAccount(
        undefined,
        authenticatedAt + OFFLINE_ACCESS_GRACE_PERIOD_MS,
      ),
    ).resolves.toBeDefined()
    await expect(
      localStateRepository.getOfflineAccount(
        undefined,
        authenticatedAt + OFFLINE_ACCESS_GRACE_PERIOD_MS + 1,
      ),
    ).resolves.toBeNull()
  })

  it('selects one saved account without removing other account profiles', async () => {
    const now = Date.now()
    await localStateRepository.saveAuthenticatedAccount(account(now - 1, 'account-a'))
    await localStateRepository.saveAuthenticatedAccount(account(now, 'account-b'))
    await localStateRepository.markInitialSyncCompleted()

    await localStateRepository.setActiveAccountId('account-a')

    await expect(localStateRepository.getActiveAccountId()).resolves.toBe('account-a')
    await expect(localStateRepository.getOfflineAccount('account-a', now)).resolves.toMatchObject({
      accountId: 'account-a',
    })
    await expect(localStateRepository.listAccountProfiles()).resolves.toEqual([
      expect.objectContaining({ accountId: 'account-b' }),
      expect.objectContaining({ accountId: 'account-a' }),
    ])
  })

  it('increments the active-account revision only when the selection changes', async () => {
    const now = Date.now()

    await expect(
      localStateRepository.saveAuthenticatedAccount(account(now, 'account-a')),
    ).resolves.toEqual({
      selection: { accountId: 'account-a', revision: 1 },
      changed: true,
    })
    await expect(
      localStateRepository.saveAuthenticatedAccount(account(now + 1, 'account-a')),
    ).resolves.toEqual({
      selection: { accountId: 'account-a', revision: 1 },
      changed: false,
    })
    await localStateRepository.saveAuthenticatedAccount(account(now + 2, 'account-b'), {
      activate: false,
    })
    await expect(localStateRepository.setActiveAccountId('account-b')).resolves.toEqual({
      selection: { accountId: 'account-b', revision: 2 },
      changed: true,
    })
    await expect(localStateRepository.getActiveAccountSelection()).resolves.toEqual({
      accountId: 'account-b',
      revision: 2,
    })
  })

  it('keeps an offline account removal pending until the account is authenticated again', async () => {
    const profile = account(Date.now())
    await localStateRepository.markAccountRemovalPending(profile.accountId)

    await expect(localStateRepository.listPendingAccountRemovals()).resolves.toEqual([
      expect.objectContaining({ accountId: profile.accountId }),
    ])

    await localStateRepository.saveAuthenticatedAccount(profile)

    await expect(localStateRepository.listPendingAccountRemovals()).resolves.toEqual([])
  })

  it('removes only account metadata and preserves the shared read model', async () => {
    await localStateRepository.saveAuthenticatedAccount(account(Date.now()))
    await localStateRepository.replaceAccountAvatar(
      'account-a',
      'http://storage.test/avatar.png',
      new Blob(['avatar'], { type: 'image/png' }),
    )
    await localStateRepository.markInitialSyncCompleted()
    await db.organizations.put({
      id: 1,
      name: 'Shared organization',
      website: null,
      priceListAssignments: [],
      updatedAt: '2026-01-01T00:00:00.000Z',
    })

    await expect(localStateRepository.removeAccount('account-a')).resolves.toEqual({
      selection: { accountId: null, revision: 2 },
      changed: true,
    })

    expect(await localStateRepository.getActiveAccountId()).toBeNull()
    expect(await db.accountProfiles.get('account-a')).toBeUndefined()
    expect(await db.accountAvatarCache.get('account-a')).toBeUndefined()
    expect(await db.organizations.get(1)).toBeDefined()
    expect(await db.readModelMetadata.get('initialSyncCompletedAt')).toBeDefined()
  })

  it('stores the theme per account and preserves it when authentication data is refreshed', async () => {
    const profile = account(Date.now())
    await localStateRepository.saveAuthenticatedAccount(profile)
    await localStateRepository.setThemePreference(profile.accountId, 'dark')

    await localStateRepository.saveAuthenticatedAccount({
      ...profile,
      firstName: 'Updated',
      lastAuthenticatedAt: profile.lastAuthenticatedAt + 1,
    })

    await expect(localStateRepository.getThemePreference(profile.accountId)).resolves.toBe('dark')
    await expect(db.accountProfiles.get(profile.accountId)).resolves.toMatchObject({
      firstName: 'Updated',
      preferences: { theme: 'dark' },
    })
  })

  it('stores an account avatar blob only while its source URL remains current', async () => {
    const profile = {
      ...account(Date.now()),
      avatarUrl: 'http://storage.test/avatar-a.png',
    }
    const avatar = new Blob(['avatar-a'], { type: 'image/png' })
    await localStateRepository.saveAuthenticatedAccount(profile)

    await expect(
      localStateRepository.cacheAccountAvatar(profile.accountId, profile.avatarUrl, avatar),
    ).resolves.toBe(true)
    const cachedAvatar = await localStateRepository.getAccountAvatarCache(profile.accountId)
    expect(cachedAvatar).toMatchObject({
      sourceUrl: profile.avatarUrl,
      blob: { type: 'image/png', size: avatar.size },
    })

    await localStateRepository.saveAuthenticatedAccount({
      ...profile,
      lastAuthenticatedAt: profile.lastAuthenticatedAt + 1,
    })
    await expect(
      localStateRepository.getAccountAvatarCache(profile.accountId),
    ).resolves.toMatchObject({ sourceUrl: profile.avatarUrl })

    await localStateRepository.saveAuthenticatedAccount({
      ...profile,
      avatarUrl: 'http://storage.test/avatar-b.png',
    })
    await expect(localStateRepository.getAccountAvatarCache(profile.accountId)).resolves.toBeNull()
  })
})
