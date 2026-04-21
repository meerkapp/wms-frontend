<script setup lang="ts">
import { inject, type Ref } from 'vue'
import { Button, FloatLabel, InputNumber, Message } from 'primevue'
import type { DynamicDialogInstance } from 'primevue/dynamicdialogoptions'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import { useI18n } from 'vue-i18n'
import { formatSkuToken } from '../utils/sku'

const dialogRef = inject<Ref<DynamicDialogInstance>>('dialogRef')
const { t } = useI18n()

const tokenKey = () => (dialogRef?.value.data?.tokenKey as string) ?? ''

const validationSchema = toTypedSchema(
  z.object({
    length: z
      .number()
      .int()
      .min(1, t('product.type.form.skuTokenDialog.lengthInvalid'))
      .optional()
      .nullable(),
  }),
)

const { handleSubmit, errors, defineField } = useForm({
  validationSchema,
  initialValues: { length: null as number | null },
})

const [length, lengthAttrs] = defineField('length')

const onAdd = handleSubmit((formValues) => {
  dialogRef?.value.close({ token: formatSkuToken(tokenKey(), formValues.length) })
})
</script>

<template>
  <div class="flex flex-col gap-4 pt-1">
    <div class="flex flex-col gap-1">
      <FloatLabel variant="on">
        <InputNumber
          id="token_length"
          v-model="length"
          v-bind="lengthAttrs"
          :min="1"
          :use-grouping="false"
          :invalid="!!errors.length"
          fluid
        />
        <label for="token_length">{{ t('product.type.form.skuTokenDialog.lengthLabel') }}</label>
      </FloatLabel>
      <p class="text-xs text-surface-400 px-1">
        {{ t('product.type.form.skuTokenDialog.lengthHint') }}
      </p>
      <Message v-if="errors.length" size="small" severity="error" variant="simple">{{
        errors.length
      }}</Message>
    </div>

    <div class="flex justify-end">
      <Button :label="t('common.add')" icon="iconify tabler--plus" rounded fluid @click="onAdd" />
    </div>
  </div>
</template>
