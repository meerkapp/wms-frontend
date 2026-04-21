<script setup lang="ts">
import { ref, computed } from 'vue'
import { Button } from 'primevue'
import { useQuery, useMutation } from '@pinia/colada'
import { useAppDialog } from '@/core/composables/useAppDialog'
import { useToast } from 'primevue/usetoast'
import { useI18n } from 'vue-i18n'
import type { Role, Permission } from '@meerkapp/wms-contracts'
import { roleApi } from '@/modules/employee/api/role.api'
import { useAuthStore } from '@/modules/auth/stores/auth.store'
import EmployeePermissionList from './EmployeePermissionList.vue'
import EmployeeRoleFormDialog from './EmployeeRoleFormDialog.vue'

const SUPERADMIN_ROLE = 'superadmin'

const { t } = useI18n()
const dialog = useAppDialog()
const toast = useToast()
const { checkUserPermissions } = useAuthStore()

const { data: roles, refetch: refetchRoles } = useQuery({
  key: ['roles'],
  query: () => roleApi.getAll(),
})

const { data: allPermissions } = useQuery({
  key: ['allPermissions'],
  query: () => roleApi.getAllPermissions(),
})

const selectedRole = ref<Role | null>(null)
const isEditing = ref(false)
const draftPermissions = ref<Permission[]>([])

const selectedRolePermissions = computed<Permission[]>(() => {
  if (!selectedRole.value) return []
  return selectedRole.value.permissions.map((p) => p.employeePermission.name as Permission)
})

function selectRole(role: Role) {
  if (isEditing.value) return
  selectedRole.value = role
}

function startEdit() {
  draftPermissions.value = [...selectedRolePermissions.value]
  isEditing.value = true
}

function cancelEdit() {
  isEditing.value = false
  draftPermissions.value = []
}

const { mutate: updateRole } = useMutation({
  mutation: ({ id, permissionIds }: { id: number; permissionIds: number[] }) =>
    roleApi.update(id, { permissionIds }),
  onSuccess: (updatedRole) => {
    selectedRole.value = updatedRole
    isEditing.value = false
    refetchRoles()
  },
  onError: () => toast.add({ severity: 'error', summary: t('common.error.network'), life: 3000 }),
})

function savePermissions() {
  if (!selectedRole.value || !allPermissions.value) return
  const nameToId = new Map(allPermissions.value.map((p) => [p.name, p.id]))
  const permissionIds = draftPermissions.value
    .map((name) => nameToId.get(name))
    .filter((id): id is number => id !== undefined)
  updateRole({ id: selectedRole.value.id, permissionIds })
}

function openEditRoleDialog(role: Role) {
  dialog.open(EmployeeRoleFormDialog, {
    props: {
      header: t('role.form.titleEdit'),
      modal: true,
      style: { width: '20rem' },
    },
    data: { role },
    onClose: (options) => {
      if (!options?.data) return
      const updated = options.data as Role
      refetchRoles()
      if (selectedRole.value?.id === updated.id) selectedRole.value = updated
    },
  })
}

function openCreateDialog() {
  dialog.open(EmployeeRoleFormDialog, {
    props: {
      header: t('role.form.titleCreate'),
      modal: true,
      style: { width: '20rem' },
    },
    onClose: (options) => {
      if (!options?.data) return
      refetchRoles()
      selectedRole.value = options.data as Role
    },
  })
}
</script>

<template>
  <div class="flex h-140">
    <div class="w-52 flex flex-col gap-3 mr-2">
      <div class="flex-1 overflow-y-auto space-y-1">
        <div
          v-for="role in roles ?? []"
          :key="role.id"
          class="group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors select-none"
          :class="
            selectedRole?.id === role.id
              ? 'bg-primary/10'
              : isEditing
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-surface-100 dark:hover:bg-surface-800'
          "
          @click="selectRole(role)"
        >
          <i
            class="iconify tabler--shield-filled text-base shrink-0"
            :style="{ color: role.color }"
          />
          <span class="text-sm truncate font-medium flex-1" :style="{ color: role.color }">{{
            role.name
          }}</span>
          <i
            v-if="
              checkUserPermissions('role:update') && role.name !== SUPERADMIN_ROLE && !isEditing
            "
            class="iconify tabler--pencil opacity-0 group-hover:opacity-100 transition-opacity text-muted-color text-sm"
            @click.stop="openEditRoleDialog(role)"
          ></i>
        </div>
      </div>
      <Button
        v-if="checkUserPermissions('role:create')"
        :label="t('role.manager.createRole')"
        :disabled="isEditing"
        icon="iconify tabler--plus"
        variant="outlined"
        size="small"
        rounded
        fluid
        @click="openCreateDialog"
      />
    </div>
    <EmployeePermissionList
      :permissions="isEditing ? draftPermissions : selectedRolePermissions"
      :editable="isEditing"
      :empty-message="t('employee.permission.list.notAvailable')"
      @update:permissions="draftPermissions = $event"
    >
      <template #header v-if="checkUserPermissions('role:update')">
        <template v-if="isEditing">
          <Button
            :label="t('common.cancel')"
            severity="secondary"
            size="small"
            rounded
            @click="cancelEdit"
          />
          <Button :label="t('common.save')" size="small" rounded @click="savePermissions" />
        </template>
        <Button
          v-else
          :label="t('common.edit')"
          :disabled="!selectedRole || selectedRole.name === SUPERADMIN_ROLE"
          severity="secondary"
          icon="iconify tabler--edit"
          size="small"
          rounded
          @click="startEdit"
        />
      </template>
    </EmployeePermissionList>
  </div>
</template>
