import { $fetch } from 'ofetch'
import { ClientUpdateRequiredError } from '@/core/api/client-update-required.error'
import { useConnectivityStore } from '@/core/stores/connectivity.store'
import { useAuthStore } from '@/modules/auth/stores/auth.store'
import router from '@/router'

export const apiClient = $fetch.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  credentials: 'include', // send httpOnly cookie with every request
  async onRequest({ options }) {
    const connectivity = useConnectivityStore()
    if (connectivity.status === 'checking') await connectivity.checkServer()
    if (connectivity.status === 'update-required') throw new ClientUpdateRequiredError()

    const auth = useAuthStore()
    if (auth.accessToken) {
      const headers = new Headers(options.headers as HeadersInit | undefined)
      headers.set('Authorization', `Bearer ${auth.accessToken}`)
      options.headers = headers
    }
  },
  async onResponseError({ response, request, options }) {
    if (response.status === 401) {
      const auth = useAuthStore()
      const url = typeof request === 'string' ? request : request.url
      if (url.includes('/auth/')) {
        // Login/refresh/logout own their account lifecycle. A generic transport
        // hook must not remove local account state on every auth-route 401.
        return
      }

      const retryOptions = options as typeof options & { authRetried?: boolean }
      if (retryOptions.authRetried) {
        await auth.logout()
        await router.push({ name: 'login' })
        return
      }

      const refreshed = await auth.refresh()
      if (!refreshed) {
        if (!auth.canAccessWorkspace) await router.push({ name: 'login' })
        return
      }

      // ofetch evaluates retry options after this hook. Retrying once reruns
      // onRequest, which attaches the freshly issued access token.
      retryOptions.authRetried = true
      retryOptions.retry = 1
      retryOptions.retryStatusCodes = [...new Set([...(retryOptions.retryStatusCodes ?? []), 401])]
    }
  },
})
