<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { Button, Message, ProgressBar } from 'primevue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/modules/auth/stores/auth.store'
import EmployeeAvatar from '@/modules/employee/components/EmployeeAvatar.vue'
import { localSyncService } from '../services/sync.service'

const authStore = useAuthStore()
const { user, accessToken } = storeToRefs(authStore)
const router = useRouter()
const syncState = localSyncService.state
const navigating = ref(false)

const progress = computed(() =>
  syncState.total > 0 ? Math.round((syncState.current / syncState.total) * 100) : 0,
)

async function openWorkspace() {
  if (navigating.value) return
  navigating.value = true
  await router.replace({ name: 'workspace' })
}

async function runInitialSync(force = false) {
  const token = accessToken.value
  const account = user.value
  if (!token || !account) return

  localSyncService.start(token, {
    accountId: account.sub,
    homeWarehouseId: account.warehouseId,
  })
  if (!force && syncState.status === 'done') {
    await openWorkspace()
    return
  }

  try {
    await localSyncService.syncAll({ reason: force ? 'retry' : 'initial' })
    if (syncState.status === 'done') await openWorkspace()
  } catch {
    // The singleton exposes the actionable error and keeps the app alive.
  }
}

onMounted(() => void runInitialSync())
</script>

<template>
  <div class="h-full flex flex-col justify-center">
    <div class="text-center">
      <EmployeeAvatar
        :first-name="user?.firstName"
        :image="user?.avatarUrl"
        size="xlarge"
        class="mr-2"
      />
      <p class="text-2xl m-5 font-light">
        {{ $t('sync.greeting', { firstName: user?.firstName, lastName: user?.lastName }) }}
      </p>

      <div class="m-auto w-72 sm:w-96">
        <Message v-if="syncState.status === 'error'" severity="error" class="mb-4">
          <div class="text-left">
            <p class="font-medium">{{ $t('sync.errorTitle') }}</p>
            <p class="text-sm">{{ $t('sync.errorHint') }}</p>
            <details v-if="syncState.error" class="mt-2 text-xs">
              <summary class="cursor-pointer">{{ $t('sync.technicalDetails') }}</summary>
              <p class="mt-1 break-words">{{ syncState.error }}</p>
            </details>
          </div>
        </Message>

        <ProgressBar
          v-if="syncState.status !== 'error'"
          :value="progress"
          :show-value="false"
          style="height: 3px"
        />
        <p v-if="syncState.currentTable" class="mt-3 text-sm text-muted-color">
          {{
            $t('sync.currentTable', {
              table: $t(`sync.tables.${syncState.currentTable}`),
            })
          }}
          ({{ syncState.current }}/{{ syncState.total }})
        </p>
        <p v-else-if="syncState.status !== 'error'" class="mt-3 text-sm text-muted-color">
          {{ $t('sync.preparing') }}
        </p>

        <Button
          v-if="syncState.status === 'error'"
          :label="$t('sync.retry')"
          icon="iconify tabler--refresh"
          rounded
          @click="runInitialSync(true)"
        />
      </div>
    </div>
  </div>
</template>
