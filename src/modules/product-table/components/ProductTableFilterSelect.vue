<script lang="ts" setup>
import { storeToRefs } from 'pinia'
import { Select } from 'primevue'
import { useProductTableStore } from '@modules/product-table/stores/product-table.store'

const productTableStore = useProductTableStore()
const { filterPresets, setSelectedFilterPresetKey } = productTableStore
const { selectedFilterPresetKey } = storeToRefs(productTableStore)
</script>

<template>
  <Select
    :model-value="selectedFilterPresetKey"
    :options="filterPresets"
    option-value="key"
    option-label="name"
    size="small"
    @update:model-value="setSelectedFilterPresetKey"
  />
</template>
