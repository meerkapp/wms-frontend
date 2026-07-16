import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { jwtDecode } from 'jwt-decode'
import { FetchError } from 'ofetch'
import { authApi } from '@/modules/auth/api/auth.api'
import { usePresenceStore } from '@/modules/employee/stores/presence.store'
import { localSyncService } from '@/modules/sync/services/sync.service'
import type { JwtPayload } from '@/modules/auth/types/auth.types'
import type { Permission } from '@meerkapp/wms-contracts'

export const useAuthStore = defineStore('auth', () => {
  // access_token stored in memory only — never in localStorage (XSS protection)
  // refresh_token stored in httpOnly cookie — JS cannot read it
  const accessToken = ref<string | null>(null)
  let refreshPromise: Promise<boolean> | null = null

  const user = computed<JwtPayload | null>(() => {
    if (!accessToken.value) return null
    try {
      return jwtDecode<JwtPayload>(accessToken.value)
    } catch {
      return null
    }
  })

  const isAuthenticated = computed(() => !!accessToken.value && !!user.value)

  function setTokens(access: string) {
    accessToken.value = access
  }

  function activateSession(access: string) {
    setTokens(access)
    const account = user.value
    if (!account) throw new Error('Cannot activate a session with an invalid access token')
    localSyncService.start(access, {
      accountId: account.sub,
      homeWarehouseId: account.warehouseId,
    })
    usePresenceStore().setup()
  }

  // Deactivating a session is also the primitive used by future account
  // switching. It intentionally preserves account-scoped local metadata.
  function deactivateSession() {
    localSyncService.stop()
    usePresenceStore().teardown()
    accessToken.value = null
  }

  async function removeLocalAccount(accountId: string | null) {
    const removesActiveAccount = accountId !== null && user.value?.sub === accountId
    if (removesActiveAccount) deactivateSession()
    if (accountId !== null) await localSyncService.removeAccount(accountId)
  }

  function refresh(): Promise<boolean> {
    if (refreshPromise) return refreshPromise

    const accountId = user.value?.sub ?? null
    const promise = (async () => {
      try {
        // refresh_token is sent automatically via httpOnly cookie
        const tokens = await authApi.refresh()
        activateSession(tokens.access_token)
        return true
      } catch (error) {
        deactivateSession()
        // A network outage must not evict account-scoped offline metadata.
        // Confirmed refresh rejection is the forced sign-out boundary.
        if (error instanceof FetchError && error.status === 401 && accountId !== null) {
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
    if (!user.value) return false
    return requiredPermissions.some((permission) => user.value?.permissions?.includes(permission))
  }

  return {
    accessToken,
    user,
    isAuthenticated,
    setTokens,
    activateSession,
    deactivateSession,
    removeLocalAccount,
    refresh,
    logout,
    checkUserPermissions,
  }
})
