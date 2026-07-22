import { computed, ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import type { ProductItem } from '@meerkapp/wms-contracts'
import { StaleAccountRequestError } from '@/core/api/stale-account-request.error'
import { useConnectivityStore } from '@/core/stores/connectivity.store'
import { useAuthStore } from '@/modules/auth/stores/auth.store'
import { PRODUCT_TABLE_LIMIT } from '@/modules/product-table/product-table.constants'
import { localSyncService } from '@/modules/sync/services/sync.service'
import { productItemArchiveApi } from '@/modules/product-archive/api/product-item-archive.api'

export const useProductItemArchiveStore = defineStore('product-item-archive', () => {
  const authStore = useAuthStore()
  const connectivityStore = useConnectivityStore()
  const items = shallowRef<ProductItem[]>([])
  const isLoading = ref(false)
  const hasLoadError = ref(false)
  const isTruncated = ref(false)
  const revision = ref(0)
  const pendingKeys = shallowRef<ReadonlySet<string>>(new Set())
  let loadGeneration = 0

  const activeAccountId = computed(() => authStore.user?.sub ?? null)

  function mutationKey(accountId: string, productItemId: ProductItem['id']) {
    return `${accountId}:${productItemId}`
  }

  function updatePending(key: string, pending: boolean) {
    const next = new Set(pendingKeys.value)
    if (pending) next.add(key)
    else next.delete(key)
    pendingKeys.value = next
  }

  function assertActiveOnlineAccount(accountId: string) {
    if (
      !authStore.isAuthenticated ||
      authStore.user?.sub !== accountId ||
      connectivityStore.status !== 'online'
    ) {
      throw new StaleAccountRequestError()
    }
  }

  function clear() {
    loadGeneration += 1
    items.value = []
    isLoading.value = false
    hasLoadError.value = false
    isTruncated.value = false
  }

  async function load(ensureItem?: ProductItem) {
    const accountId = activeAccountId.value
    if (
      accountId === null ||
      !authStore.isAuthenticated ||
      connectivityStore.status !== 'online'
    ) {
      clear()
      return false
    }

    const generation = ++loadGeneration
    isLoading.value = true
    hasLoadError.value = false

    try {
      const result = await productItemArchiveApi.listBounded(accountId)
      assertActiveOnlineAccount(accountId)
      if (generation !== loadGeneration) return false

      const nextItems: ProductItem[] = [...result.items]
      if (ensureItem && !nextItems.some((item) => item.id === ensureItem.id)) {
        if (nextItems.length >= PRODUCT_TABLE_LIMIT) nextItems.pop()
        nextItems.push(ensureItem)
        nextItems.sort((left, right) =>
          left.sku === right.sku ? left.id - right.id : left.sku.localeCompare(right.sku),
        )
      }
      items.value = nextItems
      isTruncated.value = result.truncated
      return true
    } catch (error) {
      if (error instanceof StaleAccountRequestError) return false
      if (generation === loadGeneration) {
        items.value = []
        isTruncated.value = false
        hasLoadError.value = true
      }
      return false
    } finally {
      if (generation === loadGeneration) isLoading.value = false
    }
  }

  function invalidate() {
    revision.value += 1
  }

  function isPending(productItemId: ProductItem['id']) {
    const accountId = activeAccountId.value
    return accountId !== null && pendingKeys.value.has(mutationKey(accountId, productItemId))
  }

  async function archive(productItemId: ProductItem['id']) {
    const accountId = activeAccountId.value
    if (accountId === null) throw new StaleAccountRequestError()
    assertActiveOnlineAccount(accountId)

    const key = mutationKey(accountId, productItemId)
    if (pendingKeys.value.has(key)) return false
    updatePending(key, true)
    try {
      await productItemArchiveApi.archive(productItemId, accountId)
      assertActiveOnlineAccount(accountId)
      await localSyncService.applyServerDelete('product_item', productItemId)
      assertActiveOnlineAccount(accountId)
      invalidate()
      return true
    } finally {
      updatePending(key, false)
    }
  }

  async function restore(productItemId: ProductItem['id']) {
    const accountId = activeAccountId.value
    if (accountId === null) throw new StaleAccountRequestError()
    assertActiveOnlineAccount(accountId)

    const key = mutationKey(accountId, productItemId)
    if (pendingKeys.value.has(key)) return false
    updatePending(key, true)
    try {
      const restored = await productItemArchiveApi.restore(productItemId, accountId)
      assertActiveOnlineAccount(accountId)
      await localSyncService.applyServerUpsert('product_item', restored)
      assertActiveOnlineAccount(accountId)
      items.value = items.value.filter((item) => item.id !== productItemId)
      invalidate()
      return true
    } finally {
      updatePending(key, false)
    }
  }

  return {
    items,
    isLoading,
    hasLoadError,
    isTruncated,
    revision,
    isPending,
    load,
    clear,
    archive,
    restore,
  }
})
