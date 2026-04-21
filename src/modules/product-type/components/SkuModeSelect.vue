<script setup lang="ts">
import { computed } from 'vue'
import { Select } from 'primevue'
import { useI18n } from 'vue-i18n'

defineOptions({ inheritAttrs: false })

const model = defineModel<string>()
const { t } = useI18n()

const modes = computed(() => [
  {
    value: 'GLOBAL',
    label: t('product.type.form.skuModes.global'),
    description: t('product.type.form.skuModeDescriptions.global'),
  },
  {
    value: 'CUSTOM',
    label: t('product.type.form.skuModes.custom'),
    description: t('product.type.form.skuModeDescriptions.custom'),
  },
])
</script>

<template>
  <Select
    v-model="model"
    v-bind="$attrs"
    :options="modes"
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
