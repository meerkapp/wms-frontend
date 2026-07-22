<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import BaseCard from '@/core/components/BaseCard.vue'
import AppStateMessage from '@/core/components/AppStateMessage.vue'
import type { ConnectionUnavailableReason } from '@/core/stores/connectivity.store'

const props = withDefaults(
  defineProps<{
    title: string
    reason: ConnectionUnavailableReason
    embedded?: boolean
  }>(),
  { embedded: false },
)

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
    'update-required': {
      icon: 'tabler--refresh-alert',
      title: t('app.onlineRequired.updateRequiredTitle'),
      hint: t('app.onlineRequired.updateRequiredHint'),
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
  <AppStateMessage
    v-if="embedded"
    :icon="presentation.icon"
    :title="presentation.title"
    :description="presentation.hint"
  />
  <BaseCard v-else :title="title" class="h-full">
    <template #main>
      <AppStateMessage
        :icon="presentation.icon"
        :title="presentation.title"
        :description="presentation.hint"
      />
    </template>
  </BaseCard>
</template>
