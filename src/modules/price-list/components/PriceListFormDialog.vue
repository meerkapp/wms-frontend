<script setup lang="ts">
import { computed, inject, type Ref } from 'vue'
import { Button, FloatLabel, InputText, Message, Select, Tag } from 'primevue'
import type { DynamicDialogInstance } from 'primevue/dynamicdialogoptions'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { useI18n } from 'vue-i18n'
import { z } from 'zod'
import {
  CreatePriceListSchema,
  type CreatePriceListDto,
  type PriceListSummary,
} from '@meerkapp/wms-contracts'
import CountrySelect from '@/modules/country/components/CountrySelect.vue'
import LocalitySelect from '@/modules/locality/components/LocalitySelect.vue'
import { useLocalities } from '@/modules/sync/composables/read-model.composables'

const dialogRef = inject<Ref<DynamicDialogInstance>>('dialogRef')
const priceList = computed<PriceListSummary | undefined>(() => dialogRef?.value.data?.priceList)
const priceLists = computed<PriceListSummary[]>(() => dialogRef?.value.data?.priceLists ?? [])

const { locale, t } = useI18n()
const localities = useLocalities()

const occupiedCountryIds = computed(() => {
  const result: Record<number, string> = {}
  for (const item of priceLists.value) {
    if (item.id === priceList.value?.id) continue
    for (const countryId of item.countryIds ?? []) {
      result[countryId] = t('price.list.form.assignedTo', { name: item.name })
    }
  }
  return result
})

const occupiedLocalityIds = computed(() => {
  const result: Record<number, string> = {}
  for (const item of priceLists.value) {
    if (item.id === priceList.value?.id) continue
    for (const localityId of item.localityIds ?? []) {
      result[localityId] = t('price.list.form.assignedTo', { name: item.name })
    }
  }
  return result
})

const validationSchema = computed(() =>
  toTypedSchema(
    z.object({
      name: z.string().trim().min(1, t('price.list.form.validation.nameRequired')),
      currency: CreatePriceListSchema.shape.currency,
      countryIds: z.array(z.number().int().positive()),
      localityIds: z.array(z.number().int().positive()),
    }),
  ),
)

const { handleSubmit, errors, defineField } = useForm<CreatePriceListDto>({
  validationSchema,
  initialValues: {
    name: priceList.value?.name ?? '',
    currency: priceList.value?.currency ?? 'RUB',
    countryIds: priceList.value?.countryIds ?? [],
    localityIds: priceList.value?.localityIds ?? [],
  },
})

const [name, nameAttrs] = defineField('name')
const [currency, currencyAttrs] = defineField('currency')
const [countryIds] = defineField('countryIds')
const [localityIds] = defineField('localityIds')

const hasRedundantLocalities = computed(() => {
  const selectedCountries = new Set(countryIds.value)
  return localities.value.some(
    (locality) =>
      localityIds.value.includes(locality.id) && selectedCountries.has(locality.countryId),
  )
})

const currencyOptions = computed(() => {
  const displayNames = new Intl.DisplayNames([locale.value], { type: 'currency' })
  return CreatePriceListSchema.shape.currency.options.map((code) => {
    const name = displayNames.of(code) ?? code
    return {
      code,
      label: `${name.charAt(0).toLocaleUpperCase(locale.value)}${name.slice(1)}`,
    }
  })
})

const selectedCurrency = computed(() =>
  currencyOptions.value.find((option) => option.code === currency.value),
)

const onSubmit = handleSubmit((values) => dialogRef?.value.close(values))
</script>

<template>
  <form class="space-y-5 p-1" @submit.prevent="onSubmit">
    <Message v-if="priceList" severity="info" size="small">
      {{ t('price.list.form.currencyChangeHint') }}
    </Message>

    <div class="flex flex-col gap-1">
      <FloatLabel variant="on">
        <InputText
          id="price_list_name"
          v-model="name"
          v-bind="nameAttrs"
          :invalid="!!errors.name"
          fluid
        />
        <label for="price_list_name">{{ t('price.list.form.name') }}</label>
      </FloatLabel>
      <Message v-if="errors.name" size="small" severity="error" variant="simple">
        {{ errors.name }}
      </Message>
    </div>

    <div class="flex flex-col gap-1">
      <FloatLabel variant="on">
        <Select
          id="price_list_currency"
          v-model="currency"
          v-bind="currencyAttrs"
          :options="currencyOptions"
          :invalid="!!errors.currency"
          option-label="label"
          option-value="code"
          filter
          fluid
        >
          <template #value>
            <div v-if="selectedCurrency" class="flex items-center">
              <Tag :value="selectedCurrency.code" severity="contrast" class="mr-2 h-5 text-xs!" />
              <span class="font-semibold">{{ selectedCurrency.label }}</span>
            </div>
          </template>
          <template #option="{ option }">
            <div class="flex items-center">
              <Tag :value="option.code" severity="contrast" class="mr-2 h-5 text-xs!" />
              <span class="font-semibold">{{ option.label }}</span>
            </div>
          </template>
        </Select>
        <label for="price_list_currency">{{ t('price.list.form.currency') }}</label>
      </FloatLabel>
      <Message v-if="errors.currency" size="small" severity="error" variant="simple">
        {{ errors.currency }}
      </Message>
    </div>

    <div class="space-y-5 border-t border-surface pt-5">
      <h2 class="text-sm font-semibold">{{ t('price.list.form.geography.title') }}</h2>
      <Message class="mt-2" severity="secondary" size="small">
        {{ t('price.list.form.geography.hint') }}
      </Message>

      <CountrySelect
        multiple
        only-with-localities
        :country-ids="countryIds"
        :label="t('common.optionalField', { label: t('price.list.form.geography.countries') })"
        :disabled-options="occupiedCountryIds"
        :placeholder="t('price.list.form.geography.optional')"
        :filter="false"
        :show-toggle-all="false"
        @update:country-ids="countryIds = $event"
      />

      <LocalitySelect
        multiple
        :locality-ids="localityIds"
        :label="t('common.optionalField', { label: t('price.list.form.geography.localities') })"
        :disabled-options="occupiedLocalityIds"
        :placeholder="t('price.list.form.geography.optional')"
        :show-toggle-all="false"
        @update:locality-ids="localityIds = $event"
      />

      <Message v-if="hasRedundantLocalities" severity="warn" size="small">
        {{ t('price.list.form.geography.redundantLocality') }}
      </Message>
    </div>

    <Button type="submit" :label="t('common.save')" rounded fluid />
  </form>
</template>
