<script lang="ts" setup>
import { computed } from 'vue'
import { Avatar } from 'primevue'

const props = withDefaults(
  defineProps<{
    firstName?: string
    image?: string | null
    size?: 'small' | 'normal' | 'large' | 'xlarge'
    shape?: 'circle' | 'square'
  }>(),
  {
    size: 'normal',
    shape: 'circle',
  },
)

const initial = computed(() => props.firstName?.charAt(0).toUpperCase())
const avatarSize = computed(() => (props.size === 'small' ? 'normal' : props.size))
</script>

<template>
  <Avatar
    :image="image ?? undefined"
    :label="!image && initial ? initial : undefined"
    :icon="!image && !initial ? 'iconify tabler--user' : undefined"
    :size="avatarSize"
    :class="{ 'w-5! h-5! text-xs!': size === 'small' }"
    :shape="props.shape"
    :pt="{ image: props.shape === 'square' ? 'rounded-xl!' : 'rounded-full!' }"
  />
</template>
