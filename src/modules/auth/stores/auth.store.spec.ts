import { createPinia, setActivePinia } from 'pinia'
import { FetchError } from 'ofetch'
import { watch } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const dependencies = vi.hoisted(() => ({
  refresh: vi.fn(),
  logout: vi.fn(),
  syncStart: vi.fn(),
  syncStop: vi.fn(),
  activateOfflineAccount: vi.fn(),
  removeAccountScopes: vi.fn(),
  saveAuthenticatedAccount: vi.fn(),
  getActiveAccountId: vi.fn(),
  getOfflineAccount: vi.fn(),
  removeAccountProfile: vi.fn(),
  presenceSetup: vi.fn(),
  presenceTeardown: vi.fn(),
}))

vi.mock('@/modules/auth/api/auth.api', () => ({
  authApi: {
    refresh: dependencies.refresh,
    logout: dependencies.logout,
  },
}))

vi.mock('@/modules/sync/services/sync.service', () => ({
  localSyncService: {
    start: dependencies.syncStart,
    stop: dependencies.syncStop,
    activateOfflineAccount: dependencies.activateOfflineAccount,
    removeAccount: dependencies.removeAccountScopes,
  },
}))

vi.mock('@/modules/sync/repositories/local-state.repository', () => ({
  OFFLINE_ACCESS_GRACE_PERIOD_MS: 7 * 24 * 60 * 60 * 1000,
  localStateRepository: {
    saveAuthenticatedAccount: dependencies.saveAuthenticatedAccount,
    getActiveAccountId: dependencies.getActiveAccountId,
    getOfflineAccount: dependencies.getOfflineAccount,
    removeAccount: dependencies.removeAccountProfile,
  },
}))

vi.mock('@/modules/employee/stores/presence.store', () => ({
  usePresenceStore: () => ({
    setup: dependencies.presenceSetup,
    teardown: dependencies.presenceTeardown,
  }),
}))

import { useAuthStore } from './auth.store'

function encodeJwtPart(value: object) {
  return btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function accessToken(accountId: string, warehouseId: number | null) {
  return `${encodeJwtPart({ alg: 'none', typ: 'JWT' })}.${encodeJwtPart({
    sub: accountId,
    email: `${accountId}@test.local`,
    firstName: 'Test',
    lastName: 'User',
    warehouseId,
    isActive: true,
    permissions: [],
    lastSeen: null,
    avatarUrl: null,
  })}.signature`
}

function unauthorizedError() {
  const error = new FetchError('Unauthorized')
  Object.defineProperty(error, 'status', { value: 401 })
  return error
}

function offlineAccount(accountId = 'account-a') {
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
    lastAuthenticatedAt: Date.now(),
  }
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  dependencies.activateOfflineAccount.mockResolvedValue(undefined)
  dependencies.removeAccountScopes.mockResolvedValue(undefined)
  dependencies.saveAuthenticatedAccount.mockResolvedValue(undefined)
  dependencies.getActiveAccountId.mockResolvedValue(null)
  dependencies.getOfflineAccount.mockResolvedValue(null)
  dependencies.removeAccountProfile.mockResolvedValue(undefined)
  dependencies.logout.mockResolvedValue(undefined)
})

