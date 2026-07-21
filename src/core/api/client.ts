import { $fetch, type FetchOptions, type FetchRequest } from 'ofetch'
import { ClientUpdateRequiredError } from '@/core/api/client-update-required.error'
import { StaleAccountRequestError } from '@/core/api/stale-account-request.error'
import { useConnectivityStore } from '@/core/stores/connectivity.store'
import { useAuthStore } from '@/modules/auth/stores/auth.store'
import router from '@/router'

type AuthMode = 'account' | 'device'

interface AuthAwareFetchOptions extends FetchOptions<'json'> {
  authMode?: AuthMode
  authAccountId?: string | null
  authRetried?: boolean
}

function assertAccountContext(options: AuthAwareFetchOptions) {
  if ((options.authMode ?? 'account') === 'device') return
  const activeAccountId = useAuthStore().user?.sub ?? null
  if (options.authAccountId !== activeAccountId) throw new StaleAccountRequestError()
}

async function navigateAfterAccountLoss() {
  const accountIds = await useAuthStore().listAvailableAccountIds()
  await router.push({ name: accountIds.length > 0 ? 'account-selection' : 'login' })
}

const fetchClient = $fetch.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  credentials: 'include', // send httpOnly cookie with every request
  async onRequest({ options }) {
    const connectivity = useConnectivityStore()
    if (connectivity.status === 'checking') await connectivity.checkServer()
    if (connectivity.status === 'update-required') throw new ClientUpdateRequiredError()

    const auth = useAuthStore()
    const authOptions = options as AuthAwareFetchOptions
    if ((authOptions.authMode ?? 'account') === 'device') return

    if (authOptions.authAccountId === undefined) {
      authOptions.authAccountId = auth.user?.sub ?? null
    } else {
      assertAccountContext(authOptions)
    }
    if (auth.accessToken) {
      const headers = new Headers(options.headers as HeadersInit | undefined)
      headers.set('Authorization', `Bearer ${auth.accessToken}`)
      options.headers = headers
    }
  },
  onResponse({ options }) {
    assertAccountContext(options as AuthAwareFetchOptions)
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

      const retryOptions = options as AuthAwareFetchOptions
      if ((retryOptions.authMode ?? 'account') === 'device') return
      if (retryOptions.authAccountId !== (auth.user?.sub ?? null)) return
      if (retryOptions.authAccountId === null) return
      if (retryOptions.authRetried) {
        await auth.logout()
        await navigateAfterAccountLoss()
        return
      }

      const refreshed = await auth.refresh()
      if (!refreshed) {
        if (!auth.canAccessWorkspace) await navigateAfterAccountLoss()
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

export function apiClient<T>(request: FetchRequest, options?: AuthAwareFetchOptions): Promise<T> {
  return fetchClient<T>(request, options)
}
