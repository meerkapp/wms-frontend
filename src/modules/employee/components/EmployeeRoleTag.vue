<script lang="ts" setup>
import { Tag } from 'primevue'
import type { Role } from '@meerkapp/wms-contracts'

const props = defineProps<{ name: Role['name']; color?: Role['color'] }>()
</script>

<template>
  <Tag
    :value="props.name"
    :style="props.color ? `color: ${props.color}` : ''"
    icon="iconify tabler--shield-filled"
    class="text-xs! font-medium!"
  />
</template>
