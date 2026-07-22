<script lang="ts" setup>
import { computed } from 'vue'
import { Tag } from 'primevue'
import { useI18n } from 'vue-i18n'
import type { Role } from '@meerkapp/wms-contracts'
import { SUPERADMIN_ROLE_NAME } from '@/modules/employee/role.constants'

const props = defineProps<{ name: Role['name']; color?: Role['color'] }>()
const { t } = useI18n()

const displayName = computed(() =>
  props.name === SUPERADMIN_ROLE_NAME ? t('role.names.superadmin') : props.name,
)
</script>

<template>
  <Tag
    :value="displayName"
    :style="props.color ? `color: ${props.color}` : ''"
    icon="iconify tabler--shield-filled"
    class="text-xs! font-medium!"
  />
</template>
