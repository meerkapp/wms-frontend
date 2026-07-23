<script lang="ts" setup>
import { computed, useId } from 'vue'
import { Button, FloatLabel, MultiSelect, Select } from 'primevue'
import { useDialog } from 'primevue/usedialog'
import { useMutation } from '@pinia/colada'
import { useAppToast } from '@/core/composables/useAppToast'
import { useI18n } from 'vue-i18n'
import { useCountries, useLocalities } from '@/modules/sync/composables/read-model.composables'
import { getCountryFlag, getCountryName } from '@/modules/country/utils/country.utils'
import { useAuthStore } from '@/modules/auth/stores/auth.store'
import { localityApi } from '../api/locality.api'
import LocalityFormDialog from './LocalityFormDialog.vue'
import type { Locality, CreateLocalityDto } from '@meerkapp/wms-contracts'

const props = withDefaults(
  defineProps<{
    localityId?: Locality['id'] | null
    localityIds?: Locality['id'][]
    label: string
    multiple?: boolean
    disabledOptions?: Record<number, string>
    placeholder?: string
    showToggleAll?: boolean
  }>(),
  {
    localityId: null,
    localityIds: () => [],
    multiple: false,
    disabledOptions: () => ({}),
    placeholder: undefined,
    showToggleAll: true,
  },
)
const emit = defineEmits<{
  'update:localityId': [value: Locality['id']]
  'update:localityIds': [value: Locality['id'][]]
}>()

const { t } = useI18n()
const dialog = useDialog()
const toast = useAppToast()
const authStore = useAuthStore()
const { checkUserPermissions } = authStore

const localities = useLocalities()
const countries = useCountries()
const inputId = `locality_select_${useId()}`

const selectedDisplay = computed(() => {
  const locality = localities.value.find((l) => l.id === props.localityId)
  if (!locality) return ''
  const country = countries.value.find((c) => c.id === locality.countryId)
  const countryLabel = country ? getCountryName(country.code) : ''
  return countryLabel ? `${locality.name}, ${countryLabel}` : locality.name
})

const localityOptions = computed(() => {
  const countryMap = new Map(countries.value.map((c) => [c.id, c]))
  const groups = new Map<
    number,
    { label: string; items: Array<Locality & { displayName: string; disabled: boolean }> }
  >()

  for (const locality of localities.value) {
    if (!groups.has(locality.countryId)) {
      const country = countryMap.get(locality.countryId)
      const label = country
        ? `${getCountryFlag(country.code)} ${getCountryName(country.code)}`
        : String(locality.countryId)
      groups.set(locality.countryId, { label, items: [] })
    }
    const disabledReason = props.disabledOptions[locality.id]
    groups.get(locality.countryId)!.items.push({
      ...locality,
      displayName: disabledReason ? `${locality.name} · ${disabledReason}` : locality.name,
      disabled: Boolean(disabledReason),
    })
  }

  return [...groups.values()]
})

const { mutate: createLocality } = useMutation({
  mutation: (dto: CreateLocalityDto) => localityApi.create(dto),
  onError: () => toast.error(t('common.error.network')),
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
    <MultiSelect
      v-if="props.multiple"
      :id="inputId"
      :model-value="props.localityIds"
      :options="localityOptions"
      option-label="displayName"
      option-value="id"
      option-disabled="disabled"
      option-group-label="label"
      option-group-children="items"
      :placeholder="props.placeholder"
      display="chip"
      :filter="localities.length > 5"
      :show-toggle-all="props.showToggleAll"
      fluid
      @update:model-value="(value) => emit('update:localityIds', value ?? [])"
    />
    <Select
      v-else
      :id="inputId"
      :model-value="props.localityId"
      :options="localityOptions"
      class="w-full"
      option-label="displayName"
      option-value="id"
      option-disabled="disabled"
      option-group-label="label"
      option-group-children="items"
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
    <label :for="inputId">{{ props.label }}</label>
  </FloatLabel>
</template>
