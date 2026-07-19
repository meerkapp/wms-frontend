<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { Tag } from 'primevue'
import { useConnectivityStore } from '@/core/stores/connectivity.store'
import { useThemeStore } from '@/core/stores/theme.store'

const { t } = useI18n()
const connectivityStore = useConnectivityStore()
const themeStore = useThemeStore()
const { status } = storeToRefs(connectivityStore)
const { isDarkTheme } = storeToRefs(themeStore)
const appVersion = __APP_VERSION__

function toggleTheme() {
  void themeStore.toggleTheme().catch((error) => console.error('[theme:persist]', error))
}

const statusPresentation = computed(() => {
  const presentations = {
    checking: {
      label: t('app.statusBar.checking'),
      severity: 'secondary',
    },
    online: {
      label: t('app.statusBar.online'),
      severity: 'success',
    },
    'server-unavailable': {
      label: t('app.statusBar.serverUnavailable'),
      severity: 'warn',
    },
    offline: {
      label: t('app.statusBar.offline'),
      severity: 'danger',
    },
  }
  return presentations[status.value]
})
</script>

<template>
  <footer
    class="h-6 mb-1.5 mx-1.5 shrink-0 flex items-center justify-between text-xs text-surface-800 dark:text-color select-none"
  >
    <Tag
      :severity="statusPresentation.severity"
      icon="iconify tabler--circle-filled animate-pulse"
      class="text-xs!"
      rounded
    >
      {{ statusPresentation.label }}
    </Tag>
    <div class="h-full flex items-center">
      <button
        type="button"
        class="h-full flex items-center rounded-full gap-2 px-3 hover:bg-surface-200 active:bg-surface-300 dark:hover:bg-surface-700 dark:active:bg-surface-600"
        @click="toggleTheme"
      >
        <i
          class="iconify text-xs!"
          :class="isDarkTheme ? 'tabler--moon-filled' : 'tabler--sun-filled'"
        />
        <span>{{
          isDarkTheme ? t('app.statusBar.darkTheme') : t('app.statusBar.lightTheme')
        }}</span>
      </button>
      <div class="h-full flex items-center gap-2 px-3">
        <i class="iconify tabler--code text-xs!" />
        <span>{{ t('app.statusBar.version', { version: appVersion }) }}</span>
      </div>
    </div>
  </footer>
</template>
