<script lang="ts" setup>
import { computed } from 'vue'
import { FloatLabel, MultiSelect } from 'primevue'
import { useQuery } from '@pinia/colada'
import { useI18n } from 'vue-i18n'
import { roleApi } from '@/modules/employee/api/role.api'
import EmployeeRoleTag from '@/modules/employee/components/EmployeeRoleTag.vue'
import { SUPERADMIN_ROLE_NAME } from '@/modules/employee/role.constants'
import type { Role } from '@meerkapp/wms-contracts'

type RoleOption = Role & { displayName: string }

const props = defineProps<{ roleIds: number[]; label: string; disabled?: boolean }>()
const emit = defineEmits<{
  'update:roles': [value: Role[]]
}>()
const { t } = useI18n()

const { data: roles } = useQuery({
  key: ['roles'],
  query: () => roleApi.getAll(),
})

const rolesMap = computed(() => new Map(roles.value?.map((r) => [r.id, r]) ?? []))
const roleOptions = computed<RoleOption[]>(() =>
  (roles.value ?? []).map((role) => ({
    ...role,
    displayName: role.name === SUPERADMIN_ROLE_NAME ? t('role.names.superadmin') : role.name,
  })),
)
</script>

<template>
  <FloatLabel variant="on">
    <MultiSelect
      :model-value="props.roleIds"
      :disabled="props.disabled"
      :options="roleOptions"
      option-label="displayName"
      option-value="id"
      input-id="employee_roles"
      class="w-full"
      display="chip"
      :show-toggle-all="false"
      :filter="false"
      @update:model-value="
        (ids: number[]) =>
          emit(
            'update:roles',
            (roles ?? []).filter((r) => ids.includes(r.id)),
          )
      "
    >
      <template #option="{ option }: { option: RoleOption }">
        <span :style="`color: ${option.color}`">
          {{ option.displayName }}
        </span>
      </template>
      <template #chip="{ value: id }">
        <EmployeeRoleTag
          :name="rolesMap.get(id)?.name ?? String(id)"
          :color="rolesMap.get(id)?.color"
        />
      </template>
    </MultiSelect>
    <label for="employee_roles">{{ props.label }}</label>
  </FloatLabel>
</template>
