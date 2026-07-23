<script setup lang="ts">
import { DynamicDialog, ConfirmDialog, Toast } from 'primevue'
import { onBeforeUnmount, onMounted, ref, watch, watchEffect } from 'vue'
import { storeToRefs } from 'pinia'
import { usePrimeVue } from 'primevue/config'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import AppStatusBar from '@/core/components/AppStatusBar.vue'
import { APP_CONFIRM_GROUP } from '@/core/composables/useAppConfirm'
import { APP_TOAST_GROUP, useAppToast } from '@/core/composables/useAppToast'
import { useConnectivityStore } from '@/core/stores/connectivity.store'
import { useThemeStore } from '@/core/stores/theme.store'
import { useAccountAvatarStore } from '@/modules/auth/stores/account-avatar.store'
import {
  accountSessionChannel,
  type AccountSessionMessage,
} from '@/modules/auth/services/account-session-channel'
import { useAuthStore, type CrossTabAccountTransition } from '@/modules/auth/stores/auth.store'
import { dayjs } from '@/plugins/dayjs'

const themeStore = useThemeStore()
const connectivityStore = useConnectivityStore()
const accountAvatarStore = useAccountAvatarStore()
const authStore = useAuthStore()
const router = useRouter()
const toast = useAppToast()
const primevue = usePrimeVue()
const { locale, t, tm } = useI18n()
const { isDarkTheme } = storeToRefs(themeStore)
const { status, statusColor } = storeToRefs(connectivityStore)
const ACCOUNT_SESSION_TOAST_LIFE_MS = 4000

// Tailwind v4 no longer exposes --tw-gradient-stops, so the connection
// gradient is applied as plain CSS while the composition root owns both stores.
const connectionGradients = {
  green: {
    light: 'radial-gradient(circle 600px at bottom left, rgb(74 222 128 / 0.2), transparent)',
    dark: 'radial-gradient(circle 600px at bottom left, rgb(34 197 94 / 0.2), transparent)',
  },
  red: {
    light: 'radial-gradient(circle 600px at bottom left, rgb(248 113 113 / 0.2), transparent)',
    dark: 'radial-gradient(circle 600px at bottom left, rgb(239 68 68 / 0.2), transparent)',
  },
  yellow: {
    light: 'radial-gradient(circle 600px at bottom left, rgb(251 191 36 / 0.2), transparent)',
    dark: 'radial-gradient(circle 600px at bottom left, rgb(234 179 8 / 0.2), transparent)',
  },
} as const

let unsubscribeFromAccountSession = () => {}
const accountSessionOperations = ref(0)

async function applyAccountTransition(transition: CrossTabAccountTransition) {
  if (transition === 'ignored') return

  if (transition === 'deactivated') {
    const accountIds = await authStore.listAvailableAccountIds()
    await router.replace({
      name: accountIds.length > 0 ? 'account-selection' : 'login',
    })
    toast.info(t('auth.accounts.signedOutInAnotherTab'), {
      life: ACCOUNT_SESSION_TOAST_LIFE_MS,
    })
    return
  }

  await router.replace({
    name: transition === 'activated-offline' ? 'workspace' : 'sync',
  })
  toast.info(t('auth.accounts.switchedInAnotherTab'), {
    life: ACCOUNT_SESSION_TOAST_LIFE_MS,
  })
}

async function applyAccountSessionMessage(message: AccountSessionMessage) {
  accountSessionOperations.value += 1
  try {
    await applyAccountTransition(await authStore.applyAccountSessionMessage(message))
  } finally {
    accountSessionOperations.value -= 1
  }
}

function reconcileAccountSession() {
  // Startup with multiple saved accounts must remain an explicit choice.
  // Focus reconciliation only repairs an already active tab that missed an event.
  if (!authStore.canAccessWorkspace) return
  accountSessionOperations.value += 1
  void authStore
    .reconcileActiveAccount()
    .then(applyAccountTransition)
    .catch((error) => console.error('[auth:cross-tab-reconcile]', error))
    .finally(() => {
      accountSessionOperations.value -= 1
    })
}

function syncLocale(l: string) {
  Object.assign(primevue.config.locale ?? {}, tm('primevue'))
  dayjs.locale(l)
}

watch(locale, syncLocale, { immediate: true })
watchEffect(() => {
  const variant = isDarkTheme.value ? 'dark' : 'light'
  document.body.style.backgroundImage = connectionGradients[statusColor.value][variant]
})

watch(
  () => authStore.user?.sub ?? null,
  (accountId) => {
    void themeStore.loadTheme(accountId).catch((error) => console.error('[theme:load]', error))
  },
  { immediate: true },
)

