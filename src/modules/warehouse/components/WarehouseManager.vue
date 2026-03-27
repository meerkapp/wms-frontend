<script setup lang="ts">
import { ref, watchEffect, computed } from 'vue'
import { Button } from 'primevue'
import { useDialog } from 'primevue/usedialog'
import { useMutation } from '@pinia/colada'
import { useToast } from 'primevue/usetoast'
import { useI18n } from 'vue-i18n'
import BaseCard from '@/core/components/BaseCard.vue'
import WarehouseCard from './WarehouseCard.vue'
import WarehouseFormDialog from './WarehouseFormDialog.vue'
import { useAuthStore } from '@/modules/auth/stores/auth.store'
import { warehouseApi } from '../api/warehouse.api'
import { Warehouses } from '@/modules/signaldb/models/warehouses.model'
import type { Warehouse, CreateWarehouseDto } from '@meerkapp/wms-contracts'

const { t } = useI18n()
const dialog = useDialog()
const toast = useToast()

const authStore = useAuthStore()
const { checkUserPermissions } = authStore

const warehouses = ref<Warehouse[]>([])

watchEffect((onCleanup) => {
  const cursor = Warehouses.find({})
  warehouses.value = cursor.fetch()

  onCleanup(() => {
    cursor.cleanup()
  })
})

const title = computed(() =>
  warehouses.value.length > 0
    ? `${t('warehouse.manager.title')} (${warehouses.value.length})`
    : t('warehouse.manager.title'),
)

const { mutate: createWarehouse } = useMutation({
  mutation: (dto: CreateWarehouseDto) => warehouseApi.create(dto),
  onError: () => toast.add({ severity: 'error', summary: t('common.error.network'), life: 3000 }),
})

function openCreateDialog() {
  dialog.open(WarehouseFormDialog, {
    props: {
      header: t('warehouse.form.titleCreate'),
      modal: true,
      style: { width: '26rem' },
    },
    onClose: (options) => {
      if (options?.data) createWarehouse(options.data)
    },
  })
}
</script>

<template>
  <BaseCard :title="title">
    <template #header>
      <Button
        v-if="checkUserPermissions('warehouse:create')"
        size="small"
        icon="iconify tabler--plus"
        severity="secondary"
        :label="t('common.create')"
        rounded
        @click="openCreateDialog"
      />
    </template>
    <template #main>
      <div class="px-3 @container">
        <div class="grid gap-3 grid-cols-1 @md:grid-cols-2">
          <WarehouseCard
            v-for="warehouse in warehouses"
            :key="warehouse.id"
            :warehouse="warehouse"
          />
        </div>
      </div>
    </template>
  </BaseCard>
</template>
