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
  async onResponseError({ response, options, request }) {
    if (response.status === 401) {
      const auth = useAuthStore()
      const url = typeof request === 'string' ? request : request.url
      if (url.includes('/auth/')) {
        auth.clearTokens()
        return
      }
      const refreshed = await auth.refresh()
      if (!refreshed) {
        await auth.logout()
        router.push({ name: 'login' })
      }
    }
  },
})
