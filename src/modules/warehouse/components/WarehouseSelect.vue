<script lang="ts" setup>
import { ref, watchEffect, computed } from 'vue'
import { FloatLabel, Select, Tag } from 'primevue'
import { useDialog } from 'primevue/usedialog'
import { useMutation } from '@pinia/colada'
import { useToast } from 'primevue/usetoast'
import { useI18n } from 'vue-i18n'
import { Warehouses } from '@/modules/signaldb/models/warehouses.model'
import { Organizations } from '@/modules/signaldb/models/organizations.model'
import { Localities } from '@/modules/signaldb/models/localities.model'
import { useAuthStore } from '@/modules/auth/stores/auth.store'

import WarehouseInfo from './WarehouseInfo.vue'
import type { Organization, Warehouse } from '@meerkapp/wms-contracts'

const props = defineProps<{ warehouseId: Warehouse['id'] | null; label?: string; disabled?: boolean }>()
const emit = defineEmits<{
  'update:warehouseId': [value: Warehouse['id']]
}>()

const { t } = useI18n()
const dialog = useDialog()
const toast = useToast()
const authStore = useAuthStore()
const { checkUserPermissions } = authStore

const warehouses = ref<Warehouse[]>([])
const organizations = ref<Organization[]>([])

watchEffect((onCleanup) => {
  const warehouseCursor = Warehouses.find({}, { sort: { name: 1 } })
  const organizationCursor = Organizations.find({}, { sort: { name: 1 } })
  warehouses.value = warehouseCursor.fetch()
  organizations.value = organizationCursor.fetch()

  onCleanup(() => {
    warehouseCursor.cleanup()
    organizationCursor.cleanup()
  })
})

const label = computed(() => props.label ?? t('warehouse.select.label'))

const selectedWarehouse = computed(() => {
  return warehouses.value.find((w) => w.id === props.warehouseId)
})

// const localityOptions = computed(() => {
//   const countryMap = new Map(countries.value.map((c) => [c.id, c]))
//   const groups = new Map<number, { label: string; items: Locality[] }>()

//   for (const locality of localities.value) {
//     if (!groups.has(locality.countryId)) {
//       const country = countryMap.get(locality.countryId)
//       const label = country
//         ? `${getCountryFlag(country.code)} ${getCountryName(country.code, country.name)}`
//         : String(locality.countryId)
//       groups.set(locality.countryId, { label, items: [] })
//     }
//     groups.get(locality.countryId)!.items.push(locality)
//   }

//   return [...groups.values()]
// })

// const { mutate: createLocality } = useMutation({
//   mutation: (dto: CreateLocalityDto) => localityApi.create(dto),
//   onError: () => toast.add({ severity: 'error', summary: t('common.error.network'), life: 3000 }),
//   onSuccess: (locality) => {
//     if (!localities.value.some((l) => l.id === locality.id)) {
//       localities.value = [...localities.value, locality]
//     }
//     emit('update:localityId', locality.id)
//   },
// })

// function openCreateDialog() {
//   dialog.open(LocalityFormDialog, {
//     props: {
//       header: t('locality.form.titleCreate'),
//       modal: true,
//       style: { width: '22rem' },
//     },
//     onClose: (options) => {
//       if (options?.data) createLocality(options.data)
//     },
//   })
// }
</script>

<template>
  <FloatLabel variant="on">
    <Select
      :model-value="props.warehouseId"
      :disabled="props.disabled"
      :options="warehouses"
      class="w-full"
      optionValue="id"
      optionLabel="address"
      labelId="on_warehouse"
      :filter="warehouses.length > 5"
      @update:model-value="(value) => emit('update:warehouseId', value)"
    >
      <template #value>
        <div v-if="selectedWarehouse" class="flex items-center">
          <Tag :value="selectedWarehouse.code" severity="contrast" class="h-5 mr-2 text-xs!" />
          <span class="font-semibold">{{ selectedWarehouse.address }}</span>
        </div>
      </template>
      <template #option="{ option }">
        <WarehouseInfo
          :code="option.code"
          :address="option.address"
          :localityId="option.localityId"
          :note="option.note"
        />
      </template>
      <!-- <template #value="{ value }">
        <span v-if="value">{{ selectedDisplay }}</span>
      </template> -->
      <!-- <template #footer>
        <div v-if="checkUserPermissions('locality:create')" class="p-3">
          <Button
            :label="t('locality.form.titleCreate')"
            icon="iconify tabler--plus"
            severity="secondary"
            size="small"
            fluid
            rounded
            @click="openCreateDialog"
          />
        </div>
      </template> -->
    </Select>
    <label for="on_warehouse">{{ label }}</label>
  </FloatLabel>
</template>
