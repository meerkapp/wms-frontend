<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button, ProgressSpinner } from 'primevue'

const props = defineProps<{ code: string }>()

const { t } = useI18n()
const showRetryButton = ref(false)

function redirect() {
  window.location.href = `meerk://auth?code=${props.code}`
}

onMounted(() => {
  redirect()
  setTimeout(() => {
    showRetryButton.value = true
  }, 5000)
})
</script>

<template>
  <div class="flex flex-col items-center gap-6 text-center">
    <ProgressSpinner style="width: 48px; height: 48px" />
    <p class="text-lg font-medium">{{ t('auth.launcher.redirecting') }}</p>
    <p class="text-sm text-surface-500">{{ t('auth.launcher.hint') }}</p>
    <Button
      v-if="showRetryButton"
      :label="t('auth.launcher.retry')"
      icon="iconify tabler--refresh"
      severity="secondary"
      rounded
      @click="redirect"
    />
  </div>
</template>
