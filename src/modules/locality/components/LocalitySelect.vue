<script lang="ts" setup>
import { ref, watchEffect, computed } from 'vue'
import { FloatLabel, Select, Button } from 'primevue'
import { useDialog } from 'primevue/usedialog'
import { useMutation } from '@pinia/colada'
import { useToast } from 'primevue/usetoast'
import { useI18n } from 'vue-i18n'
import { Localities } from '@/modules/signaldb/models/localities.model'
import { Countries } from '@/modules/signaldb/models/countries.model'
import { getCountryFlag, getCountryName } from '@/modules/country/utils/country.utils'
import { useAuthStore } from '@/modules/auth/stores/auth.store'
import { localityApi } from '../api/locality.api'
import LocalityFormDialog from './LocalityFormDialog.vue'
import type { Locality, Country, CreateLocalityDto } from '@meerkapp/wms-contracts'

const props = defineProps<{ localityId: Locality['id'] | null; label: string }>()
const emit = defineEmits<{
  'update:localityId': [value: Locality['id']]
}>()

const { t } = useI18n()
const dialog = useDialog()
const toast = useToast()
const authStore = useAuthStore()
const { checkUserPermissions } = authStore

const localities = ref<Locality[]>([])
const countries = ref<Country[]>([])

watchEffect((onCleanup) => {
  const localityCursor = Localities.find({}, { sort: { name: 1 } })
  const countryCursor = Countries.find({}, { sort: { code: 1 } })
  localities.value = localityCursor.fetch()
  countries.value = countryCursor.fetch()

  onCleanup(() => {
    localityCursor.cleanup()
    countryCursor.cleanup()
  })
})

const selectedDisplay = computed(() => {
  const locality = localities.value.find((l) => l.id === props.localityId)
  if (!locality) return ''
  const country = countries.value.find((c) => c.id === locality.countryId)
  const countryLabel = country ? getCountryName(country.code) : ''
  return countryLabel ? `${locality.name}, ${countryLabel}` : locality.name
})

const localityOptions = computed(() => {
  const countryMap = new Map(countries.value.map((c) => [c.id, c]))
  const groups = new Map<number, { label: string; items: Locality[] }>()

  for (const locality of localities.value) {
    if (!groups.has(locality.countryId)) {
      const country = countryMap.get(locality.countryId)
      const label = country
        ? `${getCountryFlag(country.code)} ${getCountryName(country.code)}`
        : String(locality.countryId)
      groups.set(locality.countryId, { label, items: [] })
    }
    groups.get(locality.countryId)!.items.push(locality)
  }

  return [...groups.values()]
})

const { mutate: createLocality } = useMutation({
  mutation: (dto: CreateLocalityDto) => localityApi.create(dto),
  onError: () => toast.add({ severity: 'error', summary: t('common.error.network'), life: 3000 }),
  onSuccess: (locality) => {
    if (!localities.value.some((l) => l.id === locality.id)) {
      localities.value = [...localities.value, locality]
    }
    emit('update:localityId', locality.id)
  },
})

function openCreateDialog() {
  dialog.open(LocalityFormDialog, {
    props: {
      header: t('locality.form.titleCreate'),
      modal: true,
      style: { width: '22rem' },
    },
    onClose: (options) => {
      if (options?.data) createLocality(options.data)
    },
  })
}
</script>

<template>
  <FloatLabel variant="on">
    <Select
      :model-value="props.localityId"
      :options="localityOptions"
      class="w-full"
      optionLabel="name"
      optionValue="id"
      optionGroupLabel="label"
      optionGroupChildren="items"
      labelId="on_locality"
      :filter="localities.length > 5"
      @update:model-value="(value) => emit('update:localityId', value)"
    >
      <template #value="{ value }">
        <span v-if="value">{{ selectedDisplay }}</span>
      </template>
      <template #footer>
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
      </template>
    </Select>
    <label for="on_locality">{{ props.label }}</label>
  </FloatLabel>
</template>
