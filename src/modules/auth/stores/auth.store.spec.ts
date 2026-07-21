import { createPinia, setActivePinia } from 'pinia'
import { FetchError } from 'ofetch'
import { watch } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ClientUpdateRequiredError } from '@/core/api/client-update-required.error'

const dependencies = vi.hoisted(() => ({
  refresh: vi.fn(),
  accounts: vi.fn(),
  activateAccount: vi.fn(),
  removeRemoteAccount: vi.fn(),
  syncStart: vi.fn(),
  syncStop: vi.fn(),
  activateOfflineAccount: vi.fn(),
  removeAccountScopes: vi.fn(),
  saveAuthenticatedAccount: vi.fn(),
  getActiveAccountId: vi.fn(),
  getActiveAccountSelection: vi.fn(),
  getOfflineAccount: vi.fn(),
  listAccountProfiles: vi.fn(),
  setActiveAccountId: vi.fn(),
  listPendingAccountRemovals: vi.fn(),
  markAccountRemovalPending: vi.fn(),
  clearPendingAccountRemoval: vi.fn(),
  removeAccountProfile: vi.fn(),
  presenceSetup: vi.fn(),
  presenceTeardown: vi.fn(),
  publishAccountSession: vi.fn(),
}))

vi.mock('@/modules/auth/api/auth.api', () => ({
  authApi: {
    refresh: dependencies.refresh,
    accounts: dependencies.accounts,
    activateAccount: dependencies.activateAccount,
    removeAccount: dependencies.removeRemoteAccount,
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
    getActiveAccountSelection: dependencies.getActiveAccountSelection,
    getOfflineAccount: dependencies.getOfflineAccount,
    listAccountProfiles: dependencies.listAccountProfiles,
    setActiveAccountId: dependencies.setActiveAccountId,
    listPendingAccountRemovals: dependencies.listPendingAccountRemovals,
    markAccountRemovalPending: dependencies.markAccountRemovalPending,
    clearPendingAccountRemoval: dependencies.clearPendingAccountRemoval,
    removeAccount: dependencies.removeAccountProfile,
  },
}))

