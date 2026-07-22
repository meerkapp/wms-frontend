<script setup lang="ts">
defineProps<{ title?: string }>()
</script>

<template>
  <div class="min-h-0 overflow-hidden bg-surface-50 dark:bg-surface-900 rounded-xl flex flex-col">
    <div v-if="title || $slots.header" class="h-16 shrink-0 flex items-center justify-between px-4">
      <h2 v-if="title">{{ title }}</h2>
      <div v-if="$slots.header" class="flex gap-2">
        <slot name="header"></slot>
      </div>
    </div>
    <div class="flex-1 min-h-0 overflow-y-auto"><slot name="main"></slot></div>
    <slot name="footer"></slot>
  </div>
</template>
