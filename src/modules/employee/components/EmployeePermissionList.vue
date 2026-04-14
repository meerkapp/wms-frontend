<script lang="ts" setup>
import { computed } from 'vue'
import { Checkbox, Panel } from 'primevue'
import { useI18n } from 'vue-i18n'
import { ALL_PERMISSIONS, type Permission } from '@meerkapp/wms-contracts'
import BaseCard from '@/core/components/BaseCard.vue'

const props = withDefaults(
  defineProps<{
    permissions: Permission[]
    hideUnchecked?: boolean
    editable?: boolean
    roleColors?: { color: string | null; permissions: Permission[] }[]
    emptyMessage?: string
  }>(),
  {
    hideUnchecked: false,
    editable: false,
    roleColors: () => [],
  },
)

const emit = defineEmits<{ 'update:permissions': [Permission[]] }>()

const { t } = useI18n()

const title = computed(() =>
  props.permissions.length > 0
    ? `${t('employee.permission.list.title')} (${props.permissions.length})`
    : t('employee.permission.list.title'),
)

function getPermissionGroup(name: Permission): string {
  const [group] = name.split(':')
  return group ?? name
}

function togglePermission(name: Permission, checked: boolean) {
  if (checked) {
    emit('update:permissions', [...props.permissions, name])
  } else {
    emit(
      'update:permissions',
      props.permissions.filter((p) => p !== name),
    )
  }
}

const activeSet = computed(() => new Set(props.permissions))

const permissionColorMap = computed(() => {
  const map = new Map<Permission, string>()
  for (const role of props.roleColors) {
    if (!role.color) continue
    for (const perm of role.permissions) {
      if (!map.has(perm)) map.set(perm, role.color)
    }
  }
  return map
})

const permissionGroups = computed(() => {
  const groups = new Map<string, { name: Permission; active: boolean; color: string | null }[]>()

  for (const perm of ALL_PERMISSIONS) {
    const active = activeSet.value.has(perm)
    if (props.hideUnchecked && !active) continue

    const group = getPermissionGroup(perm)
    if (!groups.has(group)) groups.set(group, [])
    groups.get(group)!.push({
      name: perm,
      active,
      color: permissionColorMap.value.get(perm) ?? null,
    })
  }

  return [...groups.entries()].map(([group, items]) => ({ group, items }))
})
</script>

<template>
  <BaseCard class="w-full h-full" :title="title">
    <template #header v-if="$slots.header">
      <slot name="header" />
    </template>
    <template #main>
      <div
        v-if="props.permissions.length === 0"
        class="flex flex-col h-full justify-center items-center"
      >
        <i class="iconify tabler--shield-question text-4xl text-muted-color"></i>
        <span class="text-muted-color mt-3">
          {{ props.emptyMessage ?? t('employee.permission.list.notAvailable') }}
        </span>
      </div>
      <div v-else class="h-full overflow-y-auto px-3 pb-3 space-y-3">
        <Panel
          v-for="{ group, items } in permissionGroups"
          :key="group"
          :header="t(`permissions.groups.${group}`)"
          toggleable
        >
          <div class="space-y-1.5">
            <div v-for="perm in items" :key="perm.name" class="flex items-center gap-2">
              <Checkbox
                :input-id="`perm-${perm.name}`"
                :model-value="perm.active"
                :disabled="!props.editable"
                :pt="{
                  icon: { style: perm.active && perm.color ? { color: perm.color } : undefined },
                }"
                binary
                @update:model-value="(v: boolean) => togglePermission(perm.name, v)"
              />
              <label
                :for="`perm-${perm.name}`"
                class="text-sm"
                :class="[
                  !perm.active ? 'text-muted-color' : '',
                  props.editable ? 'cursor-pointer' : 'cursor-default',
                ]"
              >
                {{ t('permissions.' + (perm.name as string).replace(/:/g, '_')) }}
              </label>
            </div>
          </div>
        </Panel>
      </div>
    </template>
  </BaseCard>
</template>
