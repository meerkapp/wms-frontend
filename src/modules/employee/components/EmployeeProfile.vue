<script lang="ts" setup>
import { inject, watch, computed } from 'vue'
import { Panel } from 'primevue'
import { useQuery } from '@pinia/colada'
import { useI18n } from 'vue-i18n'
import type { Employee, Role } from '@meerkapp/wms-contracts'
import { Warehouses } from '@/modules/signaldb/models/warehouses.model'
import type { Warehouse } from '@meerkapp/wms-contracts'
import EmployeeRoleTag from './EmployeeRoleTag.vue'
import EmployeeAvatar from './EmployeeAvatar.vue'
import EmployeePresenceLabel from './EmployeePresenceLabel.vue'
import WarehouseInfo from '@/modules/warehouse/components/WarehouseInfo.vue'
import { roleApi } from '@/modules/employee/api/role.api'

const props = defineProps<{ employee: Employee }>()

const { t } = useI18n()
const setRoles = inject<(roles: Role[]) => void>('setRoles')!

const { data: roles } = useQuery({ key: ['roles'], query: () => roleApi.getAll() })

watch(
  roles,
  (allRoles) => {
    if (!allRoles) return
    const employeeRoleIds = props.employee.roleAssignments.map((a) => a.employeeRole.id)
    setRoles(allRoles.filter((r) => employeeRoleIds.includes(r.id)))
  },
  { immediate: true },
)

const warehouse = computed(() =>
  Warehouses.findOne({ id: props.employee.warehouseId ?? undefined }),
)
</script>

<template>
  <div class="space-y-5">
    <div class="flex items-center flex-col">
      <EmployeeAvatar :first-name="employee.firstName" size="xlarge" />
      <span class="mt-2 text-lg font-light">{{ employee.firstName }} {{ employee.lastName }}</span>
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

    <Panel v-if="warehouse" :header="t('employee.form.warehouse')">
      <WarehouseInfo
        :code="warehouse.code"
        :localityId="warehouse.localityId"
        :address="warehouse.address"
        :note="warehouse.note"
      />
    </Panel>

    <Panel :header="t('employee.profile.contacts')">
      <div class="space-y-1">
        <p class="text-xs text-muted-color">{{ t('employee.form.email') }}</p>
        <p>{{ employee.email }}</p>
      </div>
    </Panel>
  </div>
</template>