describe('auth store refresh lifecycle', () => {
  it('activates sync and presence with the refreshed account context', async () => {
    const token = accessToken('account-a', 10)
    dependencies.refresh.mockResolvedValueOnce({ access_token: token })
    const auth = useAuthStore()

    await expect(auth.refresh()).resolves.toBe(true)

    expect(auth.accessToken).toBe(token)
    expect(auth.sessionMode).toBe('online')
    expect(dependencies.saveAuthenticatedAccount).toHaveBeenCalledWith(
      expect.objectContaining({ accountId: 'account-a', warehouseId: 10 }),
    )
    expect(dependencies.syncStart).toHaveBeenCalledWith(token, {
      accountId: 'account-a',
      homeWarehouseId: 10,
    })
    expect(dependencies.presenceSetup).toHaveBeenCalledOnce()
  })

  it('preserves the current identity after a transient refresh failure without an offline profile', async () => {
    const auth = useAuthStore()
    const token = accessToken('account-a', 10)
    auth.setTokens(token)
    dependencies.refresh.mockRejectedValueOnce(new TypeError('Network unavailable'))

    await expect(auth.refresh()).resolves.toBe(false)

    expect(auth.accessToken).toBe(token)
    expect(auth.canAccessWorkspace).toBe(true)
    expect(dependencies.syncStop).not.toHaveBeenCalled()
    expect(dependencies.presenceTeardown).not.toHaveBeenCalled()
    expect(dependencies.removeAccountScopes).not.toHaveBeenCalled()
    expect(dependencies.removeAccountProfile).not.toHaveBeenCalled()
  })

  it('restores a read-only offline account after a network refresh failure', async () => {
    dependencies.refresh.mockRejectedValueOnce(new TypeError('Network unavailable'))
    dependencies.getActiveAccountId.mockResolvedValueOnce('account-a')
    dependencies.getOfflineAccount.mockResolvedValueOnce(offlineAccount())
    const auth = useAuthStore()

    await expect(auth.refresh()).resolves.toBe(false)

    expect(auth.sessionMode).toBe('offline-readonly')
    expect(auth.canAccessWorkspace).toBe(true)
    expect(auth.isAuthenticated).toBe(false)
    expect(dependencies.activateOfflineAccount).toHaveBeenCalledWith({
      accountId: 'account-a',
      homeWarehouseId: 10,
    })
    expect(dependencies.syncStart).not.toHaveBeenCalled()
    expect(dependencies.presenceSetup).not.toHaveBeenCalled()
    auth.deactivateSession()
  })

  it('never exposes an anonymous state while switching an online session to offline', async () => {
    let completeOfflineActivation!: () => void
    const offlineActivation = new Promise<void>((resolve) => {
      completeOfflineActivation = resolve
    })
    dependencies.getOfflineAccount.mockResolvedValueOnce(offlineAccount())
    dependencies.activateOfflineAccount.mockReturnValueOnce(offlineActivation)

    const auth = useAuthStore()
    auth.setTokens(accessToken('account-a', 10))
    const accessStates = [auth.canAccessWorkspace]
    const stopWatching = watch(
      () => auth.canAccessWorkspace,
      (canAccess) => accessStates.push(canAccess),
      { flush: 'sync' },
    )

    const transition = auth.activateOfflineSession()
    await vi.waitFor(() => expect(dependencies.activateOfflineAccount).toHaveBeenCalledOnce())

    expect(auth.sessionMode).toBe('offline-readonly')
    expect(auth.canAccessWorkspace).toBe(true)
    expect(accessStates).not.toContain(false)

    completeOfflineActivation()
    await expect(transition).resolves.toBe(true)
    stopWatching()
    auth.deactivateSession()
  })

  it('removes only the rejected account after a confirmed refresh 401', async () => {
    const auth = useAuthStore()
    auth.setTokens(accessToken('account-a', 10))
    dependencies.refresh.mockRejectedValueOnce(unauthorizedError())

    await expect(auth.refresh()).resolves.toBe(false)

    expect(dependencies.removeAccountProfile).toHaveBeenCalledWith('account-a')
    expect(dependencies.removeAccountScopes).toHaveBeenCalledWith('account-a')
  })

  it('removes the active account on explicit logout even if the request fails', async () => {
    const auth = useAuthStore()
    auth.setTokens(accessToken('account-a', 10))
    dependencies.logout.mockRejectedValueOnce(new TypeError('Network unavailable'))

    await auth.logout()

    expect(dependencies.removeAccountProfile).toHaveBeenCalledWith('account-a')
    expect(dependencies.removeAccountScopes).toHaveBeenCalledWith('account-a')
    expect(auth.accessToken).toBeNull()
  })
})
