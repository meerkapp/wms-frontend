<script lang="ts" setup>
import { Fieldset } from 'primevue'
import { useI18n } from 'vue-i18n'

const ROLE_COLORS = [
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#eab308',
  '#84cc16',
  '#22c55e',
  '#14b8a6',
  '#06b6d4',
  '#3b82f6',
  '#6366f1',
  '#a855f7',
  '#ec4899',
]

const model = defineModel<string>({ default: '' })
const { t } = useI18n()
</script>

<template>
  <Fieldset :legend="t('role.form.color')" pt:legendlabel="text-sm font-normal! text-muted-color">
    <div class="grid grid-cols-6 gap-3 mx-auto">
      <button
        v-for="color in ROLE_COLORS"
        :key="color"
        type="button"
        class="w-6 h-6 rounded-full transition-transform hover:scale-110 focus:outline-none"
        :style="{ backgroundColor: color }"
        :class="model === color ? 'ring-1 ring-offset-1 ring-current scale-110' : ''"
        :aria-label="color"
        @click="model = color"
      />
    </div>
  </Fieldset>
</template>
