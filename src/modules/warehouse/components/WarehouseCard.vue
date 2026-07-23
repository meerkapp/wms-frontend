<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import { Button } from 'primevue'
import { useDialog } from 'primevue/usedialog'
import { useMutation, useQueryCache } from '@pinia/colada'
import { useAppToast } from '@/core/composables/useAppToast'
import BaseTile from '@/core/components/BaseTile.vue'
import WarehouseInfo from './WarehouseInfo.vue'
import WarehouseFormDialog from './WarehouseFormDialog.vue'
import { useAuthStore } from '@/modules/auth/stores/auth.store'
import { warehouseApi } from '../api/warehouse.api'
import { localSyncService } from '@/modules/sync/services/sync.service'
import type { Warehouse, UpdateWarehouseDto } from '@meerkapp/wms-contracts'

type WarehouseFormResult = UpdateWarehouseDto & { priceListId?: number | null }

const props = defineProps<{ warehouse: Warehouse }>()

const authStore = useAuthStore()
const { checkUserPermissions } = authStore

const { t } = useI18n()
const dialog = useDialog()
const toast = useAppToast()
const queryCache = useQueryCache()

const { mutate: updateWarehouse } = useMutation({
  mutation: async ({ priceListId, ...dto }: WarehouseFormResult) => {
    const warehouse =
      priceListId === undefined
        ? await warehouseApi.update(props.warehouse.id, dto)
        : await warehouseApi.updateWithPriceListAssignment(props.warehouse.id, {
            ...dto,
            priceListId,
          })
    void localSyncService
      .applyServerUpsert('warehouse', warehouse)
      .catch((error) => console.error('[warehouse:update:read-model]', error))
    if (priceListId !== undefined) {
      await queryCache.invalidateQueries({ key: ['price-lists'], exact: true })
    }
    return warehouse
  },
  onError: () => toast.error(t('common.error.network')),
})

function openEditDialog() {
  dialog.open(WarehouseFormDialog, {
    props: {
      header: t('warehouse.form.titleEdit'),
      modal: true,
      draggable: false,
      style: { width: '26rem' },
    },
    data: { warehouse: props.warehouse },
    onClose: (options) => {
      if (options?.data) updateWarehouse(options.data as WarehouseFormResult)
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
