<script setup lang="ts">
import { inject, ref, nextTick, type Ref } from 'vue'
import { storeToRefs } from 'pinia'
import { Message, IconField, InputIcon, InputText, Button, Checkbox } from 'primevue'
import type { DynamicDialogInstance } from 'primevue/dynamicdialogoptions'
import { useAppToast } from '@/core/composables/useAppToast'
import { useI18n } from 'vue-i18n'
import {
  productBarcodeRepository,
  productItemRepository,
} from '@/modules/sync/repositories/product.repository'
import { useNavigationStore } from '@modules/navigation/stores/navigation.store'
import { useProductTableStore } from '@modules/product-table/stores/product-table.store'
import { useAuthStore } from '@/modules/auth/stores/auth.store'
import { productItemArchiveApi } from '@/modules/product-archive/api/product-item-archive.api'
import { useProductItemArchiveStore } from '@/modules/product-archive/stores/product-item-archive.store'
import { localSyncService } from '@/modules/sync/services/sync.service'
import { UNASSIGNED_PRODUCT_COLLECTION_ID } from '@/modules/navigation/navigation.constants'

const navigationStore = useNavigationStore()
const { setSelectedItem: setSelectedNavigationItem } = navigationStore
const dialogRef = inject<Ref<DynamicDialogInstance>>('dialogRef')

const productTableStore = useProductTableStore()
const { setSelectedProductItemId, setSelectedFilterPresetKey } = productTableStore
const { quickFilterValue, selectedFilterPresetKey } = storeToRefs(productTableStore)
const { t } = useI18n()
const toast = useAppToast()
const authStore = useAuthStore()
const productItemArchiveStore = useProductItemArchiveStore()

const barcode = ref('')
const isInvalid = ref(false)
const isSearching = ref(false)
// TODO(product-profile): honor this option once the product profile is implemented.
const openProductProfile = ref(false)

async function findByBarcode() {
  const normalizedBarcode = barcode.value.trim()
  if (normalizedBarcode === '' || isSearching.value) return

  isSearching.value = true
  isInvalid.value = false

  try {
    const accountId = authStore.user?.sub ?? null
    const productItem = authStore.isOffline
      ? await (async () => {
          const productBarcode = await productBarcodeRepository.getByCode(normalizedBarcode)
          return productBarcode
            ? productItemRepository.get(productBarcode.productItemId)
            : undefined
        })()
      : accountId === null
        ? undefined
        : await productItemArchiveApi.findByBarcode(normalizedBarcode, accountId)

    if (productItem === undefined) {
      isInvalid.value = true
      return
    }

    quickFilterValue.value = ''
    setSelectedProductItemId(null)
    setSelectedFilterPresetKey('all')

    if (productItem.archivedAt !== null) {
      setSelectedNavigationItem('product_archive', 0)
      // Let the archive watcher start its regular load first. The ensured load
      // must be the latest one so a match beyond the bounded page stays visible.
      await nextTick()
      const loaded = await productItemArchiveStore.load(productItem)
      if (!loaded) throw new Error('Could not load archived products')
    } else {
      if (!authStore.isOffline) {
        await localSyncService.applyServerUpsert('product_item', productItem)
      }
      setSelectedNavigationItem(
        'product_collection',
        productItem.productCollectionId ?? UNASSIGNED_PRODUCT_COLLECTION_ID,
      )
    }

    await nextTick()
    setSelectedProductItemId(productItem.id)
    dialogRef?.value.close()
  } catch (error) {
    if ((error as { status?: number }).status === 404) {
      isInvalid.value = true
      return
    }
    toast.error(t('common.error.network'))
  } finally {
    isSearching.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div>
      <IconField>
        <InputIcon>
          <i class="iconify tabler--barcode" />
        </InputIcon>
        <InputText
          v-model="barcode"
          :placeholder="t('product.table.barcodeSearch.input')"
          autocomplete="off"
          :invalid="isInvalid"
          :pt="{ root: 'w-full' }"
          autofocus
          @keyup.enter="findByBarcode"
        />
      </IconField>
      <Message v-if="isInvalid" size="small" severity="error" variant="simple" class="mt-1">
        {{ t('product.table.barcodeSearch.notFound') }}
      </Message>
    </div>
    <!-- <div class="flex items-center gap-2">
      <Checkbox v-model="openProductProfile" input-id="open_product_profile" binary />
      <label for="open_product_profile" class="cursor-pointer">
        {{ t('product.table.barcodeSearch.openProductProfile') }}
      </label>
    </div> -->
    <Message v-if="selectedFilterPresetKey !== 'all'" size="small" severity="info">
      {{ t('product.table.barcodeSearch.resetFiltersHint') }}
    </Message>
    <Button
      type="button"
      :label="t('product.table.barcodeSearch.submit')"
      icon="pi pi-search"
      :loading="isSearching"
      :disabled="barcode.trim() === ''"
      fluid
      rounded
      @click="findByBarcode"
    />
  </div>
</template>
