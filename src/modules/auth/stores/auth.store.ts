import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { jwtDecode } from 'jwt-decode'
import { FetchError } from 'ofetch'
import { authApi } from '@/modules/auth/api/auth.api'
import { usePresenceStore } from '@/modules/employee/stores/presence.store'
import { localSyncService } from '@/modules/sync/services/sync.service'
import {
  localStateRepository,
  OFFLINE_ACCESS_GRACE_PERIOD_MS,
} from '@/modules/sync/repositories/local-state.repository'
import type { LocalAccountProfile } from '@/modules/sync/types/local-state.types'
import type { JwtPayload } from '@/modules/auth/types/auth.types'
import type { Permission } from '@meerkapp/wms-contracts'

export type AuthSessionMode = 'anonymous' | 'online' | 'offline-readonly'

function decodeAccessToken(access: string): JwtPayload | null {
  try {
    return jwtDecode<JwtPayload>(access)
  } catch {
    return null
  }
}

function toLocalAccountProfile(account: JwtPayload): LocalAccountProfile {
  return {
    accountId: account.sub,
    email: account.email,
    firstName: account.firstName,
    lastName: account.lastName,
    warehouseId: account.warehouseId,
    isActive: account.isActive,
    permissions: account.permissions,
    lastSeen: account.lastSeen,
    avatarUrl: account.avatarUrl,
    lastAuthenticatedAt: Date.now(),
  }
}

function toJwtPayload(account: LocalAccountProfile): JwtPayload {
  return {
    sub: account.accountId,
    email: account.email,
    firstName: account.firstName,
    lastName: account.lastName,
    warehouseId: account.warehouseId,
    isActive: account.isActive,
    permissions: account.permissions,
    lastSeen: account.lastSeen,
    avatarUrl: account.avatarUrl,
  }
}

function isUnauthorized(error: unknown) {
  return error instanceof FetchError && error.status === 401
}

function isNetworkFailure(error: unknown) {
  if (error instanceof TypeError) return true
  return error instanceof FetchError && (error.status === undefined || error.status === 0)
}

export const useAuthStore = defineStore('auth', () => {
  // access_token stored in memory only — never in localStorage (XSS protection)
  // refresh_token stored in httpOnly cookie — JS cannot read it
  const accessToken = ref<string | null>(null)
  const offlineUser = ref<JwtPayload | null>(null)
  let refreshPromise: Promise<boolean> | null = null
  let offlineActivationPromise: Promise<boolean> | null = null
  let offlineExpiryTimer: ReturnType<typeof setTimeout> | null = null

  const onlineUser = computed<JwtPayload | null>(() =>
    accessToken.value ? decodeAccessToken(accessToken.value) : null,
  )
  const user = computed<JwtPayload | null>(() => onlineUser.value ?? offlineUser.value)

  const isAuthenticated = computed(() => !!accessToken.value && !!onlineUser.value)
  const isOffline = computed(() => offlineUser.value !== null && !isAuthenticated.value)
  const canAccessWorkspace = computed(() => isAuthenticated.value || isOffline.value)
  const sessionMode = computed<AuthSessionMode>(() => {
    if (isAuthenticated.value) return 'online'
    if (isOffline.value) return 'offline-readonly'
    return 'anonymous'
  })

  function setTokens(access: string) {
    accessToken.value = access
  }

  function clearOfflineExpiryTimer() {
    if (offlineExpiryTimer !== null) clearTimeout(offlineExpiryTimer)
    offlineExpiryTimer = null
  }

  function scheduleOfflineExpiry(lastAuthenticatedAt: number) {
    clearOfflineExpiryTimer()
    const remaining = lastAuthenticatedAt + OFFLINE_ACCESS_GRACE_PERIOD_MS - Date.now()
    if (remaining <= 0) {
      deactivateSession()
      return
    }
    offlineExpiryTimer = setTimeout(deactivateSession, remaining)
  }

  async function activateSession(access: string) {
    const account = decodeAccessToken(access)
    if (!account) throw new Error('Cannot activate a session with an invalid access token')
    await localStateRepository.saveAuthenticatedAccount(toLocalAccountProfile(account))

    setTokens(access)
    offlineUser.value = null
    clearOfflineExpiryTimer()
    localSyncService.start(access, {
      accountId: account.sub,
      homeWarehouseId: account.warehouseId,
    })
    usePresenceStore().setup()
  }

  // Deactivating a session is also the primitive used by future account
  // switching. It intentionally preserves account-scoped local metadata.
  function deactivateSession() {
    clearOfflineExpiryTimer()
    localSyncService.stop()
    usePresenceStore().teardown()
    accessToken.value = null
    offlineUser.value = null
  }

  function activateOfflineSession(): Promise<boolean> {
    if (offlineActivationPromise) return offlineActivationPromise

    const promise = (async () => {
      const account = await localStateRepository.getOfflineAccount()
      if (!account) return false

      clearOfflineExpiryTimer()
      localSyncService.stop()
      usePresenceStore().teardown()

      // Preserve an authenticated identity throughout the online-to-offline
      // transition. Setting the local user first prevents route guards and
      // application watchers from observing a transient anonymous state.
      offlineUser.value = toJwtPayload(account)
      accessToken.value = null
      scheduleOfflineExpiry(account.lastAuthenticatedAt)

      await localSyncService.activateOfflineAccount({
        accountId: account.accountId,
        homeWarehouseId: account.warehouseId,
      })
      return true
    })().finally(() => {
      if (offlineActivationPromise === promise) offlineActivationPromise = null
    })

    offlineActivationPromise = promise
    return promise
  }

  async function removeLocalAccount(accountId: string | null) {
    const removesActiveAccount = accountId !== null && user.value?.sub === accountId
    if (removesActiveAccount) deactivateSession()
    if (accountId !== null) {
      await localStateRepository.removeAccount(accountId)
      await localSyncService.removeAccount(accountId)
    }
  }

  function refresh(): Promise<boolean> {
    if (refreshPromise) return refreshPromise

    const promise = (async () => {
      const accountId = user.value?.sub ?? (await localStateRepository.getActiveAccountId())
      try {
        // refresh_token is sent automatically via httpOnly cookie
        const tokens = await authApi.refresh()
        await activateSession(tokens.access_token)
        return true
      } catch (error) {
        // A network outage must not evict account-scoped offline metadata.
        // Confirmed refresh rejection is the forced sign-out boundary.
        if (isNetworkFailure(error)) {
          await activateOfflineSession()
        } else {
          deactivateSession()
        }

        if (isUnauthorized(error) && accountId !== null) {
          await removeLocalAccount(accountId)
        }
        return false
      }
    })().finally(() => {
      if (refreshPromise === promise) refreshPromise = null
    })

    refreshPromise = promise
    return promise
  }

  async function logout() {
    const accountId = user.value?.sub ?? null
    try {
      await authApi.logout()
    } catch {
      // Local sign-out must complete even when remote token invalidation is unavailable.
    }
    deactivateSession()
    if (accountId !== null) await removeLocalAccount(accountId)
  }

  function checkUserPermissions(...requiredPermissions: Permission[]): boolean {
    if (!user.value || isOffline.value) return false
    return requiredPermissions.some((permission) => user.value?.permissions?.includes(permission))
  }

  return {
    accessToken,
    user,
    isAuthenticated,
    isOffline,
    canAccessWorkspace,
    sessionMode,
    setTokens,
    activateSession,
    activateOfflineSession,
    deactivateSession,
    removeLocalAccount,
    refresh,
    logout,
    checkUserPermissions,
  }
})