watch(
  [
    () => authStore.user?.sub ?? null,
    () => authStore.user?.avatarUrl ?? null,
    () => authStore.isOffline,
  ],
  ([accountId, sourceUrl, isOffline]) => {
    void accountAvatarStore
      .load({ accountId, sourceUrl, allowRemote: !isOffline })
      .catch((error) => console.error('[account-avatar:load]', error))
  },
  { immediate: true },
)

onMounted(() => {
  themeStore.startSystemThemeMonitoring()
  connectivityStore.startMonitoring()
  unsubscribeFromAccountSession = accountSessionChannel.subscribe((message) => {
    void applyAccountSessionMessage(message).catch((error) =>
      console.error('[auth:cross-tab]', error),
    )
  })
  window.addEventListener('focus', reconcileAccountSession)
})

onBeforeUnmount(() => {
  window.removeEventListener('focus', reconcileAccountSession)
  unsubscribeFromAccountSession()
  accountAvatarStore.clear()
  themeStore.stopSystemThemeMonitoring()
  connectivityStore.stopMonitoring()
})

watch(
  [
    () => authStore.canAccessWorkspace,
    () => authStore.isCrossTabTransitioning,
    accountSessionOperations,
  ],
  ([canAccessWorkspace, isCrossTabTransitioning, activeOperations]) => {
    if (
      !canAccessWorkspace &&
      !isCrossTabTransitioning &&
      activeOperations === 0 &&
      router.currentRoute.value.meta.requiresAuth
    ) {
      void router.replace({ name: 'login' })
    }
  },
)

watch(
  status,
  (nextStatus) => {
    if (nextStatus === 'online' && authStore.isOffline) {
      void authStore.refresh().catch((error) => console.error('[auth:restore-online]', error))
      return
    }
    if (
      (nextStatus === 'offline' ||
        nextStatus === 'server-unavailable' ||
        nextStatus === 'update-required') &&
      authStore.isAuthenticated
    ) {
      void authStore
        .activateOfflineSession()
        .catch((error) => console.error('[auth:enter-offline]', error))
    }
  },
  { immediate: true },
)
</script>

<template>
  <div class="h-dvh flex flex-col overflow-hidden">
    <DynamicDialog :key="authStore.user?.sub ?? 'anonymous'" />
    <ConfirmDialog
      :key="authStore.user?.sub ?? 'anonymous'"
      :group="APP_CONFIRM_GROUP"
      :draggable="false"
      style="width: min(34rem, calc(100vw - 2rem))"
      :pt="{
        root: { class: 'overflow-hidden rounded-2xl!' },
        header: { class: 'px-5! pt-5! pb-3!' },
        title: { class: 'text-xl!' },
        content: { class: 'min-w-0 items-start! gap-4! px-5! py-3!' },
        icon: { class: 'mt-0.5 shrink-0 text-3xl!' },
        message: { class: 'min-w-0 whitespace-normal text-base! leading-relaxed' },
        footer: { class: 'gap-2 px-5! pt-2! pb-5!' },
        pcRejectButton: { root: { class: 'rounded-full!' } },
        pcAcceptButton: { root: { class: 'rounded-full!' } },
      }"
    />
    <Toast
      :key="authStore.user?.sub ?? 'anonymous'"
      :group="APP_TOAST_GROUP"
      position="center"
      :pt="{
        root: { class: 'min-w-0! w-max! max-w-[calc(100vw-2rem)]!' },
        message: {
          class: 'm-0! w-max! max-w-full! shadow-lg!',
        },
        messageContent: { class: 'w-max! max-w-full! items-center! gap-3! px-4! py-2.5!' },
        messageIcon: { class: 'shrink-0 text-xl! text-current!' },
        messageText: { class: 'w-max! min-w-0 max-w-full!' },
        summary: { class: 'whitespace-normal break-words text-sm! font-medium! leading-snug!' },
        detail: { class: 'mt-0.5! text-sm! opacity-80' },
        closeButton: { class: 'hidden!' },
      }"
    />
    <div class="flex-1 min-h-0">
      <router-view v-slot="{ Component }">
        <Transition
          mode="out-in"
          enter-active-class="transition-opacity duration-500"
          leave-active-class="transition-opacity duration-500"
          enter-from-class="opacity-0"
          leave-to-class="opacity-0"
        >
          <component :is="Component" />
        </Transition>
      </router-view>
    </div>
    <AppStatusBar />
  </div>
</template>

<style scoped></style>
