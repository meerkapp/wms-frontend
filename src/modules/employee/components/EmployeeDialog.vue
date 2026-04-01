<script lang="ts" setup>
import { computed, provide, ref } from 'vue'
import type { Permission, Role } from '@meerkapp/wms-contracts'
import EmployeePermissionList from './EmployeePermissionList.vue'

const selectedRoles = ref<Role[]>([])

function setRoles(roles: Role[]) {
  selectedRoles.value = roles
}

provide('setRoles', setRoles)

const activePermissions = computed<Permission[]>(() =>
  selectedRoles.value.flatMap((r) =>
    r.permissions.map((p) => p.employeePermission.name as Permission),
  ),
)

const roleColors = computed(() =>
  selectedRoles.value.map((r) => ({
    color: r.color,
    permissions: r.permissions.map((p) => p.employeePermission.name as Permission),
  })),
)
</script>

<template>
  <div class="flex gap-6 p-1 min-h-128">
    <div class="flex-1 min-w-0">
      <slot />
    </div>
    <div class="relative w-1/2 shrink-0 border-l border-surface">
      <div class="absolute inset-0 overflow-y-auto pl-6">
        <EmployeePermissionList
          :permissions="activePermissions"
          :role-colors="roleColors"
          hide-unchecked
        />
      </div>
    </div>
  </div>
</template>
