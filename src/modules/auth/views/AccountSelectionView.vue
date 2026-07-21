<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useToast } from 'primevue/usetoast'
import { Button, Fieldset, Listbox } from 'primevue'
import BaseCard from '@/core/components/BaseCard.vue'
import AppLogo from '@/core/components/AppLogo.vue'
import { useConnectivityStore } from '@/core/stores/connectivity.store'
import AccountAvatar from '@/modules/auth/components/AccountAvatar.vue'
import { useAuthStore } from '@/modules/auth/stores/auth.store'
import { useDexieLiveQuery } from '@/modules/sync/composables/dexie-live-query'
import { localStateRepository } from '@/modules/sync/repositories/local-state.repository'
import type { DeviceAccountSummary } from '@/modules/auth/types/auth.types'
import type { LocalAccountProfile } from '@/modules/sync/types/local-state.types'

interface AccountOption extends DeviceAccountSummary {
  fullName: string
  localProfile: LocalAccountProfile | null
}

const router = useRouter()
const { t } = useI18n()
const toast = useToast()
const authStore = useAuthStore()
const connectivityStore = useConnectivityStore()
const { deviceAccounts, user, isOffline } = storeToRefs(authStore)
const { status } = storeToRefs(connectivityStore)

const selectedAccountId = ref<string | null>(user.value?.sub ?? null)
const switching = ref(false)
const localAccounts = useDexieLiveQuery(localStateRepository.listAccountProfiles, [])

const accounts = computed<AccountOption[]>(() => {
  const byId = new Map<string, AccountOption>()

  for (const localAccount of localAccounts.value) {
    byId.set(localAccount.accountId, {
      accountId: localAccount.accountId,
      firstName: localAccount.firstName,
      lastName: localAccount.lastName,
      warehouseId: localAccount.warehouseId,
      avatarUrl: localAccount.avatarUrl,
      fullName: `${localAccount.firstName} ${localAccount.lastName}`,
      localProfile: localAccount,
    })
  }

  for (const deviceAccount of deviceAccounts.value) {
    const localProfile = byId.get(deviceAccount.accountId)?.localProfile ?? null
    byId.set(deviceAccount.accountId, {
      ...deviceAccount,
      fullName: `${deviceAccount.firstName} ${deviceAccount.lastName}`,
      localProfile,
    })
  }

  return [...byId.values()].sort((left, right) => left.fullName.localeCompare(right.fullName))
})

async function switchAccount() {
  if (selectedAccountId.value === null || switching.value) return
  switching.value = true
  try {
    if (await authStore.switchAccount(selectedAccountId.value)) {
      await router.replace({ name: isOffline.value ? 'workspace' : 'sync' })
      return
    }
    toast.add({ severity: 'error', summary: t('auth.accounts.switchFailed'), life: 3000 })
  } finally {
    switching.value = false
  }
}

function addAccount() {
  void router.push({ name: 'login', query: { intent: 'add-account' } })
}

void authStore.loadDeviceAccounts()
void localStateRepository.getActiveAccountId().then((accountId) => {
  if (selectedAccountId.value === null) selectedAccountId.value = accountId
})
</script>

<template>
  <div class="h-full flex flex-col">
    <BaseCard class="m-1.5 flex-1">
      <template #main>
        <div class="h-full flex items-center justify-center">
          <div class="w-72 sm:w-96">
            <AppLogo class="mb-10" />
            <Fieldset :legend="t('auth.accounts.title')">
              <div class="space-y-3 p-2">
                <Listbox
                  v-model="selectedAccountId"
                  :options="accounts"
                  option-value="accountId"
                  option-label="fullName"
                  :filter="accounts.length > 5"
                  :filter-fields="['fullName']"
                  :filter-placeholder="t('auth.accounts.search')"
                  :pt="{ root: 'rounded-xl!', option: 'rounded-lg!' }"
                  class="w-full"
                >
                  <template #option="{ option }">
                    <div class="min-w-0 flex-1 flex items-center gap-3">
                      <AccountAvatar
                        :account-id="option.accountId"
                        :first-name="option.firstName"
                        :avatar-url="option.avatarUrl"
                        :allow-remote="status === 'online'"
                        size="normal"
                      />
                      <div class="min-w-0 flex-1 truncate">{{ option.fullName }}</div>
                    </div>
                  </template>
                  <template #empty>{{ t('auth.accounts.empty') }}</template>
                </Listbox>

                <Button
                  type="button"
                  :label="t('auth.accounts.continue')"
                  icon="iconify tabler--login-2"
                  :disabled="selectedAccountId === null"
                  :loading="switching"
                  fluid
                  rounded
                  @click="switchAccount"
                />
                <Button
                  type="button"
                  :label="t('auth.accounts.add')"
                  icon="iconify tabler--user-plus"
                  severity="secondary"
                  variant="outlined"
                  :disabled="status !== 'online'"
                  fluid
                  rounded
                  @click="addAccount"
                />
              </div>
            </Fieldset>
          </div>
        </div>
      </template>
    </BaseCard>
  </div>
</template>
