<script lang="ts" setup>
import { computed } from 'vue'
import { Tag } from 'primevue'
import { getCountryName } from '@/modules/country/utils/country.utils'
import { useWarehouseLocalityCountry } from '@/modules/sync/composables/read-model.composables'
import type { Warehouse } from '@meerkapp/wms-contracts'

const props = defineProps<{
  code: Warehouse['code']
  localityId: Warehouse['localityId']
  address: Warehouse['address']
  note?: Warehouse['note']
}>()

const { locality, country } = useWarehouseLocalityCountry(() => props.localityId)

const countryName = computed(() => {
  if (!locality.value) return undefined
  return country.value ? getCountryName(country.value.code) : undefined
})
</script>

<template>
  <div class="flex gap-3 items-center">
    <Tag :value="props.code" severity="contrast" />
    <div class="leading-none">
      <div class="text-sm flex items-center gap-1">
        <span class="font-semibold">{{ props.address }}</span>
        <i
          v-if="props.note"
          class="iconify tabler--info-circle text-(--p-tag-info-color)"
          v-tooltip="props.note"
        ></i>
      </div>
      <span class="text-xs"> {{ locality?.name }}, {{ countryName }} </span>
    </div>
  </div>
</template>
