import { createPinia, setActivePinia } from 'pinia'
import { FetchError } from 'ofetch'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const dependencies = vi.hoisted(() => ({
  refresh: vi.fn(),
  logout: vi.fn(),
  syncStart: vi.fn(),
  syncStop: vi.fn(),
  removeAccount: vi.fn(),
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
    removeAccount: dependencies.removeAccount,
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

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  dependencies.removeAccount.mockResolvedValue(undefined)
  dependencies.logout.mockResolvedValue(undefined)
})

describe('auth store refresh lifecycle', () => {
  it('activates sync and presence with the refreshed account context', async () => {
    const token = accessToken('account-a', 10)
    dependencies.refresh.mockResolvedValueOnce({ access_token: token })
    const auth = useAuthStore()

    await expect(auth.refresh()).resolves.toBe(true)

    expect(auth.accessToken).toBe(token)
    expect(dependencies.syncStart).toHaveBeenCalledWith(token, {
      accountId: 'account-a',
      homeWarehouseId: 10,
    })
    expect(dependencies.presenceSetup).toHaveBeenCalledOnce()
  })

  it('preserves account-scoped metadata after a transient refresh failure', async () => {
    const auth = useAuthStore()
    auth.setTokens(accessToken('account-a', 10))
    dependencies.refresh.mockRejectedValueOnce(new TypeError('Network unavailable'))

    await expect(auth.refresh()).resolves.toBe(false)

    expect(auth.accessToken).toBeNull()
    expect(dependencies.syncStop).toHaveBeenCalledOnce()
    expect(dependencies.presenceTeardown).toHaveBeenCalledOnce()
    expect(dependencies.removeAccount).not.toHaveBeenCalled()
  })

  it('removes only the rejected account after a confirmed refresh 401', async () => {
    const auth = useAuthStore()
    auth.setTokens(accessToken('account-a', 10))
    dependencies.refresh.mockRejectedValueOnce(unauthorizedError())

    await expect(auth.refresh()).resolves.toBe(false)

    expect(dependencies.removeAccount).toHaveBeenCalledOnce()
    expect(dependencies.removeAccount).toHaveBeenCalledWith('account-a')
  })

  it('removes the active account on explicit logout even if the request fails', async () => {
    const auth = useAuthStore()
    auth.setTokens(accessToken('account-a', 10))
    dependencies.logout.mockRejectedValueOnce(new TypeError('Network unavailable'))

    await auth.logout()

    expect(dependencies.removeAccount).toHaveBeenCalledWith('account-a')
    expect(auth.accessToken).toBeNull()
  })
})
