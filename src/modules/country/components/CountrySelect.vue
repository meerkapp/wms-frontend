<script lang="ts" setup>
import { ref, watchEffect } from 'vue'
import { FloatLabel, Select } from 'primevue'
import { Countries } from '@/modules/signaldb/models/countries.model'
import { getCountryName, getCountryFlag } from '../utils/country.utils'
import type { Country } from '@meerkapp/wms-contracts'

const props = defineProps<{ countryId: Country['id'] | null; label: string }>()
const emit = defineEmits<{
  'update:countryId': [value: Country['id']]
}>()

const countryOptions = ref<Country[]>([])

watchEffect((onCleanup) => {
  const cursor = Countries.find({}, { sort: { code: 1 } })
  const countries = cursor.fetch()
  countryOptions.value = countries.map((country) => ({
    ...country,
    name:
      getCountryFlag(country.code) +
      ' ' +
      getCountryName(country.code),
  }))

  onCleanup(() => {
    cursor.cleanup()
  })
})
</script>

<template>
  <FloatLabel variant="on">
    <Select
      :model-value="props.countryId"
      :options="countryOptions"
      class="w-full"
      optionLabel="name"
      optionValue="id"
      labelId="on_country"
      filter
      @update:model-value="(value) => emit('update:countryId', value)"
    />
    <label for="on_country">{{ props.label }}</label>
  </FloatLabel>
</template>
