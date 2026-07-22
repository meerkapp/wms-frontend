<script setup lang="ts">
import AppStateMessage from '@/core/components/AppStateMessage.vue'

defineProps<{
  icon: string
  message: string
}>()
</script>

<template>
  <AppStateMessage :icon="icon" :title="message" subtle />
</template>
