import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { localStateRepository } from '@/modules/sync/repositories/local-state.repository'

const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024
const SUPPORTED_AVATAR_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])

interface AccountAvatarContext {
  accountId: string | null
  sourceUrl: string | null
  allowRemote: boolean
}

function isSupportedAvatar(blob: Blob) {
  return blob.size <= MAX_AVATAR_SIZE_BYTES && SUPPORTED_AVATAR_TYPES.has(blob.type)
}

export const useAccountAvatarStore = defineStore('account-avatar', () => {
  const cachedObjectUrl = ref<string | null>(null)
  const remoteFallbackUrl = ref<string | null>(null)
  let activeAccountId: string | null = null
  let activeSourceUrl: string | null = null
  let loadSequence = 0

  const displayUrl = computed(() => cachedObjectUrl.value ?? remoteFallbackUrl.value)

  function revokeCachedObjectUrl() {
    if (cachedObjectUrl.value !== null) URL.revokeObjectURL(cachedObjectUrl.value)
    cachedObjectUrl.value = null
  }

  function applyCachedBlob(blob: Blob) {
    revokeCachedObjectUrl()
    cachedObjectUrl.value = URL.createObjectURL(blob)
  }

  async function fetchAndCacheAvatar(accountId: string, sourceUrl: string, sequence: number) {
    try {
      const response = await fetch(sourceUrl, { cache: 'no-store', credentials: 'omit' })
      if (!response.ok) return

      const blob = await response.blob()
      if (!isSupportedAvatar(blob)) return

      const stored = await localStateRepository.cacheAccountAvatar(accountId, sourceUrl, blob)
      if (
        stored &&
        sequence === loadSequence &&
        activeAccountId === accountId &&
        activeSourceUrl === sourceUrl
      ) {
        applyCachedBlob(blob)
      }
    } catch (error) {
      console.warn('[account-avatar:cache]', error)
    }
  }

  async function load(context: AccountAvatarContext) {
    const sequence = ++loadSequence
    const contextChanged =
      activeAccountId !== context.accountId || activeSourceUrl !== context.sourceUrl

    activeAccountId = context.accountId
    activeSourceUrl = context.sourceUrl
    remoteFallbackUrl.value = context.allowRemote ? context.sourceUrl : null

    if (contextChanged) revokeCachedObjectUrl()
    if (context.accountId === null || context.sourceUrl === null) return

    const cachedAvatar = await localStateRepository.getAccountAvatarCache(context.accountId)
    if (sequence !== loadSequence) return

    if (cachedAvatar?.sourceUrl === context.sourceUrl && cachedObjectUrl.value === null) {
      applyCachedBlob(cachedAvatar.blob)
    }

    if (context.allowRemote) {
      await fetchAndCacheAvatar(context.accountId, context.sourceUrl, sequence)
    }
  }

  async function replaceAvatar(accountId: string, sourceUrl: string, blob: Blob) {
    if (!isSupportedAvatar(blob)) return
    await localStateRepository.replaceAccountAvatar(accountId, sourceUrl, blob)

    if (activeAccountId === accountId) {
      activeSourceUrl = sourceUrl
      remoteFallbackUrl.value = sourceUrl
      applyCachedBlob(blob)
    }
  }

  async function removeAvatar(accountId: string) {
    await localStateRepository.removeAccountAvatar(accountId)
    if (activeAccountId !== accountId) return

    activeSourceUrl = null
    remoteFallbackUrl.value = null
    revokeCachedObjectUrl()
  }

  function clear() {
    loadSequence += 1
    activeAccountId = null
    activeSourceUrl = null
    remoteFallbackUrl.value = null
    revokeCachedObjectUrl()
  }

  return {
    displayUrl,
    load,
    replaceAvatar,
    removeAvatar,
    clear,
  }
})
