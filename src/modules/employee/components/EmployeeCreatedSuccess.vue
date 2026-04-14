<script lang="ts" setup>
import { ref } from 'vue'
import { Button } from 'primevue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{ email: string; password: string }>()

const { t } = useI18n()

const copied = ref(false)
const showPassword = ref(false)

async function copyCredentials() {
  const text = `${t('employee.form.email')}: ${props.email}\n${t('employee.form.password')}: ${props.password}`
  await navigator.clipboard.writeText(text)
  copied.value = true
  setTimeout(() => (copied.value = false), 2000)
}
</script>

<template>
  <div class="flex flex-col items-center gap-6 p-4 text-center">
    <i class="iconify tabler--circle-check text-6xl text-green-500" />

    <div>
      <h3 class="text-lg font-semibold">{{ t('employee.created.title') }}</h3>
      <p class="text-muted-color mt-1">{{ t('employee.created.subtitle') }}</p>
    </div>

    <div class="w-full bg-surface-100 dark:bg-surface-800 rounded-lg p-4 text-left space-y-2">
      <div class="flex justify-between items-center">
        <span class="text-xs text-muted-color">{{ t('employee.form.email') }}</span>
        <span class="font-medium">{{ email }}</span>
      </div>
      <div class="flex justify-between items-center">
        <span class="text-xs text-muted-color">{{ t('employee.form.password') }}</span>
        <div class="flex items-center gap-1">
          <span class="font-medium font-mono">{{ showPassword ? password : '••••••••' }}</span>
          <Button
            :icon="showPassword ? 'iconify tabler--eye-off' : 'iconify tabler--eye'"
            variant="text"
            severity="secondary"
            size="small"
            rounded
            @click="showPassword = !showPassword"
          />
        </div>
      </div>
    </div>

    <Button
      :label="copied ? t('employee.created.copied') : t('employee.created.copyCredentials')"
      :icon="copied ? 'iconify tabler--check' : 'iconify tabler--copy'"
      :severity="copied ? 'success' : 'secondary'"
      rounded
      fluid
      @click="copyCredentials"
    />
  </div>
</template>
