<script setup lang="ts">
import { ref, watchEffect, computed } from 'vue'
import { Button, Accordion, AccordionPanel, AccordionHeader, AccordionContent } from 'primevue'
import { useDialog } from 'primevue/usedialog'
import { useMutation } from '@pinia/colada'
import { useToast } from 'primevue/usetoast'
import { useI18n } from 'vue-i18n'
import BaseCard from '@/core/components/BaseCard.vue'
import WarehouseCard from './WarehouseCard.vue'
import WarehouseFormDialog from './WarehouseFormDialog.vue'
import OrganizationIcon from '@/modules/organization/components/OrganizationIcon.vue'
import { useAuthStore } from '@/modules/auth/stores/auth.store'
import { warehouseApi } from '../api/warehouse.api'
import { Warehouses } from '@/modules/signaldb/models/warehouses.model'
import { Organizations } from '@/modules/signaldb/models/organizations.model'
import type { Warehouse, Organization, CreateWarehouseDto } from '@meerkapp/wms-contracts'

const { t } = useI18n()
const dialog = useDialog()
const toast = useToast()

const authStore = useAuthStore()
const { checkUserPermissions } = authStore

const warehouses = ref<Warehouse[]>([])
const organizations = ref<Organization[]>([])

watchEffect((onCleanup) => {
  const warehouseCursor = Warehouses.find({})
  const organizationCursor = Organizations.find({}, { sort: { name: 1 } })
  warehouses.value = warehouseCursor.fetch()
  organizations.value = organizationCursor.fetch()

  onCleanup(() => {
    warehouseCursor.cleanup()
    organizationCursor.cleanup()
  })
})

const warehouseGroups = computed(() => {
  const orgMap = new Map(organizations.value.map((o) => [o.id, o]))
  const groups = new Map<number, { organization: Organization; warehouses: Warehouse[] }>()

  for (const warehouse of warehouses.value) {
    const org = orgMap.get(warehouse.organizationId)
    if (!org) continue
    if (!groups.has(org.id)) {
      groups.set(org.id, { organization: org, warehouses: [] })
    }
    groups.get(org.id)!.warehouses.push(warehouse)
  }

  return [...groups.values()]
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
      <Accordion :value="warehouseGroups.map((g) => g.organization.id.toString())" multiple>
        <AccordionPanel
          v-for="group in warehouseGroups"
          :key="group.organization.id"
          :value="group.organization.id.toString()"
        >
          <AccordionHeader>
            <div class="flex items-center">
              <OrganizationIcon :website="group.organization.website" class="mr-2" />
              <span class="truncate">
                {{ group.organization.name }}
              </span>
              <span class="ml-1.5 font-normal"> ({{ group.warehouses.length }}) </span>
            </div>
          </AccordionHeader>
          <AccordionContent pt:content="px-3!">
            <div class="@container">
              <div class="grid gap-3 grid-cols-1 @md:grid-cols-2">
                <WarehouseCard
                  v-for="warehouse in group.warehouses"
                  :key="warehouse.id"
                  :warehouse="warehouse"
                />
              </div>
            </div>
          </AccordionContent>
        </AccordionPanel>
      </Accordion>
    </template>
  </BaseCard>
</template>
