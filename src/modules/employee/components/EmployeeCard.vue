<script setup lang="ts">
import { Button } from 'primevue'
import { useI18n } from 'vue-i18n'
import { useDialog } from 'primevue/usedialog'
import { useMutation } from '@pinia/colada'
import { useToast } from 'primevue/usetoast'
import { useAuthStore } from '@/modules/auth/stores/auth.store'
import BaseTile from '@/core/components/BaseTile.vue'
import EmployeeRoleTag from '@/modules/employee/components/EmployeeRoleTag.vue'
import EmployeeAvatar from '@/modules/employee/components/EmployeeAvatar.vue'
import EmployeeFormDialog from '@/modules/employee/components/EmployeeFormDialog.vue'
import EmployeeProfileDialog from '@/modules/employee/components/EmployeeProfileDialog.vue'
import { employeeApi } from '@/modules/employee/api/employee.api'
import type { Employee } from '@meerkapp/wms-contracts'

const props = defineProps<{ employee: Employee }>()
const emit = defineEmits<{ updated: [employee: Employee] }>()

const { t } = useI18n()
const dialog = useDialog()
const toast = useToast()
const authStore = useAuthStore()
const { checkUserPermissions } = authStore

const { mutate: updateEmployee } = useMutation({
  mutation: async (data: {
    firstName: string
    lastName: string
    warehouseId: number | null
    roleIds: number[]
  }) => {
    await employeeApi.update(props.employee.id, {
      firstName: data.firstName,
      lastName: data.lastName,
      warehouseId: data.warehouseId,
    })

    const currentRoleIds = props.employee.roleAssignments.map((a) => a.employeeRole.id)
    const toAdd = data.roleIds.filter((id) => !currentRoleIds.includes(id))
    const toRemove = currentRoleIds.filter((id) => !data.roleIds.includes(id))

    await Promise.all([
      ...toAdd.map((roleId) => employeeApi.assignRole(props.employee.id, roleId)),
      ...toRemove.map((roleId) => employeeApi.removeRole(props.employee.id, roleId)),
    ])

    return employeeApi.getOne(props.employee.id)
  },
  onSuccess: (employee) => emit('updated', employee),
  onError: () => toast.add({ severity: 'error', summary: t('common.error.network'), life: 3000 }),
})

function openViewDialog() {
  dialog.open(EmployeeProfileDialog, {
    props: {
      header: t('employee.form.titleView'),
      modal: true,
      style: { width: '54rem' },
    },
    data: { employee: props.employee },
  })
}

function openEditDialog() {
  dialog.open(EmployeeFormDialog, {
    props: {
      header: t('employee.form.titleEdit'),
      modal: true,
      style: { width: '54rem' },
    },
    data: { employee: props.employee, mode: 'edit' },
    onClose: (options) => {
      if (options?.data) updateEmployee(options.data)
    },
  })
}
</script>

<template>
  <BaseTile>
    <div class="flex items-center gap-3">
      <EmployeeAvatar :first-name="props.employee.firstName" />
      <div class="leading-none">
        <span class="font-medium">
          {{ props.employee.firstName }} {{ props.employee.lastName }}
        </span>
        <div>
          <span class="text-xs text-green-500">в сети</span>
        </div>
      </div>
    </div>
    <div v-if="props.employee.roleAssignments.length > 0" class="flex gap-3 flex-wrap mt-5">
      <EmployeeRoleTag
        v-for="{ employeeRole } in props.employee.roleAssignments"
        :key="employeeRole.id"
        :name="employeeRole.name"
        :color="employeeRole.color"
      />
    </div>
    <div
      v-if="checkUserPermissions('employee:read') || checkUserPermissions('employee:update')"
      class="flex flex-col gap-3 mt-5"
    >
      <Button
        v-if="checkUserPermissions('employee:read')"
        :label="t('employee.card.openProfile')"
        icon="iconify tabler--id"
        variant="outlined"
        size="small"
        rounded
        fluid
        @click="openViewDialog"
      />
      <Button
        v-if="checkUserPermissions('employee:update')"
        :label="t('common.edit')"
        icon="iconify tabler--edit"
        severity="secondary"
        size="small"
        rounded
        fluid
        @click="openEditDialog"
      />
    </div>
  </BaseTile>
</template>
