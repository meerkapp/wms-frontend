<script lang="ts" setup>
import { computed, provide, ref } from 'vue'
import type { Permission, Role } from '@meerkapp/wms-contracts'
import EmployeePermissionList from './EmployeePermissionList.vue'
import { setRolesKey } from '../keys'

const selectedRoles = ref<Role[]>([])

function setRoles(roles: Role[]) {
  selectedRoles.value = roles
}

provide(setRolesKey, setRoles)

const activePermissions = computed<Permission[]>(() => [
  ...new Set(
    selectedRoles.value.flatMap((r) =>
      r.permissions.map((p) => p.employeePermission.name as Permission),
    ),
  ),
])

const roleColors = computed(() =>
  selectedRoles.value.map((r) => ({
    color: r.color,
    permissions: r.permissions.map((p) => p.employeePermission.name as Permission),
  })),
)
</script>

<template>
  <div class="flex min-h-128">
    <div class="flex-1">
      <slot />
    </div>
    <div class="relative w-1/2 shrink-0 ml-2">
      <div class="absolute inset-0 overflow-y-auto">
        <EmployeePermissionList
          :permissions="activePermissions"
          :role-colors="roleColors"
          hide-unchecked
        />
      </div>
    </div>
  </div>
</template>
