import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const auth = vi.hoisted(() => ({
  accessToken: 'old-token' as string | null,
  canAccessWorkspace: false,
  refresh: vi.fn<() => Promise<boolean>>(),
  logout: vi.fn<() => Promise<void>>(),
}))
const routerPush = vi.hoisted(() => vi.fn())

vi.mock('@/modules/auth/stores/auth.store', () => ({
  useAuthStore: () => auth,
}))

vi.mock('@/router', () => ({
  default: { push: routerPush },
}))

function jsonResponse(status: number, data: unknown) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function authorizationHeader(call: Parameters<typeof fetch>) {
  const [request, init] = call
  const headers = new Headers(init?.headers ?? (request instanceof Request ? request.headers : {}))
  return headers.get('Authorization')
}

describe('apiClient authentication retry', () => {
  let fetchMock: ReturnType<typeof vi.fn<typeof fetch>>

  beforeEach(() => {
    auth.accessToken = 'old-token'
    auth.canAccessWorkspace = false
    auth.refresh.mockReset()
    auth.logout.mockReset().mockResolvedValue(undefined)
    routerPush.mockReset().mockResolvedValue(undefined)
    fetchMock = vi.fn<typeof fetch>()
    vi.stubGlobal('fetch', fetchMock)
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('refreshes once and retries the original request with the new access token', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(401, { message: 'Unauthorized' }))
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }))
    auth.refresh.mockImplementationOnce(async () => {
      auth.accessToken = 'new-token'
      return true
    })
    const { apiClient } = await import('./client')

    await expect(apiClient<{ ok: boolean }>('/inventory')).resolves.toEqual({ ok: true })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(authorizationHeader(fetchMock.mock.calls[0]!)).toBe('Bearer old-token')
    expect(authorizationHeader(fetchMock.mock.calls[1]!)).toBe('Bearer new-token')
    expect(auth.refresh).toHaveBeenCalledOnce()
    expect(auth.logout).not.toHaveBeenCalled()
  })

  it('logs out and redirects when the retried request also returns 401', async () => {
    fetchMock.mockImplementation(async () => jsonResponse(401, { message: 'Unauthorized' }))
    auth.refresh.mockResolvedValueOnce(true)
    const { apiClient } = await import('./client')

    await expect(apiClient('/inventory')).rejects.toMatchObject({ status: 401 })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(auth.refresh).toHaveBeenCalledOnce()
    expect(auth.logout).toHaveBeenCalledOnce()
    expect(routerPush).toHaveBeenCalledWith({ name: 'login' })
  })

  it('redirects without retrying when refresh cannot restore the session', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(401, { message: 'Unauthorized' }))
    auth.refresh.mockResolvedValueOnce(false)
    const { apiClient } = await import('./client')

    await expect(apiClient('/inventory')).rejects.toMatchObject({ status: 401 })

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(auth.logout).not.toHaveBeenCalled()
    expect(routerPush).toHaveBeenCalledWith({ name: 'login' })
  })

  it('keeps the offline workspace when refresh falls back to local read-only access', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(401, { message: 'Unauthorized' }))
    auth.refresh.mockImplementationOnce(async () => {
      auth.accessToken = null
      auth.canAccessWorkspace = true
      return false
    })
    const { apiClient } = await import('./client')

    await expect(apiClient('/inventory')).rejects.toMatchObject({ status: 401 })

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(routerPush).not.toHaveBeenCalled()
  })

  it('leaves auth-route 401 lifecycle to the calling auth action', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(401, { message: 'Invalid credentials' }))
    const { apiClient } = await import('./client')

    await expect(apiClient('/auth/login', { method: 'POST' })).rejects.toMatchObject({
      status: 401,
    })

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(auth.refresh).not.toHaveBeenCalled()
    expect(auth.logout).not.toHaveBeenCalled()
    expect(routerPush).not.toHaveBeenCalled()
  })
})
