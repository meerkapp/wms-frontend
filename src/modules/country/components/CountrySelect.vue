<script lang="ts" setup>
import { computed, useId } from 'vue'
import { FloatLabel, MultiSelect, Select } from 'primevue'
import { useCountries, useLocalities } from '@/modules/sync/composables/read-model.composables'
import { getCountryName, getCountryFlag } from '../utils/country.utils'
import type { Country } from '@meerkapp/wms-contracts'

const props = withDefaults(
  defineProps<{
    countryId?: Country['id'] | null
    countryIds?: Country['id'][]
    label: string
    multiple?: boolean
    onlyWithLocalities?: boolean
    disabledOptions?: Record<number, string>
    placeholder?: string
    filter?: boolean
    showToggleAll?: boolean
  }>(),
  {
    countryId: null,
    countryIds: () => [],
    multiple: false,
    onlyWithLocalities: false,
    disabledOptions: () => ({}),
    placeholder: undefined,
    filter: true,
    showToggleAll: true,
  },
)
const emit = defineEmits<{
  'update:countryId': [value: Country['id']]
  'update:countryIds': [value: Country['id'][]]
}>()

const countries = useCountries()
const localities = useLocalities()
const inputId = `country_select_${useId()}`

const countryIdsWithLocalities = computed(
  () => new Set(localities.value.map((locality) => locality.countryId)),
)

const countryOptions = computed(() =>
  countries.value
    .filter(
      (country) =>
        !props.onlyWithLocalities ||
        countryIdsWithLocalities.value.has(country.id) ||
        props.countryIds.includes(country.id),
    )
    .map((country) => {
      const disabledReason = props.disabledOptions[country.id]
      const name = `${getCountryFlag(country.code)} ${getCountryName(country.code)}`
      return {
        ...country,
        name: disabledReason ? `${name} · ${disabledReason}` : name,
        disabled: Boolean(disabledReason),
      }
    }),
)
</script>

<template>
  <FloatLabel variant="on">
    <MultiSelect
      v-if="props.multiple"
      :id="inputId"
      :model-value="props.countryIds"
      :options="countryOptions"
      option-label="name"
      option-value="id"
      option-disabled="disabled"
      :placeholder="props.placeholder"
      display="chip"
      :filter="props.filter"
      :show-toggle-all="props.showToggleAll"
      fluid
      @update:model-value="(value) => emit('update:countryIds', value ?? [])"
    />
    <Select
      v-else
      :id="inputId"
      :model-value="props.countryId"
      :options="countryOptions"
      class="w-full"
      option-label="name"
      option-value="id"
      option-disabled="disabled"
      filter
      @update:model-value="(value) => emit('update:countryId', value)"
    />
    <label :for="inputId">{{ props.label }}</label>
  </FloatLabel>
</template>
