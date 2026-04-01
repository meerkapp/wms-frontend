<script lang="ts" setup>
import { computed } from 'vue'
import { Checkbox, Panel } from 'primevue'
import { useI18n } from 'vue-i18n'
import { ALL_PERMISSIONS, type Permission } from '@meerkapp/wms-contracts'

function getPermissionGroup(name: Permission): string {
  const [group] = name.split(':')
  return group ?? name
}

const props = withDefaults(
  defineProps<{
    permissions: Permission[]
    hideUnchecked?: boolean
    roleColors?: { color: string | null; permissions: Permission[] }[]
  }>(),
  {
    hideUnchecked: false,
    roleColors: () => [],
  },
)

const { t } = useI18n()

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

const activeCount = computed(() => props.permissions.length)
</script>

<template>
  <div class="h-full flex flex-col">
    <h2>
      {{ t('employee.form.permissionsTitle') }}
      <span v-if="activeCount > 0">({{ activeCount }})</span>
    </h2>
    <div
      v-if="permissionGroups.length === 0"
      class="flex-1 flex flex-col gap-3 justify-center items-center"
    >
      <i class="iconify tabler--shield-question text-4xl text-muted-color"></i>
      <span class="text-muted-color">{{ t('employee.form.noPermissions') }}</span>
    </div>
    <div v-else class="mt-5 flex-1 space-y-3 pr-7">
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
              :disabled="true"
              :pt="{
                icon: { style: perm.active && perm.color ? { color: perm.color } : undefined },
              }"
              binary
            />
            <label
              :for="`perm-${perm.name}`"
              class="text-sm cursor-default"
              :class="!perm.active ? 'text-muted-color' : ''"
            >
              {{ t('permissions.' + (perm.name as string).replace(/:/g, '_')) }}
            </label>
          </div>
        </div>
      </Panel>
    </div>
  </div>
</template>
