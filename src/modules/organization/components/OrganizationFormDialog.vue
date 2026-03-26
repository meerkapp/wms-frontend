<script lang="ts" setup>
import { computed, inject, type Ref } from 'vue'
import { Button, FloatLabel, InputText } from 'primevue'
import type { DynamicDialogInstance } from 'primevue/dynamicdialogoptions'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import { useI18n } from 'vue-i18n'
import type { Organization } from '@meerkapp/wms-contracts'

const { t } = useI18n()

const dialogRef = inject<Ref<DynamicDialogInstance>>('dialogRef')
const organization = computed<Organization | undefined>(() => dialogRef?.value.data?.organization)

const validationSchema = computed(() =>
  toTypedSchema(
    z.object({
      name: z.string().min(1, t('organization.form.validation.nameRequired')),
      website: z
        .string()
        .url(t('organization.form.validation.websiteInvalid'))
        .optional()
        .or(z.literal(''))
        .transform((v) => v || null),
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
  dialogRef?.value.close(values)
})
</script>

<template>
  <form class="space-y-5 p-1" @submit.prevent="onSubmit">
    <div>
      <FloatLabel variant="on">
        <InputText id="org_name" v-model="name" v-bind="nameAttrs" :invalid="!!errors.name" fluid />
        <label for="org_name">{{ t('organization.form.name') }}</label>
      </FloatLabel>
      <small v-if="errors.name" class="text-red-500 text-xs mt-1 block">
        {{ errors.name }}
      </small>
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
        <label for="org_website">{{ t('organization.form.website') }}</label>
      </FloatLabel>
      <small v-if="errors.website" class="text-red-500 text-xs mt-1 block">
        {{ errors.website }}
      </small>
    </div>
    <Button type="submit" :label="t('common.save')" rounded fluid />
  </form>
</template>
