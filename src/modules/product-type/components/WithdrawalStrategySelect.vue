<script setup lang="ts">
import { computed } from 'vue'
import { Select } from 'primevue'
import { useI18n } from 'vue-i18n'

defineOptions({ inheritAttrs: false })

const model = defineModel<string>()
const { t } = useI18n()

const strategies = computed(() => [
  {
    value: 'FIFO',
    label: t('product.type.form.withdrawalStrategies.fifo.label'),
    description: t('product.type.form.withdrawalStrategies.fifo.description'),
  },
  {
    value: 'LIFO',
    label: t('product.type.form.withdrawalStrategies.lifo.label'),
    description: t('product.type.form.withdrawalStrategies.lifo.description'),
  },
  {
    value: 'FEFO',
    label: t('product.type.form.withdrawalStrategies.fefo.label'),
    description: t('product.type.form.withdrawalStrategies.fefo.description'),
  },
  {
    value: 'MANUAL',
    label: t('product.type.form.withdrawalStrategies.manual.label'),
    description: t('product.type.form.withdrawalStrategies.manual.description'),
  },
])
</script>

<template>
  <Select
    v-model="model"
    v-bind="$attrs"
    :options="strategies"
    option-label="label"
    option-value="value"
    class="w-full"
  >
    <template #option="{ option }">
      <div class="flex flex-col py-0.5">
        <span class="font-semibold text-sm">{{ option.label }}</span>
        <span class="text-xs text-surface-400 mt-0.5 leading-snug">{{ option.description }}</span>
      </div>
    </template>
  </Select>
</template>
