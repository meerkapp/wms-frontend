<script setup lang="ts">
import { computed, markRaw } from 'vue'
import { Button } from 'primevue'
import { useI18n } from 'vue-i18n'
import { useAppDialog } from '@/core/composables/useAppDialog'
import { useAuthStore } from '@/modules/auth/stores/auth.store'
import BaseTile from '@/core/components/BaseTile.vue'
import EmployeeRoleTag from '@/modules/employee/components/EmployeeRoleTag.vue'
import EmployeeAvatar from '@/modules/employee/components/EmployeeAvatar.vue'
import EmployeePresenceLabel from '@/modules/employee/components/EmployeePresenceLabel.vue'
import EmployeeFormDialog from '@/modules/employee/components/EmployeeFormDialog.vue'
import EmployeeFormDialogFooter from '@/modules/employee/components/EmployeeFormDialogFooter.vue'
import EmployeeProfileDialog from '@/modules/employee/components/EmployeeProfileDialog.vue'
import type { Employee } from '@meerkapp/wms-contracts'

const props = defineProps<{ employee: Employee; tick?: number }>()

const { t } = useI18n()
const dialog = useAppDialog()
const authStore = useAuthStore()
const { checkUserPermissions } = authStore

const isOwnCard = computed(() => props.employee.id === authStore.user?.sub)

const canEdit = computed(() =>
  isOwnCard.value
    ? checkUserPermissions(
        'employee:update:own:info',
        'employee:update:own:email',
        'employee:update:own:password',
      )
    : checkUserPermissions(
        'employee:update:info',
        'employee:update:warehouse',
        'employee:update:roles',
        'employee:update:email',
        'employee:update:password',
        'employee:toggle:active',
      ),
)

function openViewDialog() {
  dialog.open(
    EmployeeProfileDialog,
    {
      props: {
        header: t('employee.form.titleView'),
        modal: true,
        style: { width: '54rem' },
      },
      data: { employee: props.employee },
    },
    { type: 'extended', disableContentBackground: true },
  )
}

function openEditDialog() {
  dialog.open(
    EmployeeFormDialog,
    {
      props: {
        header: t('employee.form.titleEdit'),
        modal: true,
        style: { width: '54rem' },
      },
      data: { employee: props.employee, mode: 'edit' },
      templates: {
        footer: markRaw(EmployeeFormDialogFooter),
      },
    },
    { type: 'extended', disableContentBackground: true },
  )
}
</script>

<template>
  <BaseTile>
    <div class="flex items-center gap-3">
      <EmployeeAvatar :first-name="props.employee.firstName" :image="props.employee.avatarUrl" />
      <div class="leading-none">
        <span class="font-medium">
          {{ props.employee.firstName }} {{ props.employee.lastName }}
        </span>
        <div>
          <EmployeePresenceLabel :employee="props.employee" :tick="tick" />
        </div>
      </div>
    </div>
    <div v-if="props.employee.roleAssignments.length > 0" class="flex gap-2 flex-wrap mt-5">
      <EmployeeRoleTag
        v-for="{ employeeRole } in props.employee.roleAssignments"
        :key="employeeRole.id"
        :name="employeeRole.name"
        :color="employeeRole.color"
      />
    </div>
    <div class="flex flex-col gap-3 mt-5">
      <Button
        :label="t('employee.card.openProfile')"
        icon="iconify tabler--id"
        variant="outlined"
        size="small"
        rounded
        fluid
        @click="openViewDialog"
      />
      <Button
        v-if="canEdit"
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
