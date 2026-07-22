<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { ContextMenu } from 'primevue'
import type { MenuItem } from 'primevue/menuitem'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import { useI18n } from 'vue-i18n'
import { StaleAccountRequestError } from '@/core/api/stale-account-request.error'
import { useConnectivityStore } from '@/core/stores/connectivity.store'
import { useAuthStore } from '@/modules/auth/stores/auth.store'
import { useNavigationStore } from '@/modules/navigation/stores/navigation.store'
import { useProductItemFavoriteStore } from '@/modules/product-favorite/stores/product-item-favorite.store'
import { useProductItemArchiveStore } from '@/modules/product-archive/stores/product-item-archive.store'
import { useProductTableStore } from '@/modules/product-table/stores/product-table.store'
import type { ProductTableItem } from '@/modules/product-table/types/product-table.type'

const { t } = useI18n()
const toast = useToast()
const confirm = useConfirm()
const authStore = useAuthStore()
const { isAuthenticated, user } = storeToRefs(authStore)
const { status: connectivityStatus } = storeToRefs(useConnectivityStore())
const { selectedItem } = storeToRefs(useNavigationStore())
const { setSelectedProductItemId } = useProductTableStore()
const productItemFavoriteStore = useProductItemFavoriteStore()
const productItemArchiveStore = useProductItemArchiveStore()

const contextMenu = ref<InstanceType<typeof ContextMenu>>()
const menuItems = ref<MenuItem[]>([])
const canUpdateFavorites = computed(
  () => isAuthenticated.value && connectivityStatus.value === 'online',
)
const canManageArchive = computed(
  () => canUpdateFavorites.value && authStore.checkUserPermissions('product_item:archive'),
)

watch(
  [() => user.value?.sub, connectivityStatus],
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

async function updateArchive(productItem: ProductTableItem, archived: boolean) {
  try {
    const updated = archived
      ? await productItemArchiveStore.archive(productItem.id)
      : await productItemArchiveStore.restore(productItem.id)
    if (!updated) return
    setSelectedProductItemId(null, false)
    toast.add({
      severity: 'success',
      summary: t(
        archived ? 'product.table.archive.archived' : 'product.table.archive.restored',
      ),
      life: 2500,
    })
  } catch (error) {
    if (error instanceof StaleAccountRequestError) return
    const status = (error as { status?: number }).status
    toast.add({
      severity: 'error',
      summary: t(
        status === 409
          ? 'product.table.archive.stockConflict'
          : 'product.table.archive.updateError',
      ),
      life: 3500,
    })
  }
}

function confirmArchive(productItem: ProductTableItem) {
  confirm.require({
    header: t('product.table.archive.confirmTitle'),
    message: t('product.table.archive.confirmMessage', { name: productItem.name }),
    icon: 'iconify tabler--archive',
    rejectProps: { label: t('common.cancel'), severity: 'secondary', variant: 'text' },
    acceptProps: { label: t('product.table.archive.archiveAction'), severity: 'danger' },
    accept: () => void updateArchive(productItem, true),
  })
}

function show(event: MouseEvent, productItem: ProductTableItem) {
  if (selectedItem.value?.type === 'product_archive') {
    if (!canManageArchive.value) return
    menuItems.value = [
      {
        label: t('product.table.archive.restoreAction'),
        icon: 'iconify tabler--archive-off',
        disabled: productItemArchiveStore.isPending(productItem.id),
        command: () => void updateArchive(productItem, false),
      },
    ]
    contextMenu.value?.show(event)
    return
  }

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
    ...(authStore.checkUserPermissions('product_item:archive')
      ? [
          { separator: true },
          {
            label: t('product.table.archive.archiveAction'),
            icon: 'iconify tabler--archive',
            disabled:
              !canManageArchive.value || productItemArchiveStore.isPending(productItem.id),
            command: () => confirmArchive(productItem),
          },
        ]
      : []),
  ]
  contextMenu.value?.show(event)
}

defineExpose({ show })
</script>

<template>
  <ContextMenu ref="contextMenu" :model="menuItems" />
</template>
