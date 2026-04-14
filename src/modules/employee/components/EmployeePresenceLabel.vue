<script setup lang="ts">
import { computed } from 'vue'
import { usePresenceStore } from '@/modules/employee/stores/presence.store'
import type { Employee } from '@meerkapp/wms-contracts'

const props = defineProps<{ employee: Employee; tick?: number }>()

const presence = usePresenceStore()

const label = computed(() => {
  void props.tick // reactive dependency for periodic updates
  return presence.getPresenceLabel(props.employee.id, props.employee.lastSeen ?? null)
})
</script>

<template>
  <span
    class="text-xs"
    :class="presence.isOnline(props.employee.id) ? 'text-green-500' : 'text-muted-color'"
  >
    {{ label }}
  </span>
</template>
