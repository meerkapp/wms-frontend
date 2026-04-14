<script lang="ts" setup>
import { Button, FloatLabel, InputGroup, Password } from 'primevue'
import { useI18n } from 'vue-i18n'

withDefaults(
  defineProps<{
    modelValue: string | undefined
    label: string
    inputId: string
    invalid?: boolean
    showGenerate?: boolean
  }>(),
  { invalid: false, showGenerate: true },
)

const emit = defineEmits<{ 'update:modelValue': [string] }>()

const { t } = useI18n()

function generatePassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
  return Array.from(crypto.getRandomValues(new Uint8Array(12)))
    .map((n) => chars[n % chars.length])
    .join('')
}
</script>

<template>
  <FloatLabel variant="on">
    <InputGroup>
      <Password
        :id="inputId"
        :model-value="modelValue"
        :invalid="invalid"
        :feedback="false"
        toggle-mask
        fluid
        @update:model-value="emit('update:modelValue', $event)"
      />
      <Button
        v-if="showGenerate"
        type="button"
        variant="outlined"
        icon="iconify tabler--hexagon-asterisk"
        v-tooltip.bottom="t('employee.form.generatePassword')"
        @click="emit('update:modelValue', generatePassword())"
      />
    </InputGroup>
    <label :for="inputId">{{ label }}</label>
  </FloatLabel>
</template>
