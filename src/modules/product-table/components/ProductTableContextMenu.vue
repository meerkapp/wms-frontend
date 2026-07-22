<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { ContextMenu } from 'primevue'
import type { MenuItem } from 'primevue/menuitem'
import { useToast } from 'primevue/usetoast'
import { useI18n } from 'vue-i18n'
import { StaleAccountRequestError } from '@/core/api/stale-account-request.error'
import { useConnectivityStore } from '@/core/stores/connectivity.store'
import { useAuthStore } from '@/modules/auth/stores/auth.store'
import { useNavigationStore } from '@/modules/navigation/stores/navigation.store'
import { useProductItemFavoriteStore } from '@/modules/product-favorite/stores/product-item-favorite.store'
import { useProductTableStore } from '@/modules/product-table/stores/product-table.store'
import type { ProductTableItem } from '@/modules/product-table/types/product-table.type'

const { t } = useI18n()
const toast = useToast()
const { isAuthenticated, user } = storeToRefs(useAuthStore())
const { status: connectivityStatus } = storeToRefs(useConnectivityStore())
const { selectedItem } = storeToRefs(useNavigationStore())
const { setSelectedProductItemId } = useProductTableStore()
const productItemFavoriteStore = useProductItemFavoriteStore()

const contextMenu = ref<InstanceType<typeof ContextMenu>>()
const menuItems = ref<MenuItem[]>([])
const canUpdateFavorites = computed(
  () => isAuthenticated.value && connectivityStatus.value === 'online',
)

watch(
  () => user.value?.sub,
  () => contextMenu.value?.hide(),
)

async function updateFavorite(productItemId: ProductTableItem['id'], favorite: boolean) {
  try {
    const updated = await productItemFavoriteStore.setFavorite(productItemId, favorite)
    if (!updated) return
    if (!favorite && selectedItem.value?.type === 'product_favorites') {
      setSelectedProductItemId(null, false)
    }
    toast.add({
      severity: 'success',
      summary: t(favorite ? 'product.table.favorites.added' : 'product.table.favorites.removed'),
      life: 2500,
    })
  } catch (error) {
    if (error instanceof StaleAccountRequestError) return
    toast.add({
      severity: 'error',
      summary: t('product.table.favorites.updateError'),
      life: 3000,
    })
  }
}

function show(event: MouseEvent, productItem: ProductTableItem) {
  const favorite = productItemFavoriteStore.isFavorite(productItem.id)
  menuItems.value = [
    {
      label: t(
        favorite ? 'product.table.favorites.removeAction' : 'product.table.favorites.addAction',
      ),
      icon: favorite ? 'iconify tabler--heart-off' : 'iconify tabler--heart-plus',
      disabled: !canUpdateFavorites.value || productItemFavoriteStore.isPending(productItem.id),
      command: () => void updateFavorite(productItem.id, !favorite),
    },
  ]
  contextMenu.value?.show(event)
}

defineExpose({ show })
</script>

<template>
  <ContextMenu ref="contextMenu" :model="menuItems" />
</template>
