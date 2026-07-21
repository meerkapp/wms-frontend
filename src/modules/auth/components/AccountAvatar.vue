<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import EmployeeAvatar from '@/modules/employee/components/EmployeeAvatar.vue'
import { localStateRepository } from '@/modules/sync/repositories/local-state.repository'

const props = withDefaults(
  defineProps<{
    accountId: string
    firstName: string
    avatarUrl: string | null
    allowRemote?: boolean
    size?: 'small' | 'normal' | 'large' | 'xlarge'
  }>(),
  {
    allowRemote: true,
    size: 'normal',
  },
)

const cachedUrl = ref<string | null>(null)
const image = computed(() => cachedUrl.value ?? (props.allowRemote ? props.avatarUrl : null))

watch(
  () => [props.accountId, props.avatarUrl] as const,
  async ([accountId, avatarUrl], _previous, onCleanup) => {
    cachedUrl.value = null
    let disposed = false
    let objectUrl: string | null = null

    onCleanup(() => {
      disposed = true
      if (objectUrl !== null) URL.revokeObjectURL(objectUrl)
    })

    if (avatarUrl === null) return
    const cachedAvatar = await localStateRepository.getAccountAvatarCache(accountId)
    if (disposed || cachedAvatar?.sourceUrl !== avatarUrl) return

    objectUrl = URL.createObjectURL(cachedAvatar.blob)
    cachedUrl.value = objectUrl
  },
  { immediate: true },
)
</script>

<template>
  <EmployeeAvatar :first-name="firstName" :image="image" :size="size" />
</template>
