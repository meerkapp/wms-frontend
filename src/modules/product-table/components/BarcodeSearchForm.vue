<script setup lang="ts">
import { inject, ref, nextTick, type Ref } from 'vue'
import { storeToRefs } from 'pinia'
import { Message, IconField, InputIcon, InputText, Button, Checkbox } from 'primevue'
import type { DynamicDialogInstance } from 'primevue/dynamicdialogoptions'
import { useToast } from 'primevue/usetoast'
import { useI18n } from 'vue-i18n'
import {
  productBarcodeRepository,
  productItemRepository,
} from '@/modules/sync/repositories/product.repository'
import { useNavigationStore } from '@modules/navigation/stores/navigation.store'
import { useProductTableStore } from '@modules/product-table/stores/product-table.store'
import { useAuthStore } from '@/modules/auth/stores/auth.store'

const navigationStore = useNavigationStore()
const { setSelectedItem: setSelectedNavigationItem } = navigationStore
const dialogRef = inject<Ref<DynamicDialogInstance>>('dialogRef')

const productTableStore = useProductTableStore()
const { setSelectedProductItemId, setSelectedFilterPresetKey } = productTableStore
const { quickFilterValue, selectedFilterPresetKey } = storeToRefs(productTableStore)
const { t } = useI18n()
const toast = useToast()
const authStore = useAuthStore()

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
    const localBarcode = await productBarcodeRepository.getByCode(normalizedBarcode)
    const productBarcode =
      localBarcode ??
      (authStore.isOffline
        ? undefined
        : await productBarcodeRepository.fetchByCode(normalizedBarcode))

    if (productBarcode === undefined) {
      isInvalid.value = true
      return
    }

    const localProductItem = await productItemRepository.get(productBarcode.productItemId)
    const productItem =
      localProductItem ??
      (authStore.isOffline
        ? undefined
        : await productItemRepository.fetchById(productBarcode.productItemId))

    if (productItem === undefined) {
      isInvalid.value = true
      return
    }

    quickFilterValue.value = ''
    setSelectedProductItemId(null)
    setSelectedFilterPresetKey('all')

    if (productItem.productCollectionId !== null) {
      setSelectedNavigationItem('product_collection', productItem.productCollectionId)
    } else {
      setSelectedNavigationItem('product_archive', 0)
    }

    await nextTick()
    setSelectedProductItemId(productItem.id)
    dialogRef?.value.close()
  } catch {
    toast.add({ severity: 'error', summary: t('common.error.network'), life: 3000 })
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
    <div class="flex items-center gap-2">
      <Checkbox v-model="openProductProfile" input-id="open_product_profile" binary />
      <label for="open_product_profile" class="cursor-pointer">
        {{ t('product.table.barcodeSearch.openProductProfile') }}
      </label>
    </div>
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
