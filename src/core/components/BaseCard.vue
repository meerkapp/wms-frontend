<script setup lang="ts">
const props = defineProps<{ title?: string }>()
</script>

<template>
  <div class="bg-surface-50 dark:bg-surface-900 rounded-xl flex flex-col">
    <div v-if="title || $slots.header" class="p-4">
      <h2 v-if="title">{{ title }}</h2>
      <slot name="header"></slot>
    </div>
    <div class="flex-1"><slot name="body"></slot></div>
    <slot name="footer"></slot>
  </div>
</template>
