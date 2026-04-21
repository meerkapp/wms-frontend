<script setup lang="ts">
import { computed, inject, watch, type Ref } from 'vue'
import { Button, FloatLabel, InputText, Select, Message } from 'primevue'
import type { DynamicDialogInstance } from 'primevue/dynamicdialogoptions'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import { useI18n } from 'vue-i18n'
import { CHARACTERISTIC_KEY_REGEX, generateKeyFromLabel } from '../utils/characteristic'

const dialogRef = inject<Ref<DynamicDialogInstance>>('dialogRef')
const { t } = useI18n()

const characteristicTypes = computed(() => [
  {
    label: t('product.type.form.characteristicTypes.number'),
    value: 'number',
    icon: 'iconify tabler--numbers',
  },
  {
    label: t('product.type.form.characteristicTypes.select'),
    value: 'select',
    icon: 'iconify tabler--list',
  },
  {
    label: t('product.type.form.characteristicTypes.toggle'),
    value: 'toggle',
    icon: 'iconify tabler--toggle-left',
  },
  {
    label: t('product.type.form.characteristicTypes.checkbox'),
    value: 'checkbox',
    icon: 'iconify tabler--checkbox',
  },
])

const selectedTypeOption = computed(
  () => characteristicTypes.value.find((ct) => ct.value === type.value),
)

const validationSchema = computed(() =>
  toTypedSchema(
    z.object({
      label: z.string().min(1, t('product.type.form.validation.characteristicLabelRequired')),
      key: z
        .string()
        .min(1, t('product.type.form.validation.characteristicKeyRequired'))
        .regex(CHARACTERISTIC_KEY_REGEX, t('product.type.form.validation.characteristicKeyInvalid')),
      type: z.enum(['number', 'select', 'toggle', 'checkbox']),
    }),
  ),
)

const { handleSubmit, errors, defineField, resetForm, setFieldValue } = useForm({
  validationSchema,
  initialValues: {
    label: '',
    key: '',
    type: 'number' as 'number' | 'select' | 'toggle' | 'checkbox',
  },
})

const [label, labelAttrs] = defineField('label')
const [key, keyAttrs] = defineField('key')
const [type] = defineField('type')

watch(label, (val) => {
  if (!val) return
  setFieldValue('key', generateKeyFromLabel(val))
})

const onSubmit = handleSubmit((values) => {
  dialogRef?.value.close(values)
  resetForm()
})
</script>

<template>
  <div class="flex flex-col gap-4 pt-1">
    <div class="flex flex-col gap-1">
      <FloatLabel variant="on">
        <InputText
          id="add_char_label"
          v-model="label"
          v-bind="labelAttrs"
          :invalid="!!errors.label"
          fluid
        />
        <label for="add_char_label">{{ t('product.type.form.characteristic.label') }}</label>
      </FloatLabel>
      <Message v-if="errors.label" size="small" severity="error" variant="simple">{{
        errors.label
      }}</Message>
    </div>

    <div class="flex flex-col gap-1">
      <FloatLabel variant="on">
        <InputText
          id="add_char_key"
          v-model="key"
          v-bind="keyAttrs"
          :invalid="!!errors.key"
          fluid
        />
        <label for="add_char_key">{{ t('product.type.form.characteristic.key') }}</label>
      </FloatLabel>
      <Message v-if="errors.key" size="small" severity="error" variant="simple">{{
        errors.key
      }}</Message>
    </div>

    <div class="flex flex-col gap-1">
      <FloatLabel variant="on">
        <Select
          id="add_char_type"
          v-model="type"
          :options="characteristicTypes"
          option-label="label"
          option-value="value"
          class="w-full"
        >
          <template #value="{ value }">
            <div v-if="value" class="flex items-center gap-2">
              <i :class="selectedTypeOption?.icon" class="text-muted-color" />
              <span>{{ selectedTypeOption?.label }}</span>
            </div>
          </template>
          <template #option="{ option }">
            <div class="flex items-center gap-2">
              <i :class="option.icon" class="text-muted-color" />
              <span>{{ option.label }}</span>
            </div>
          </template>
        </Select>
        <label for="add_char_type">{{ t('product.type.form.characteristic.type') }}</label>
      </FloatLabel>
    </div>

    <div class="flex justify-end">
      <Button
        :label="t('common.add')"
        icon="iconify tabler--plus"
        rounded
        fluid
        @click="onSubmit"
      />
    </div>
  </div>
</template>
