<script lang="ts" setup>
import { computed, inject, ref, type Ref } from 'vue'
import { Button, FloatLabel, InputText, Message } from 'primevue'
import type { DynamicDialogInstance } from 'primevue/dynamicdialogoptions'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import { useI18n } from 'vue-i18n'
import type { Organization } from '@meerkapp/wms-contracts'
import DirectPriceListSelect from '@/modules/price-list/components/DirectPriceListSelect.vue'
import { useAuthStore } from '@/modules/auth/stores/auth.store'

const { t } = useI18n()

const dialogRef = inject<Ref<DynamicDialogInstance>>('dialogRef')
const organization = computed<Organization | undefined>(() => dialogRef?.value.data?.organization)
const directPriceListId = ref<number | null | undefined>()
const { checkUserPermissions } = useAuthStore()
const canManagePriceList = computed(() => checkUserPermissions('price_list:update'))

const validationSchema = computed(() =>
  toTypedSchema(
    z.object({
      name: z.string().min(1, t('organization.form.validation.nameRequired')),
      website: z
        .string()
        .url(t('organization.form.validation.websiteInvalid'))
        .optional()
        .or(z.literal('')),
    }),
  ),
)

const { handleSubmit, errors, defineField } = useForm({
  validationSchema,
  initialValues: {
    name: organization.value?.name ?? '',
    website: organization.value?.website ?? '',
  },
})

const [name, nameAttrs] = defineField('name')
const [website, websiteAttrs] = defineField('website')

const onSubmit = handleSubmit((values) => {
  if (canManagePriceList.value && directPriceListId.value === undefined) return
  dialogRef?.value.close({
    ...values,
    website: values.website || null,
    ...(canManagePriceList.value ? { priceListId: directPriceListId.value } : {}),
  })
})
</script>

<template>
  <form class="space-y-5 p-1" @submit.prevent="onSubmit">
    <div>
      <FloatLabel variant="on">
        <InputText id="org_name" v-model="name" v-bind="nameAttrs" :invalid="!!errors.name" fluid />
        <label for="org_name">{{ t('organization.form.name') }}</label>
      </FloatLabel>
      <Message v-if="errors.name" size="small" severity="error" variant="simple">{{
        errors.name
      }}</Message>
    </div>
    <div>
      <FloatLabel variant="on">
        <InputText
          id="org_website"
          v-model="website"
          v-bind="websiteAttrs"
          :invalid="!!errors.website"
          fluid
        />
        <label for="org_website">{{
          t('common.optionalField', { label: t('organization.form.website') })
        }}</label>
      </FloatLabel>
      <Message v-if="errors.website" size="small" severity="error" variant="simple">{{
        errors.website
      }}</Message>
    </div>
    <DirectPriceListSelect
      v-if="canManagePriceList"
      v-model="directPriceListId"
      target-type="organization"
      :target-id="organization?.id"
    />
    <Button type="submit" :label="t('common.save')" rounded fluid />
  </form>
</template>
