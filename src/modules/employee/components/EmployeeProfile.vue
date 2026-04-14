<script lang="ts" setup>
import { computed } from 'vue'
import { Panel, Button } from 'primevue'
import { useI18n } from 'vue-i18n'
import type { Employee } from '@meerkapp/wms-contracts'
import { Warehouses } from '@/modules/signaldb/models/warehouses.model'
import EmployeeRoleTag from './EmployeeRoleTag.vue'
import EmployeeAvatar from './EmployeeAvatar.vue'
import EmployeePresenceLabel from './EmployeePresenceLabel.vue'
import BaseCard from '@/core/components/BaseCard.vue'
import WarehouseInfo from '@/modules/warehouse/components/WarehouseInfo.vue'
import { useEmployeeRoleSync } from '@/modules/employee/composables/useEmployeeRoleSync'

const props = defineProps<{ employee: Employee }>()

const { t } = useI18n()

useEmployeeRoleSync(() => props.employee)

const warehouse = computed(() =>
  Warehouses.findOne({ id: props.employee.warehouseId ?? undefined }),
)
</script>

<template>
  <BaseCard class="h-full">
    <template #main>
      <div class="overflow-y-auto p-3">
        <div class="flex items-center flex-col pt-5">
          <EmployeeAvatar
            :first-name="employee.firstName"
            :image="employee.avatarUrl"
            size="xlarge"
          />
          <span class="mt-2 text-lg font-light"
            >{{ employee.firstName }} {{ employee.lastName }}</span
          >
          <EmployeePresenceLabel :employee="employee" />
          <div v-if="employee.roleAssignments.length > 0" class="mt-3">
            <div class="flex flex-wrap gap-2">
              <EmployeeRoleTag
                v-for="{ employeeRole } in employee.roleAssignments"
                :key="employeeRole.id"
                :name="employeeRole.name"
                :color="employeeRole.color"
              />
            </div>
          </div>
        </div>

        <div class="mt-5 space-y-3">
          <Panel v-if="warehouse" :header="t('employee.form.warehouse')">
            <WarehouseInfo
              :code="warehouse.code"
              :localityId="warehouse.localityId"
              :address="warehouse.address"
              :note="warehouse.note"
            />
          </Panel>

          <Panel :header="t('employee.profile.contacts')">
            <Button
              as="a"
              :href="`mailto:${employee.email}`"
              :label="employee.email"
              severity="secondary"
              size="small"
              icon="iconify tabler--mail"
              fluid
            />
            <Button
              v-if="employee.phone"
              as="a"
              :href="`tel:${employee.phone}`"
              :label="employee.phone"
              severity="secondary"
              size="small"
              icon="iconify tabler--phone"
              fluid
              class="mt-3"
            />
          </Panel>
        </div>
      </div>
    </template>
  </BaseCard>
</template>
