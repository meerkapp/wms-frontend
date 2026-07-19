<script setup lang="ts">
import { computed, ref, nextTick } from 'vue'
import { storeToRefs } from 'pinia'
import { Message, IconField, InputIcon, InputText, Button, SelectButton } from 'primevue'
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

const productTableStore = useProductTableStore()
const { setSelectedProductItemId, setSelectedFilterPresetKey } = productTableStore
const { selectedFilterPresetKey } = storeToRefs(productTableStore)
const { t } = useI18n()
const authStore = useAuthStore()

const barcode = ref('')
const isInvalid = ref(false)
const searchResultTypes = computed(() => [
  { label: t('product.table.barcodeSearch.showInTable'), value: 'show-in-table' },
  { label: t('product.table.barcodeSearch.openProductProfile'), value: 'open-product-profile' },
])
const selectedSearchResultType = ref('show-in-table')

function findByBarcode() {
  setSelectedProductItemId(null)
  setSelectedFilterPresetKey('all')

  nextTick(async () => {
    const localBarcode = await productBarcodeRepository.getByCode(barcode.value)
    const productBarcode =
      localBarcode ??
      (authStore.isOffline ? undefined : await productBarcodeRepository.fetchByCode(barcode.value))

    if (productBarcode === undefined) {
      isInvalid.value = true
    } else {
      const localProductItem = await productItemRepository.get(productBarcode.productItemId)
      const productItem =
        localProductItem ??
        (authStore.isOffline
          ? undefined
          : await productItemRepository.fetchById(productBarcode.productItemId))

      if (productItem !== undefined) {
        if (productItem.productCollectionId) {
          setSelectedNavigationItem('product_collection', productItem.productCollectionId)
        } else if (productItem.productCollectionId === null) {
          setSelectedNavigationItem('product_archive', 0)
        }

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setSelectedProductItemId(productItem.id)
          })
        })
      }
    }
  })
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
    <SelectButton
      v-model="selectedSearchResultType"
      :options="searchResultTypes"
      optionLabel="label"
      optionValue="value"
      size="small"
      fluid
    />
    <Message
      v-if="selectedSearchResultType === 'show-in-table' && selectedFilterPresetKey !== 'all'"
      size="small"
      severity="info"
    >
      {{ t('product.table.barcodeSearch.resetFiltersHint') }}
    </Message>
    <Button
      type="button"
      :label="t('product.table.barcodeSearch.submit')"
      icon="pi pi-search"
      :disabled="barcode === ''"
      fluid
      rounded
      @click="findByBarcode"
    />
  </div>
</template>
