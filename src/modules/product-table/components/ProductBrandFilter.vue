<script lang="ts" setup>
import type { IFilterParams, IDoesFilterPassParams } from 'ag-grid-community'
import { ref, onBeforeUnmount, onMounted, shallowRef } from 'vue'
import { Select } from 'primevue'
import { useI18n } from 'vue-i18n'
import type { ProductBrand } from '@meerkapp/wms-contracts'
import type { ProductTableItem } from '../types/product-table.type'

const props = defineProps<{ params: IFilterParams }>()
const { t } = useI18n()

const selectedProductBrandName = ref<ProductBrand['name'] | null>(null)
const productBrandOptions = shallowRef<string[]>([])

function updateProductBrandOptions() {
  const values = new Set<string>()
  props.params.api.forEachNode((node) => {
    const value = props.params.api.getCellValue({ rowNode: node, colKey: 'productBrandName' })
    if (value) {
      values.add(value)
    }
  })
  productBrandOptions.value = Array.from(values).sort()
}

function updateFilter() {
  if (selectedProductBrandName.value === '') {
    selectedProductBrandName.value = null
  }
  props.params.filterChangedCallback()
}

function doesFilterPass({ node }: IDoesFilterPassParams<ProductTableItem>) {
  return (
    props.params.api.getCellValue({ rowNode: node, colKey: 'productBrandName' }) ===
    selectedProductBrandName.value
  )
}

function isFilterActive() {
  return selectedProductBrandName.value !== '' && selectedProductBrandName.value !== null
}

function getModel() {}

function setModel() {}

defineExpose({
  updateFilter,
  doesFilterPass,
  isFilterActive,
  getModel,
  setModel,
})

onMounted(() => {
  props.params.api.addEventListener('rowDataUpdated', updateProductBrandOptions)
  updateProductBrandOptions()
})

onBeforeUnmount(() => {
  props.params.api.removeEventListener('rowDataUpdated', updateProductBrandOptions)
})
</script>

<template>
  <div class="m-4">
    <Select
      v-model="selectedProductBrandName"
      :options="productBrandOptions"
      :placeholder="t('product.table.filter.brandPlaceholder')"
      class="w-full"
      @update:model-value="updateFilter"
      showClear
    />
  </div>
</template>
