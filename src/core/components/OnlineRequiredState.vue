<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseCard from '@/core/components/BaseCard.vue'
import type { ConnectionUnavailableReason } from '@/core/stores/connectivity.store'

const props = defineProps<{
  title: string
  reason: ConnectionUnavailableReason
}>()

const { t } = useI18n()

const presentation = computed(() => {
  const presentations = {
    checking: {
      icon: 'tabler--loader-2 animate-spin',
      title: t('app.onlineRequired.checkingTitle'),
      hint: t('app.onlineRequired.checkingHint'),
    },
    'server-unavailable': {
      icon: 'tabler--server-off',
      title: t('app.onlineRequired.serverUnavailableTitle'),
      hint: t('app.onlineRequired.serverUnavailableHint'),
    },
    offline: {
      icon: 'tabler--wifi-off',
      title: t('app.onlineRequired.offlineTitle'),
      hint: t('app.onlineRequired.offlineHint'),
    },
  }
  return presentations[props.reason]
})
</script>

<template>
  <BaseCard :title="title" class="h-full">
    <template #main>
      <div
        class="h-full flex flex-col items-center justify-center px-6 text-center text-muted-color"
        role="status"
        aria-live="polite"
      >
        <i class="iconify text-5xl opacity-40" :class="presentation.icon" />
        <p class="mt-4 font-medium text-color">{{ presentation.title }}</p>
        <p class="mt-1 max-w-72 text-sm">{{ presentation.hint }}</p>
      </div>
    </template>
  </BaseCard>
</template>
