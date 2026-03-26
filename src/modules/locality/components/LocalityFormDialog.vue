<script lang="ts" setup>
import { computed, inject, ref, type Ref } from 'vue'
import { Button, FloatLabel, InputText } from 'primevue'
import type { DynamicDialogInstance } from 'primevue/dynamicdialogoptions'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import { useI18n } from 'vue-i18n'
import CountrySelect from '@/modules/country/components/CountrySelect.vue'

const { t } = useI18n()

const dialogRef = inject<Ref<DynamicDialogInstance>>('dialogRef')

const validationSchema = computed(() =>
  toTypedSchema(
    z.object({
      name: z.string({ required_error: t('locality.form.validation.nameRequired') }).min(1, t('locality.form.validation.nameRequired')),
      countryId: z.number({ required_error: t('locality.form.validation.countryRequired') }),
    }),
  ),
)

const { handleSubmit, errors, defineField, setFieldValue } = useForm({ validationSchema })

const [name, nameAttrs] = defineField('name')
const [countryId] = defineField('countryId')

const onSubmit = handleSubmit((values) => {
  dialogRef?.value.close({ name: values.name, countryId: values.countryId })
})
</script>

<template>
  <form class="space-y-5 p-1" @submit.prevent="onSubmit">
    <div>
      <FloatLabel variant="on">
        <InputText
          id="locality_name"
          v-model="name"
          v-bind="nameAttrs"
          :invalid="!!errors.name"
          fluid
        />
        <label for="locality_name">{{ t('locality.form.name') }}</label>
      </FloatLabel>
      <small v-if="errors.name" class="text-red-500 text-xs mt-1 block">{{ errors.name }}</small>
    </div>
    <div>
      <CountrySelect
        :countryId="countryId ?? null"
        :label="t('locality.form.country')"
        @update:countryId="setFieldValue('countryId', $event)"
      />
      <small v-if="errors.countryId" class="text-red-500 text-xs mt-1 block">{{ errors.countryId }}</small>
    </div>
    <Button type="submit" :label="t('common.save')" rounded fluid />
  </form>
</template>
