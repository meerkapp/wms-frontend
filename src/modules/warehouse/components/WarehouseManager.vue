<script setup lang="ts">
import { computed } from 'vue'
import { Button, Accordion, AccordionPanel, AccordionHeader, AccordionContent } from 'primevue'
import { useDialog } from 'primevue/usedialog'
import { useMutation, useQueryCache } from '@pinia/colada'
import { useToast } from 'primevue/usetoast'
import { useI18n } from 'vue-i18n'
import BaseCard from '@/core/components/BaseCard.vue'
import WarehouseCard from './WarehouseCard.vue'
import WarehouseFormDialog from './WarehouseFormDialog.vue'
import OrganizationIcon from '@/modules/organization/components/OrganizationIcon.vue'
import { useAuthStore } from '@/modules/auth/stores/auth.store'
import { warehouseApi } from '../api/warehouse.api'
import { localSyncService } from '@/modules/sync/services/sync.service'
import { useOrganizations, useWarehouses } from '@/modules/sync/composables/read-model.composables'
import type { Warehouse, Organization, CreateWarehouseDto } from '@meerkapp/wms-contracts'

type WarehouseCreateFormResult = CreateWarehouseDto & { priceListId?: number | null }

const { t } = useI18n()
const dialog = useDialog()
const toast = useToast()
const queryCache = useQueryCache()

const authStore = useAuthStore()
const { checkUserPermissions } = authStore

const warehouses = useWarehouses()
const organizations = useOrganizations({ sortByName: true })

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
  mutation: async ({ priceListId, ...dto }: WarehouseCreateFormResult) => {
    const warehouse =
      priceListId === undefined
        ? await warehouseApi.create(dto)
        : await warehouseApi.createWithPriceListAssignment({ ...dto, priceListId })
    void localSyncService
      .applyServerUpsert('warehouse', warehouse)
      .catch((error) => console.error('[warehouse:create:read-model]', error))
    if (priceListId !== undefined) {
      await queryCache.invalidateQueries({ key: ['price-lists'], exact: true })
    }
    return warehouse
  },
  onError: () => toast.add({ severity: 'error', summary: t('common.error.network'), life: 3000 }),
})

function openCreateDialog() {
  dialog.open(WarehouseFormDialog, {
    props: {
      header: t('warehouse.form.titleCreate'),
      modal: true,
      draggable: false,
      style: { width: '26rem' },
    },
    onClose: (options) => {
      if (options?.data) createWarehouse(options.data as WarehouseCreateFormResult)
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
            <div class="flex items-center text-sm font-medium">
              <OrganizationIcon :website="group.organization.website" class="mr-2" />
              <span class="truncate">
                {{ group.organization.name }}
              </span>
              <span class="ml-1.5"> ({{ group.warehouses.length }}) </span>
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