vi.mock('@/modules/auth/services/account-session-channel', () => ({
  accountSessionChannel: {
    publish: dependencies.publishAccountSession,
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

function accessToken(accountId: string, warehouseId: number | null, permissions: string[] = []) {
  return `${encodeJwtPart({ alg: 'none', typ: 'JWT' })}.${encodeJwtPart({
    sub: accountId,
    email: `${accountId}@test.local`,
    firstName: 'Test',
    lastName: 'User',
    warehouseId,
    isActive: true,
    permissions,
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
  dependencies.saveAuthenticatedAccount.mockResolvedValue({
    selection: { accountId: 'account-a', revision: 1 },
    changed: true,
  })
  dependencies.getActiveAccountId.mockResolvedValue(null)
  dependencies.getActiveAccountSelection.mockResolvedValue({
    accountId: 'account-a',
    revision: 1,
  })
  dependencies.getOfflineAccount.mockResolvedValue(null)
  dependencies.listAccountProfiles.mockResolvedValue([])
  dependencies.setActiveAccountId.mockResolvedValue({
    selection: { accountId: 'account-a', revision: 1 },
    changed: false,
  })
  dependencies.listPendingAccountRemovals.mockResolvedValue([])
  dependencies.markAccountRemovalPending.mockResolvedValue(undefined)
  dependencies.clearPendingAccountRemoval.mockResolvedValue(undefined)
  dependencies.removeAccountProfile.mockResolvedValue({
    selection: { accountId: null, revision: 2 },
    changed: true,
  })
  dependencies.accounts.mockResolvedValue({ accounts: [] })
  dependencies.removeRemoteAccount.mockResolvedValue(undefined)
})

describe('auth store refresh lifecycle', () => {
  it('activates sync and presence with the refreshed account context', async () => {
    const token = accessToken('account-a', 10)
    dependencies.getActiveAccountSelection.mockResolvedValueOnce({
      accountId: 'account-a',
      revision: 1,
    })
    dependencies.refresh.mockResolvedValueOnce({ access_token: token })
    const auth = useAuthStore()

    await expect(auth.refresh()).resolves.toBe(true)

    expect(auth.accessToken).toBe(token)
    expect(auth.sessionMode).toBe('online')
    expect(dependencies.refresh).toHaveBeenCalledWith('account-a')
    expect(dependencies.saveAuthenticatedAccount).toHaveBeenCalledWith(
      expect.objectContaining({ accountId: 'account-a', warehouseId: 10 }),
      { activate: false },
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
    dependencies.getActiveAccountSelection.mockResolvedValueOnce({
      accountId: 'account-a',
      revision: 1,
    })
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

  it('preserves local account state when the client must be updated', async () => {
    dependencies.refresh.mockRejectedValueOnce(new ClientUpdateRequiredError())
    dependencies.getActiveAccountSelection.mockResolvedValueOnce({
      accountId: 'account-a',
      revision: 1,
    })
    dependencies.getOfflineAccount.mockResolvedValueOnce(offlineAccount())
    const auth = useAuthStore()

    await expect(auth.refresh()).resolves.toBe(false)

    expect(auth.sessionMode).toBe('offline-readonly')
    expect(dependencies.removeAccountProfile).not.toHaveBeenCalled()
    expect(dependencies.removeAccountScopes).not.toHaveBeenCalled()
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
    dependencies.removeRemoteAccount.mockRejectedValueOnce(new TypeError('Network unavailable'))

    await auth.logout()

    expect(dependencies.removeAccountProfile).toHaveBeenCalledWith('account-a')
    expect(dependencies.removeAccountScopes).toHaveBeenCalledWith('account-a')
    expect(dependencies.markAccountRemovalPending).toHaveBeenCalledWith('account-a')
    expect(auth.accessToken).toBeNull()
  })

  it('does not restore an account after another tab selects a newer active account', async () => {
    let resolveRefresh!: (tokens: { access_token: string }) => void
    dependencies.getActiveAccountSelection.mockResolvedValueOnce({
      accountId: 'account-a',
      revision: 1,
    })
    dependencies.refresh.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRefresh = resolve
      }),
    )
    dependencies.saveAuthenticatedAccount.mockResolvedValueOnce({
      selection: { accountId: 'account-b', revision: 2 },
      changed: false,
    })
    const auth = useAuthStore()
    const originalToken = accessToken('account-a', 10)
    auth.setTokens(originalToken)

    const refresh = auth.refresh()
    await vi.waitFor(() => expect(dependencies.refresh).toHaveBeenCalledWith('account-a'))
    resolveRefresh({ access_token: accessToken('account-a', 20) })

    await expect(refresh).resolves.toBe(false)
    expect(auth.accessToken).toBe(originalToken)
    expect(dependencies.syncStart).not.toHaveBeenCalled()
  })
})

describe('auth store account switching', () => {
  it('stops the previous realtime session before starting another online account', async () => {
    const auth = useAuthStore()
    await auth.activateSession(accessToken('account-a', 10, ['employee:update:avatar']))
    dependencies.saveAuthenticatedAccount.mockResolvedValueOnce({
      selection: { accountId: 'account-b', revision: 2 },
      changed: true,
    })
    dependencies.activateAccount.mockResolvedValueOnce({
      access_token: accessToken('account-b', 20, ['employee:update:own:avatar']),
    })

    await expect(auth.switchAccount('account-b')).resolves.toBe(true)

    expect(dependencies.activateAccount).toHaveBeenCalledWith('account-b')
    expect(dependencies.syncStop).toHaveBeenCalledOnce()
    expect(dependencies.presenceTeardown).toHaveBeenCalledOnce()
    expect(dependencies.syncStart).toHaveBeenLastCalledWith(expect.any(String), {
      accountId: 'account-b',
      homeWarehouseId: 20,
    })
    expect(auth.user?.sub).toBe('account-b')
    expect(auth.checkUserPermissions('employee:update:avatar')).toBe(false)
    expect(auth.checkUserPermissions('employee:update:own:avatar')).toBe(true)
    expect(dependencies.publishAccountSession).toHaveBeenLastCalledWith({
      type: 'active-account-changed',
      selection: { accountId: 'account-b', revision: 2 },
    })
  })

  it('switches a selected saved account to offline mode when the server is unavailable', async () => {
    const auth = useAuthStore()
    await auth.activateSession(accessToken('account-a', 10))
    dependencies.activateAccount.mockRejectedValueOnce(new TypeError('Network unavailable'))
    dependencies.getOfflineAccount.mockResolvedValueOnce(offlineAccount('account-b'))

    await expect(auth.switchAccount('account-b')).resolves.toBe(true)

    expect(dependencies.setActiveAccountId).toHaveBeenCalledWith('account-b')
    expect(dependencies.activateOfflineAccount).toHaveBeenCalledWith({
      accountId: 'account-b',
      homeWarehouseId: 10,
    })
    expect(auth.sessionMode).toBe('offline-readonly')
    expect(auth.user?.sub).toBe('account-b')
    auth.deactivateSession()
  })

  it('does not treat a local session commit error as a network outage', async () => {
    dependencies.activateAccount.mockResolvedValueOnce({
      access_token: accessToken('account-b', 20),
    })
    dependencies.saveAuthenticatedAccount.mockRejectedValueOnce(
      new TypeError('IndexedDB commit failed'),
    )
    const auth = useAuthStore()

    await expect(auth.switchAccount('account-b')).rejects.toThrow('IndexedDB commit failed')

    expect(dependencies.getOfflineAccount).not.toHaveBeenCalled()
    expect(auth.canAccessWorkspace).toBe(false)
  })

  it('ignores a delayed activation response after a newer account wins', async () => {
    let resolveActivation!: (tokens: { access_token: string }) => void
    dependencies.activateAccount.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveActivation = resolve
      }),
    )
    const auth = useAuthStore()
    const delayedSwitch = auth.switchAccount('account-b')

    await auth.activateSession(accessToken('account-c', 30))
    resolveActivation({ access_token: accessToken('account-b', 20) })

    await expect(delayedSwitch).resolves.toBe(false)
    expect(auth.user?.sub).toBe('account-c')
  })

  it('applies an account selected in another tab without broadcasting it again', async () => {
    const auth = useAuthStore()
    await auth.activateSession(accessToken('account-a', 10))
    dependencies.publishAccountSession.mockClear()
    dependencies.getActiveAccountSelection.mockResolvedValue({
      accountId: 'account-b',
      revision: 2,
    })
    dependencies.saveAuthenticatedAccount.mockResolvedValueOnce({
      selection: { accountId: 'account-b', revision: 2 },
      changed: false,
    })
    dependencies.activateAccount.mockResolvedValueOnce({
      access_token: accessToken('account-b', 20),
    })

    await expect(
      auth.applyAccountSessionMessage({
        type: 'active-account-changed',
        selection: { accountId: 'account-b', revision: 2 },
      }),
    ).resolves.toBe('activated-online')

    expect(auth.user?.sub).toBe('account-b')
    expect(dependencies.syncStop).toHaveBeenCalledOnce()
    expect(dependencies.syncStart).toHaveBeenLastCalledWith(expect.any(String), {
      accountId: 'account-b',
      homeWarehouseId: 20,
    })
    expect(dependencies.saveAuthenticatedAccount).toHaveBeenLastCalledWith(
      expect.objectContaining({ accountId: 'account-b' }),
      { activate: false },
    )
    expect(dependencies.publishAccountSession).not.toHaveBeenCalled()
  })

  it('ignores a stale cross-tab event when a newer selection is already stored', async () => {
    dependencies.getActiveAccountSelection.mockResolvedValueOnce({
      accountId: 'account-c',
      revision: 3,
    })
    const auth = useAuthStore()

    await expect(
      auth.applyAccountSessionMessage({
        type: 'active-account-changed',
        selection: { accountId: 'account-b', revision: 2 },
      }),
    ).resolves.toBe('ignored')

    expect(dependencies.activateAccount).not.toHaveBeenCalled()
  })

  it('deactivates the current tab after the active account is removed elsewhere', async () => {
    const auth = useAuthStore()
    await auth.activateSession(accessToken('account-a', 10))
    dependencies.getActiveAccountSelection.mockResolvedValueOnce({
      accountId: null,
      revision: 2,
    })

    await expect(
      auth.applyAccountSessionMessage({
        type: 'active-account-changed',
        selection: { accountId: null, revision: 2 },
      }),
    ).resolves.toBe('deactivated')

    expect(auth.canAccessWorkspace).toBe(false)
    expect(dependencies.syncStop).toHaveBeenCalledOnce()
    expect(dependencies.presenceTeardown).toHaveBeenCalledOnce()
  })

  it('lets only the newest overlapping cross-tab transition control the session', async () => {
    let resolveAccountB!: (tokens: { access_token: string }) => void
    const auth = useAuthStore()
    await auth.activateSession(accessToken('account-a', 10))
    dependencies.getActiveAccountSelection.mockResolvedValue({
      accountId: 'account-b',
      revision: 2,
    })
    dependencies.activateAccount
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveAccountB = resolve
        }),
      )
      .mockResolvedValueOnce({ access_token: accessToken('account-c', 30) })

    const accountBTransition = auth.applyAccountSessionMessage({
      type: 'active-account-changed',
      selection: { accountId: 'account-b', revision: 2 },
    })
    await vi.waitFor(() => expect(dependencies.activateAccount).toHaveBeenCalledWith('account-b'))

    dependencies.getActiveAccountSelection.mockResolvedValue({
      accountId: 'account-c',
      revision: 3,
    })
    dependencies.saveAuthenticatedAccount.mockResolvedValueOnce({
      selection: { accountId: 'account-c', revision: 3 },
      changed: false,
    })
    const accountCTransition = auth.applyAccountSessionMessage({
      type: 'active-account-changed',
      selection: { accountId: 'account-c', revision: 3 },
    })

    await expect(accountCTransition).resolves.toBe('activated-online')
    resolveAccountB({ access_token: accessToken('account-b', 20) })
    await expect(accountBTransition).resolves.toBe('ignored')

    expect(auth.user?.sub).toBe('account-c')
    expect(auth.isCrossTabTransitioning).toBe(false)
  })

  it('merges local and server-authorized account identities for startup selection', async () => {
    dependencies.listAccountProfiles.mockResolvedValueOnce([offlineAccount('account-a')])
    dependencies.accounts.mockResolvedValueOnce({
      accounts: [
        {
          accountId: 'account-b',
          firstName: 'Server',
          lastName: 'Account',
          warehouseId: 20,
          avatarUrl: null,
        },
      ],
    })
    const auth = useAuthStore()

    await expect(auth.listAvailableAccountIds()).resolves.toEqual(['account-a', 'account-b'])
  })

  it('revokes a queued offline logout before exposing server accounts again', async () => {
    dependencies.listPendingAccountRemovals
      .mockResolvedValueOnce([{ accountId: 'account-a', createdAt: Date.now() }])
      .mockResolvedValueOnce([])
    dependencies.accounts.mockResolvedValueOnce({
      accounts: [
        {
          accountId: 'account-b',
          firstName: 'Server',
          lastName: 'Account',
          warehouseId: 20,
          avatarUrl: null,
        },
      ],
    })
    const auth = useAuthStore()

    await expect(auth.loadDeviceAccounts()).resolves.toEqual([
      expect.objectContaining({ accountId: 'account-b' }),
    ])
    expect(dependencies.removeRemoteAccount).toHaveBeenCalledWith('account-a')
    expect(dependencies.clearPendingAccountRemoval).toHaveBeenCalledWith('account-a')
  })
})
