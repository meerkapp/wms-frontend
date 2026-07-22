<script setup lang="ts">
withDefaults(
  defineProps<{
    icon: string
    title: string
    description?: string
    subtle?: boolean
  }>(),
  {
    subtle: false,
  },
)
</script>

<template>
  <div
    class="h-full min-h-40 flex flex-col items-center justify-center px-6 text-center text-muted-color"
    role="status"
    aria-live="polite"
  >
    <i
      class="iconify text-5xl"
      :class="[icon, subtle ? 'opacity-20' : 'opacity-40']"
      aria-hidden="true"
    />
    <p class="mt-4 font-medium" :class="subtle ? 'text-sm opacity-60' : 'text-color'">
      {{ title }}
    </p>
    <p v-if="description" class="mt-1 max-w-72 text-sm">{{ description }}</p>
  </div>
</template>
