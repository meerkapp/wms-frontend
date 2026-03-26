<script setup lang="ts">
import { ref, watchEffect, computed } from 'vue'
import { Button, Tag } from 'primevue'
import { useI18n } from 'vue-i18n'
import BaseCard from '@/core/components/BaseCard.vue'
import WarehouseCard from './WarehouseCard.vue'
import { useAuthStore } from '@/modules/auth/stores/auth.store'
import { Warehouses } from '@/modules/signaldb/models/warehouses.model'
import type { Warehouse } from '@meerkapp/wms-contracts'

const { t } = useI18n()

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

function openCreateDialog() {}
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
