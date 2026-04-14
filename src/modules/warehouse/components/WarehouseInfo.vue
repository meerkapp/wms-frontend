<script lang="ts" setup>
import { computed } from 'vue'
import { Tag } from 'primevue'
import { Countries } from '@/modules/signaldb/models/countries.model'
import { Localities } from '@/modules/signaldb/models/localities.model'
import { getCountryName } from '@/modules/country/utils/country.utils'
import type { Warehouse } from '@meerkapp/wms-contracts'

const props = defineProps<{
  code: Warehouse['code']
  localityId: Warehouse['localityId']
  address: Warehouse['address']
  note?: Warehouse['note']
}>()

const locality = computed(() => {
  return Localities.findOne({ id: props.localityId })
})

const countryName = computed(() => {
  if (!locality.value) return undefined
  const c = Countries.findOne({ id: locality.value.countryId })
  return c ? getCountryName(c.code) : undefined
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
