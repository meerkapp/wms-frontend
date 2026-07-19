import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const dependencies = vi.hoisted(() => ({
  getAccountAvatarCache: vi.fn(),
  cacheAccountAvatar: vi.fn(),
  replaceAccountAvatar: vi.fn(),
  removeAccountAvatar: vi.fn(),
}))

vi.mock('@/modules/sync/repositories/local-state.repository', () => ({
  localStateRepository: dependencies,
}))

import { useAccountAvatarStore } from './account-avatar.store'

const sourceUrl = 'http://storage.test/avatar.png'
const cachedBlob = new Blob(['cached-avatar'], { type: 'image/png' })
let objectUrlSequence = 0
let createObjectUrl: ReturnType<typeof vi.fn>
let revokeObjectUrl: ReturnType<typeof vi.fn>

beforeEach(() => {
  setActivePinia(createPinia())
  objectUrlSequence = 0
  createObjectUrl = vi.fn(() => `blob:avatar-${++objectUrlSequence}`)
  revokeObjectUrl = vi.fn()
  vi.stubGlobal('URL', {
    createObjectURL: createObjectUrl,
    revokeObjectURL: revokeObjectUrl,
  })
  vi.stubGlobal('fetch', vi.fn())

  for (const dependency of Object.values(dependencies)) dependency.mockReset()
  dependencies.cacheAccountAvatar.mockResolvedValue(true)
  dependencies.replaceAccountAvatar.mockResolvedValue(undefined)
  dependencies.removeAccountAvatar.mockResolvedValue(undefined)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('account avatar store', () => {
  it('restores a cached avatar offline without requesting its remote URL', async () => {
    dependencies.getAccountAvatarCache.mockResolvedValue({
      sourceUrl,
      blob: cachedBlob,
      cachedAt: Date.now(),
    })
    const store = useAccountAvatarStore()

    await store.load({ accountId: 'account-a', sourceUrl, allowRemote: false })

    expect(store.displayUrl).toBe('blob:avatar-1')
    expect(fetch).not.toHaveBeenCalled()
    store.clear()
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:avatar-1')
  })

  it('downloads and stores a valid remote avatar while online', async () => {
    dependencies.getAccountAvatarCache.mockResolvedValue(null)
    vi.mocked(fetch).mockResolvedValue(new Response(cachedBlob, { status: 200 }))
    const store = useAccountAvatarStore()

    await store.load({ accountId: 'account-a', sourceUrl, allowRemote: true })

    expect(fetch).toHaveBeenCalledWith(sourceUrl, { cache: 'no-store', credentials: 'omit' })
    expect(dependencies.cacheAccountAvatar).toHaveBeenCalledWith(
      'account-a',
      sourceUrl,
      expect.objectContaining({ type: 'image/png', size: cachedBlob.size }),
    )
    expect(store.displayUrl).toBe('blob:avatar-1')
  })

  it('updates and removes the active account avatar immediately', async () => {
    dependencies.getAccountAvatarCache.mockResolvedValue(null)
    const store = useAccountAvatarStore()
    await store.load({ accountId: 'account-a', sourceUrl, allowRemote: false })

    await store.replaceAvatar('account-a', sourceUrl, cachedBlob)
    expect(store.displayUrl).toBe('blob:avatar-1')
    expect(dependencies.replaceAccountAvatar).toHaveBeenCalledWith(
      'account-a',
      sourceUrl,
      cachedBlob,
    )

    await store.removeAvatar('account-a')
    expect(store.displayUrl).toBeNull()
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:avatar-1')
    expect(dependencies.removeAccountAvatar).toHaveBeenCalledWith('account-a')
  })
})
