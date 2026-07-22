<script lang="ts" setup>
import { storeToRefs } from 'pinia'
import { IconField, InputIcon, Select } from 'primevue'
import { useProductTableStore } from '@modules/product-table/stores/product-table.store'

const productTableStore = useProductTableStore()
const { setSelectedFilterPresetKey } = productTableStore
const { availableFilterPresets, selectedFilterPresetKey } = storeToRefs(productTableStore)
</script>

<template>
  <IconField>
    <InputIcon class="iconify tabler--filter-star" />
    <Select
      :model-value="selectedFilterPresetKey"
      :options="availableFilterPresets"
      option-value="key"
      option-label="name"
      size="small"
      :pt="{ root: 'pl-6' }"
      @update:model-value="setSelectedFilterPresetKey"
    />
  </IconField>
</template>
