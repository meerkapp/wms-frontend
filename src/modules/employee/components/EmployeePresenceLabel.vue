<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { usePresenceStore } from '@/modules/employee/stores/presence.store'
import type { Employee } from '@meerkapp/wms-contracts'

const props = defineProps<{ employee: Employee; tick?: number }>()

const { t } = useI18n()
const presence = usePresenceStore()
</script>

<template>
  <span
    class="text-xs"
    :class="presence.isOnline(props.employee.id) ? 'text-green-500' : 'text-muted-color'"
  >
    {{ presence.getPresenceLabel(props.employee.id, props.employee.lastSeen ?? null, t) }}
  </span>
</template>
