<script lang="ts" setup>
import { InputGroup, InputGroupAddon, Button } from 'primevue'
import { useI18n } from 'vue-i18n'
import ProductTableSearch from '@/modules/product-table/components/ProductTableSearch.vue'
import { storeToRefs } from 'pinia'
import { useNavigationStore } from '@modules/navigation/stores/navigation.store'
import { useAppDialog } from '@core/composables/useAppDialog'
import BarcodeSearchForm from '@modules/product-table/components/BarcodeSearchForm.vue'

const navigationStore = useNavigationStore()
const { selectedItem: selectedNavigationItem } = storeToRefs(navigationStore)
const value = defineModel<string>('value', { default: '' })

const dialog = useAppDialog()
const { t } = useI18n()

function openBarcodeSearchDialog() {
  dialog.open(BarcodeSearchForm, {
    props: {
      header: t('product.table.barcodeSearch.title'),
      modal: true,
      style: { width: '25rem' },
    },
  })
}
</script>

<template>
  <div class="h-10 w-full">
    <InputGroup v-if="selectedNavigationItem !== null" class="h-full">
      <InputGroupAddon>
        <Button icon="iconify tabler--filter-search text-primary" severity="secondary" />
      </InputGroupAddon>

      <ProductTableSearch v-model:value="value" />

      <InputGroupAddon>
        <Button
          icon="iconify tabler--barcode text-primary"
          severity="secondary"
          v-tooltip.bottom="t('product.table.barcodeSearch.title')"
          @click="openBarcodeSearchDialog"
        />
      </InputGroupAddon>
    </InputGroup>
    <Button
      v-else
      icon="iconify tabler--barcode"
      :label="t('product.table.barcodeSearch.title')"
      severity="secondary"
      :pt="{ root: 'h-full text-primary! border-1 border-surface!' }"
      fluid
      rounded
      @click="openBarcodeSearchDialog"
    />
  </div>
</template>
