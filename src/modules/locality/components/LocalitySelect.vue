<script lang="ts" setup>
import { ref, watchEffect } from 'vue'
import { FloatLabel, Select, Button } from 'primevue'
import { useDialog } from 'primevue/usedialog'
import { useMutation } from '@pinia/colada'
import { useToast } from 'primevue/usetoast'
import { useI18n } from 'vue-i18n'
import { Localities } from '@/modules/signaldb/models/localities.model'
import { useAuthStore } from '@/modules/auth/stores/auth.store'
import { localityApi } from '../api/locality.api'
import LocalityFormDialog from './LocalityFormDialog.vue'
import type { Locality, CreateLocalityDto } from '@meerkapp/wms-contracts'

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

watchEffect((onCleanup) => {
  const cursor = Localities.find({}, { sort: { name: 1 } })
  localities.value = cursor.fetch()

  onCleanup(() => {
    cursor.cleanup()
  })
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
      :options="localities"
      class="w-full"
      optionLabel="name"
      optionValue="id"
      labelId="on_locality"
      :filter="localities.length > 5"
      @update:model-value="(value) => emit('update:localityId', value)"
    >
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
