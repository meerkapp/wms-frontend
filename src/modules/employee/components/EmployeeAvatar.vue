<script lang="ts" setup>
import { computed } from 'vue'
import { Avatar } from 'primevue'

const props = withDefaults(
  defineProps<{
    firstName?: string
    image?: string
    size?: 'normal' | 'large' | 'xlarge'
  }>(),
  {
    size: 'normal',
  },
)

const initial = computed(() => props.firstName?.charAt(0).toUpperCase())
</script>

<template>
  <Avatar
    :image="image"
    :label="!image && initial ? initial : undefined"
    :icon="!image && !initial ? 'iconify tabler--user' : undefined"
    :size="size"
    shape="circle"
  />
</template>
