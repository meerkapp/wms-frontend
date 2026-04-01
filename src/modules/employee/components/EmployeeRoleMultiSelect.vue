<script lang="ts" setup>
import { FloatLabel, MultiSelect, Tag } from 'primevue'
import { useQuery } from '@pinia/colada'
import { useI18n } from 'vue-i18n'
import { roleApi } from '@/modules/employee/api/role.api'
import EmployeeRoleTag from '@/modules/employee/components/EmployeeRoleTag.vue'
import type { Role } from '@meerkapp/wms-contracts'

const props = defineProps<{ roleIds: number[]; label: string; disabled?: boolean }>()
const emit = defineEmits<{
  'update:roles': [value: Role[]]
}>()

const { t } = useI18n()

const { data: roles } = useQuery({
  key: ['roles'],
  query: () => roleApi.getAll(),
})
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
        <span :style="option.color ? `color: ${option.color}` : ''">
          {{ option.name }}
        </span>
      </template>
      <template #chip="{ value: id }">
        <EmployeeRoleTag
          :name="roles?.find((r) => r.id === id)?.name ?? String(id)"
          :color="roles?.find((r) => r.id === id)?.color"
        />
      </template>
    </MultiSelect>
    <label for="employee_roles">{{ props.label }}</label>
  </FloatLabel>
</template>
