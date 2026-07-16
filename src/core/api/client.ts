import { $fetch } from 'ofetch'
import { useAuthStore } from '@/modules/auth/stores/auth.store'
import router from '@/router'

export const apiClient = $fetch.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  credentials: 'include', // send httpOnly cookie with every request
  async onRequest({ options }) {
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
        await router.push({ name: 'login' })
        return
      }

      // ofetch evaluates retry options after this hook. Retrying once reruns
      // onRequest, which attaches the freshly issued access token.
      retryOptions.authRetried = true
      retryOptions.retry = 1
      retryOptions.retryStatusCodes = [
        ...new Set([...(retryOptions.retryStatusCodes ?? []), 401]),
      ]
    }
  },
})
