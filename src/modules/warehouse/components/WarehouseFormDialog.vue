<script setup lang="ts">
import { computed, inject, type Ref } from 'vue'
import { Button, FloatLabel, InputText, Message } from 'primevue'
import type { DynamicDialogInstance } from 'primevue/dynamicdialogoptions'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import { useI18n } from 'vue-i18n'
import LocalitySelect from '@/modules/locality/components/LocalitySelect.vue'
import OrganizationSelect from '@/modules/organization/components/OrganizationSelect.vue'
import type { Warehouse } from '@meerkapp/wms-contracts'

const { t } = useI18n()

const dialogRef = inject<Ref<DynamicDialogInstance>>('dialogRef')
const warehouse = computed<Warehouse | undefined>(() => dialogRef?.value.data?.warehouse)

const validationSchema = computed(() =>
  toTypedSchema(
    z.object({
      code: z
        .string({ required_error: t('warehouse.form.validation.codeRequired') })
        .min(1, t('warehouse.form.validation.codeRequired')),
      address: z
        .string({ required_error: t('warehouse.form.validation.addressRequired') })
        .min(1, t('warehouse.form.validation.addressRequired')),
      note: z.string().optional(),
      organizationId: z.number({
        required_error: t('warehouse.form.validation.organizationRequired'),
      }),
      localityId: z.number({ required_error: t('warehouse.form.validation.localityRequired') }),
    }),
  ),
)

const { handleSubmit, errors, defineField, setFieldValue } = useForm({
  validationSchema,
  initialValues: {
    code: warehouse.value?.code ?? '',
    address: warehouse.value?.address ?? '',
    note: warehouse.value?.note ?? '',
    organizationId: warehouse.value?.organizationId,
    localityId: warehouse.value?.localityId,
  },
})

const [code, codeAttrs] = defineField('code')
const [address, addressAttrs] = defineField('address')
const [note, noteAttrs] = defineField('note')
const [organizationId] = defineField('organizationId')
const [localityId] = defineField('localityId')

const onSubmit = handleSubmit((values) => {
  dialogRef?.value.close({
    ...values,
    note: values.note || null,
  })
})
</script>

<template>
  <form class="space-y-5 p-1" @submit.prevent="onSubmit">
    <div>
      <OrganizationSelect
        :organizationId="organizationId ?? null"
        :label="t('warehouse.form.organization')"
        @update:organizationId="setFieldValue('organizationId', $event)"
      />
      <Message v-if="errors.organizationId" size="small" severity="error" variant="simple">{{ errors.organizationId }}</Message>
    </div>
    <div>
      <LocalitySelect
        :localityId="localityId ?? null"
        :label="t('warehouse.form.locality')"
        @update:localityId="setFieldValue('localityId', $event)"
      />
      <Message v-if="errors.localityId" size="small" severity="error" variant="simple">{{ errors.localityId }}</Message>
    </div>
    <div>
      <FloatLabel variant="on">
        <InputText
          id="warehouse_address"
          v-model="address"
          v-bind="addressAttrs"
          :invalid="!!errors.address"
          fluid
        />
        <label for="warehouse_address">{{ t('warehouse.form.address') }}</label>
      </FloatLabel>
      <Message v-if="errors.address" size="small" severity="error" variant="simple">{{ errors.address }}</Message>
    </div>
    <div>
      <FloatLabel variant="on">
        <InputText
          id="warehouse_code"
          v-model="code"
          v-bind="codeAttrs"
          :invalid="!!errors.code"
          fluid
        />
        <label for="warehouse_code">{{ t('warehouse.form.code') }}</label>
      </FloatLabel>
      <Message v-if="errors.code" size="small" severity="error" variant="simple">{{ errors.code }}</Message>
    </div>
    <div>
      <FloatLabel variant="on">
        <InputText id="warehouse_note" v-model="note" v-bind="noteAttrs" fluid />
        <label for="warehouse_note">{{ t('common.optionalField', { label: t('warehouse.form.note') }) }}</label>
      </FloatLabel>
    </div>
    <Button type="submit" :label="t('common.save')" rounded fluid />
  </form>
</template>
