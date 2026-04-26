<script setup lang="ts">
import { computed, inject, type Ref } from 'vue'
import { Button, FloatLabel, InputText, Message } from 'primevue'
import type { DynamicDialogInstance } from 'primevue/dynamicdialogoptions'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import { useI18n } from 'vue-i18n'
import FolderSelect from './FolderSelect.vue'
import ProductTypeSelect from '@/modules/product-type/components/ProductTypeSelect.vue'
import type { ProductCollection } from '@meerkapp/wms-contracts'

const { t } = useI18n()

const dialogRef = inject<Ref<DynamicDialogInstance>>('dialogRef')
const collection = computed<ProductCollection | undefined>(() => dialogRef?.value.data?.collection)

const validationSchema = computed(() =>
  toTypedSchema(
    z.object({
      name: z
        .string({ required_error: t('navigation.collection.form.validation.nameRequired') })
        .min(1, t('navigation.collection.form.validation.nameRequired')),
      folderId: z.number().nullable().optional(),
      defaultProductTypeId: z.number().nullable().optional(),
    }),
  ),
)

const { handleSubmit, errors, defineField, setFieldValue } = useForm({
  validationSchema,
  initialValues: {
    name: collection.value?.name ?? '',
    folderId: collection.value?.folderId ?? null,
    defaultProductTypeId: collection.value?.defaultProductTypeId ?? null,
  },
})

const [name, nameAttrs] = defineField('name')
const [folderId] = defineField('folderId')
const [defaultProductTypeId] = defineField('defaultProductTypeId')

const onSubmit = handleSubmit((values) => {
  dialogRef?.value.close(values)
})
</script>

<template>
  <form class="space-y-5 p-1" @submit.prevent="onSubmit">
    <div>
      <FloatLabel variant="on">
        <InputText
          id="collection_name"
          v-model="name"
          v-bind="nameAttrs"
          :invalid="!!errors.name"
          fluid
        />
        <label for="collection_name">{{ t('navigation.collection.form.name') }}</label>
      </FloatLabel>
      <Message v-if="errors.name" size="small" severity="error" variant="simple">
        {{ errors.name }}
      </Message>
    </div>
    <FolderSelect
      :folderId="folderId ?? null"
      :label="t('navigation.collection.form.location')"
      root
      @update:folderId="setFieldValue('folderId', $event)"
    />
    <ProductTypeSelect
      :productTypeId="defaultProductTypeId ?? null"
      :label="t('common.optionalField', { label: t('navigation.collection.form.defaultProductType') })"
      @update:productTypeId="setFieldValue('defaultProductTypeId', $event)"
    />
    <Button type="submit" :label="t('common.save')" rounded fluid />
  </form>
</template>
