<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { Button, Tag } from 'primevue'
import { useToast } from 'primevue/usetoast'
import { useAppDialog } from '@/core/composables/useAppDialog'
import { useAppUpdate } from '@/core/composables/useAppUpdate'
import { useConnectivityStore } from '@/core/stores/connectivity.store'
import { useThemeStore } from '@/core/stores/theme.store'
import { appVersion } from '@/core/version/app-version'
import AppUpdateDialog from '@/core/components/AppUpdateDialog.vue'

const { t } = useI18n()
const dialog = useAppDialog()
const toast = useToast()
const connectivityStore = useConnectivityStore()
const themeStore = useThemeStore()
const { status } = storeToRefs(connectivityStore)
const { isDarkTheme } = storeToRefs(themeStore)
const { checkForUpdate, installUpdate, isUpdateAvailable, isUpdating } = useAppUpdate()
let updateDialog: ReturnType<typeof dialog.open> | undefined

const themeButtonLabel = computed(() =>
  isDarkTheme.value ? t('app.statusBar.darkTheme') : t('app.statusBar.lightTheme'),
)
const themeButtonIcon = computed(() =>
  isDarkTheme.value ? 'iconify tabler--moon-filled' : 'iconify tabler--sun-filled',
)

function toggleTheme() {
  void themeStore.toggleTheme().catch((error) => console.error('[theme:persist]', error))
}

function openUpdateDialog() {
  if (updateDialog) return

  updateDialog = dialog.open(AppUpdateDialog, {
    props: {
      header: t('app.update.title'),
      modal: true,
      style: { width: 'min(30rem, calc(100vw - 2rem))' },
    },
    data: { installUpdate },
    onClose: () => {
      updateDialog = undefined
    },
  })
}

async function updateApplication() {
  try {
    await installUpdate()
  } catch {
    toast.add({ severity: 'error', summary: t('app.update.failed'), life: 5000 })
  }
}

function requestUpdateCheck() {
  if (status.value !== 'online' && status.value !== 'update-required') return
  void checkForUpdate().catch((error) => console.error('[pwa:update-check]', error))
}

watch(status, (nextStatus) => {
  if (nextStatus === 'online' || nextStatus === 'update-required') requestUpdateCheck()
})

watch(isUpdateAvailable, (available) => {
  if (!available) return
  connectivityStore.requireUpdate()
  openUpdateDialog()
})

onMounted(() => {
  window.addEventListener('focus', requestUpdateCheck)
  if (isUpdateAvailable.value) {
    connectivityStore.requireUpdate()
    openUpdateDialog()
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('focus', requestUpdateCheck)
})

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
    'update-required': {
      label: t('app.statusBar.updateRequired'),
      severity: 'warn',
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
  <footer class="h-6 mb-1.5 mx-1.5 shrink-0 flex items-center justify-between text-xs select-none">
    <div class="h-full flex items-center gap-3">
      <Tag
        :severity="statusPresentation.severity"
        icon="iconify tabler--circle-filled animate-pulse"
        class="text-xs!"
        rounded
      >
        {{ statusPresentation.label }}
      </Tag>
      <div v-if="isUpdateAvailable" class="h-full flex items-center gap-1.5">
        <i class="iconify tabler--refresh text-xs!" />
        <span>{{ t('app.update.available') }}</span>
        <Button
          :label="t('app.update.action')"
          icon="iconify tabler--progress-down"
          size="small"
          class="h-full! px-3! py-0! text-xs!"
          :pt="{
            icon: { class: 'text-xs!' },
            label: { class: 'font-normal!' },
          }"
          rounded
          :loading="isUpdating"
          @click="updateApplication"
        />
      </div>
    </div>
    <div class="h-full flex items-center gap-3">
      <Button
        :label="themeButtonLabel"
        :icon="themeButtonIcon"
        size="small"
        variant="outlined"
        class="h-full! px-3! py-0! text-xs!"
        :pt="{
          icon: { class: 'text-xs!' },
          label: { class: 'font-normal!' },
        }"
        rounded
        @click="toggleTheme"
      />
      <div class="h-full flex items-center gap-1.5 pr-3">
        <i class="iconify tabler--code text-xs!" />
        <span>{{ t('app.statusBar.version', { version: appVersion }) }}</span>
      </div>
    </div>
  </footer>
</template>
