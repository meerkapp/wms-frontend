<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  type: string
  active?: boolean
}>()

const iconConfig = computed(() => {
  const configs: Record<string, { icon: string; color: string }> = {
    folder: {
      icon: props.active ? 'tabler--folder-open' : 'tabler--folder',
      color: 'text-amber-400',
    },
    product_collection: { icon: 'tabler--table-dashed', color: 'text-blue-400' },
    text_document: { icon: 'tabler--file-text', color: 'text-emerald-400' },
    product_favorites: { icon: 'tabler--table-heart', color: 'text-pink-400' },
    product_archive: { icon: 'tabler--archive', color: 'text-gray-400' },
  }
  return configs[props.type] ?? { icon: 'tabler--file', color: 'text-gray-400' }
})
</script>

<template>
  <span :class="['iconify flex-none', iconConfig.icon, iconConfig.color]" />
</template>
