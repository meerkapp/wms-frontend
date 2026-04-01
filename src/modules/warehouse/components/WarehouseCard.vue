<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button, Tag } from 'primevue'
import { useDialog } from 'primevue/usedialog'
import { useMutation } from '@pinia/colada'
import { useToast } from 'primevue/usetoast'
import BaseTile from '@/core/components/BaseTile.vue'
import WarehouseInfo from './WarehouseInfo.vue'
import WarehouseFormDialog from './WarehouseFormDialog.vue'
import { useAuthStore } from '@/modules/auth/stores/auth.store'
import { Organizations } from '@/modules/signaldb/models/organizations.model'
import { Countries } from '@/modules/signaldb/models/countries.model'
import { Localities } from '@/modules/signaldb/models/localities.model'
import { getCountryName } from '@/modules/country/utils/country.utils'
import { warehouseApi } from '../api/warehouse.api'
import type { Warehouse, UpdateWarehouseDto } from '@meerkapp/wms-contracts'

const props = defineProps<{ warehouse: Warehouse }>()

const authStore = useAuthStore()
const { checkUserPermissions } = authStore

const { t } = useI18n()
const dialog = useDialog()
const toast = useToast()

const organization = computed(() => {
  return Organizations.findOne({ id: props.warehouse.organizationId })
})

const locality = computed(() => {
  return Localities.findOne({ id: props.warehouse.localityId })
})

const countryName = computed(() => {
  if (!locality.value) return undefined
  const c = Countries.findOne({ id: locality.value.countryId })
  return c ? getCountryName(c.code) : undefined
})

const { mutate: updateWarehouse } = useMutation({
  mutation: (dto: UpdateWarehouseDto) => warehouseApi.update(props.warehouse.id, dto),
  onError: () => toast.add({ severity: 'error', summary: t('common.error.network'), life: 3000 }),
})

function openEditDialog() {
  dialog.open(WarehouseFormDialog, {
    props: {
      header: t('warehouse.form.titleEdit'),
      modal: true,
      style: { width: '26rem' },
    },
    data: { warehouse: props.warehouse },
    onClose: (options) => {
      if (options?.data) updateWarehouse(options.data)
    },
  })
}
</script>

<template>
  <BaseTile>
    <WarehouseInfo
      :code="props.warehouse.code"
      :localityId="props.warehouse.localityId"
      :address="props.warehouse.address"
      :note="props.warehouse.note"
    />
    <Tag
      v-if="props.warehouse.note"
      :value="props.warehouse.note"
      class="mt-3 h-5 font-medium! text-xs!"
    />
    <Button
      v-if="checkUserPermissions('warehouse:update')"
      class="mt-5"
      :label="t('common.edit')"
      icon="iconify tabler--edit"
      severity="secondary"
      size="small"
      rounded
      fluid
      @click="openEditDialog"
    />
  </BaseTile>
</template>
