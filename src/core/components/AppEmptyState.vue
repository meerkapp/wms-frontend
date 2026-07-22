<script setup lang="ts">
defineProps<{
  icon: string
  message: string
}>()
</script>

<template>
  <div
    class="h-full min-h-40 flex flex-col items-center justify-center px-6 text-center text-muted-color"
    role="status"
    aria-live="polite"
  >
    <i class="iconify text-5xl opacity-20" :class="icon" aria-hidden="true" />
    <p class="mt-3 text-sm font-medium opacity-60">{{ message }}</p>
  </div>
</template>
