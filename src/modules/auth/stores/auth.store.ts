import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { jwtDecode } from 'jwt-decode'
import { authApi } from '@/modules/auth/api/auth.api'
import type { JwtPayload } from '@/modules/auth/types/auth.types'
import type { Permission } from '@meerkapp/wms-contracts'

export const useAuthStore = defineStore('auth', () => {
  // access_token stored in memory only — never in localStorage (XSS protection)
  // refresh_token stored in httpOnly cookie — JS cannot read it
  const accessToken = ref<string | null>(null)

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

  function clearTokens() {
    accessToken.value = null
  }

  async function refresh(): Promise<boolean> {
    try {
      // refresh_token is sent automatically via httpOnly cookie
      const tokens = await authApi.refresh()
      setTokens(tokens.access_token)
      return true
    } catch {
      clearTokens()
      return false
    }
  }

  async function logout() {
    try {
      // backend clears the httpOnly cookie
      await authApi.logout()
    } catch {}
    clearTokens()
  }

  function checkUserPermissions(...requiredPermissions: Permission[]): boolean {
    if (!user.value) return false
    return requiredPermissions.every((permission) => user.value?.permissions?.includes(permission))
  }

  return {
    accessToken,
    user,
    isAuthenticated,
    setTokens,
    clearTokens,
    refresh,
    logout,
    checkUserPermissions,
  }
})
