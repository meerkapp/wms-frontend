<script lang="ts" setup>
import { computed } from 'vue'
import { FloatLabel, MultiSelect } from 'primevue'
import { useQuery } from '@pinia/colada'
import { roleApi } from '@/modules/employee/api/role.api'
import EmployeeRoleTag from '@/modules/employee/components/EmployeeRoleTag.vue'
import type { Role } from '@meerkapp/wms-contracts'

const props = defineProps<{ roleIds: number[]; label: string; disabled?: boolean }>()
const emit = defineEmits<{
  'update:roles': [value: Role[]]
}>()

const { data: roles } = useQuery({
  key: ['roles'],
  query: () => roleApi.getAll(),
})

const rolesMap = computed(() => new Map(roles.value?.map((r) => [r.id, r]) ?? []))
</script>

<template>
  <FloatLabel variant="on">
    <MultiSelect
      :model-value="props.roleIds"
      :disabled="props.disabled"
      :options="roles ?? []"
      option-label="name"
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
      <template #option="{ option }: { option: Role }">
        <span :style="`color: ${option.color}`">
          {{ option.name }}
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
