<script setup lang="ts">
import { DynamicDialog, ConfirmDialog, Toast } from 'primevue'
import { onMounted, watch } from 'vue'
import { usePrimeVue } from 'primevue/config'
import { useI18n } from 'vue-i18n'
import { useThemeStore } from '@/core/stores/theme.store'
import BaseCard from '@/core/components/BaseCard.vue'
import { dayjs } from '@/plugins/dayjs'

const themeStore = useThemeStore()
const primevue = usePrimeVue()
const { locale, tm } = useI18n()

function syncLocale(l: string) {
  Object.assign(primevue.config.locale ?? {}, tm('primevue'))
  dayjs.locale(l)
}

watch(locale, syncLocale, { immediate: true })

onMounted(() => {
  themeStore.loadTheme()
})
</script>

<template>
  <DynamicDialog />
  <ConfirmDialog />
  <Toast position="top-center" />
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
</template>

<style scoped></style>
