<script lang="ts" setup>
import { computed } from 'vue'
import { FloatLabel, Select } from 'primevue'
import { useI18n } from 'vue-i18n'
import { useProductTypes } from '@/modules/sync/composables/read-model.composables'
import type { ProductType } from '@meerkapp/wms-contracts'

const props = defineProps<{
  productTypeId: ProductType['id'] | null
  label?: string
  disabled?: boolean
  invalid?: boolean
}>()

const emit = defineEmits<{
  'update:productTypeId': [value: ProductType['id'] | null]
}>()

const { t } = useI18n()

const productTypes = useProductTypes({ sortByName: true })

const label = computed(() => props.label ?? t('product.type.select.label'))
</script>

<template>
  <FloatLabel variant="on">
    <Select
      inputId="on_product_type"
      :model-value="props.productTypeId"
      :options="productTypes"
      option-label="name"
      option-value="id"
      :disabled="disabled"
      :invalid="invalid"
      fluid
      @update:model-value="(value) => emit('update:productTypeId', value)"
    />
    <label for="on_product_type">{{ label }}</label>
  </FloatLabel>
</template>
