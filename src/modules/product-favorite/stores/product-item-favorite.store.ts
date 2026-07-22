import { computed, shallowRef, watchEffect } from 'vue'
import { defineStore, storeToRefs } from 'pinia'
import type { ProductItem } from '@meerkapp/wms-contracts'
import { StaleAccountRequestError } from '@/core/api/stale-account-request.error'
import { useAuthStore } from '@/modules/auth/stores/auth.store'
import { subscribeDexieLiveQuery } from '@/modules/sync/composables/dexie-live-query'
import { productItemFavoriteRepository } from '@/modules/sync/repositories/product-item-favorite.repository'
import { localSyncService } from '@/modules/sync/services/sync.service'
import { productItemFavoriteApi } from '../api/product-item-favorite.api'

export const useProductItemFavoriteStore = defineStore('product-item-favorite', () => {
  const authStore = useAuthStore()
  const { user } = storeToRefs(authStore)
  const favoriteProductItemIds = shallowRef<ReadonlySet<ProductItem['id']>>(new Set())
  const pendingKeys = shallowRef<ReadonlySet<string>>(new Set())

  const activeAccountId = computed(() => user.value?.sub ?? null)

  watchEffect((onCleanup) => {
    const accountId = activeAccountId.value
    favoriteProductItemIds.value = new Set()
    if (accountId === null) return

    const unsubscribe = subscribeDexieLiveQuery(
      () => productItemFavoriteRepository.listByAccount(accountId),
      (favorites) => {
        favoriteProductItemIds.value = new Set(favorites.map((favorite) => favorite.productItemId))
      },
    )
    onCleanup(unsubscribe)
  })

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
    if (!authStore.isAuthenticated || authStore.user?.sub !== accountId) {
      throw new StaleAccountRequestError()
    }
  }

  function isFavorite(productItemId: ProductItem['id']) {
    return favoriteProductItemIds.value.has(productItemId)
  }

  function isPending(productItemId: ProductItem['id']) {
    const accountId = activeAccountId.value
    return accountId !== null && pendingKeys.value.has(mutationKey(accountId, productItemId))
  }

  async function setFavorite(productItemId: ProductItem['id'], favorite: boolean) {
    const accountId = activeAccountId.value
    if (accountId === null || !authStore.isAuthenticated) throw new StaleAccountRequestError()

    const key = mutationKey(accountId, productItemId)
    if (pendingKeys.value.has(key)) return false
    updatePending(key, true)

    try {
      if (favorite) {
        const created = await productItemFavoriteApi.add(productItemId, accountId)
        assertActiveOnlineAccount(accountId)
        await localSyncService.applyProductItemFavoriteChange(accountId, {
          ...created,
          isFavorite: true,
        })
      } else {
        await productItemFavoriteApi.remove(productItemId, accountId)
        assertActiveOnlineAccount(accountId)
        await localSyncService.applyProductItemFavoriteChange(accountId, {
          productItemId,
          isFavorite: false,
          createdAt: null,
        })
      }
      return true
    } finally {
      updatePending(key, false)
    }
  }

  return {
    favoriteProductItemIds,
    isFavorite,
    isPending,
    setFavorite,
  }
})
