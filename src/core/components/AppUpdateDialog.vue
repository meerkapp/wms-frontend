<script setup lang="ts">
import { inject, ref, type Ref } from 'vue'
import { Button, Message } from 'primevue'
import type { DynamicDialogInstance } from 'primevue/dynamicdialogoptions'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const dialogRef = inject<Ref<DynamicDialogInstance>>('dialogRef')
const installUpdate = dialogRef?.value.data?.installUpdate as (() => Promise<void>) | undefined

const isUpdating = ref(false)
const updateFailed = ref(false)

async function update() {
  if (!installUpdate || isUpdating.value) return

  isUpdating.value = true
  updateFailed.value = false
  try {
    await installUpdate()
  } catch {
    isUpdating.value = false
    updateFailed.value = true
  }
}
</script>

<template>
  <div class="flex flex-col items-center gap-5 text-center">
    <i class="iconify tabler--refresh text-6xl text-primary" />
    <p class="text-muted-color">{{ t('app.update.description') }}</p>

    <Message v-if="updateFailed" severity="error" class="w-full">
      {{ t('app.update.failed') }}
    </Message>

    <Button
      :label="t('app.update.action')"
      icon="iconify tabler--progress-down"
      rounded
      fluid
      :loading="isUpdating"
      @click="update"
    />
  </div>
</template>
