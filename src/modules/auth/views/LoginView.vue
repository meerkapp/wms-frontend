<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useMutation } from '@pinia/colada'
import { useToast } from 'primevue/usetoast'
import { Button, Fieldset, FloatLabel, InputText, Password } from 'primevue'

import BaseCard from '@/core/components/BaseCard.vue'
import Logo from '@/core/components/Logo.vue'
import LauncherRedirectMessage from '@/modules/auth/components/LauncherRedirectMessage.vue'
import { authApi } from '@/modules/auth/api/auth.api'
import { useAuthStore } from '@/modules/auth/stores/auth.store'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const toast = useToast()
const auth = useAuthStore()

const email = ref('')
const password = ref('')
const errors = ref({ email: '', password: '' })
const launcherCode = ref<string | null>(null)

const { mutate: login, isLoading } = useMutation({
  mutation: () => authApi.login({ email: email.value, password: password.value }),
  onError(error: unknown) {
    const status = (error as { response?: { status?: number } })?.response?.status
    if (status === 401) {
      toast.add({ severity: 'error', summary: t('auth.login.error'), life: 3000 })
    } else {
      toast.add({ severity: 'error', summary: t('common.error.network'), life: 3000 })
    }
  },
  async onSuccess(tokens) {
    auth.setTokens(tokens.access_token)

    if (route.query.redirect === 'launcher') {
      const { code } = await authApi.getLauncherCode()
      launcherCode.value = code
    } else {
      router.push({ name: 'sync' })
    }
  },
})

function validate(): boolean {
  errors.value = { email: '', password: '' }

  if (!email.value) {
    errors.value.email = t('auth.login.validation.emailRequired')
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
    errors.value.email = t('auth.login.validation.emailInvalid')
  }

  if (!password.value) {
    errors.value.password = t('auth.login.validation.passwordRequired')
  }

  return !errors.value.email && !errors.value.password
}

function handleSubmit() {
  if (!validate()) return
  login()
}
</script>

<template>
  <div class="h-screen flex flex-col">
    <BaseCard class="m-3 flex-1">
      <template #body>
        <div class="flex flex-col items-center justify-center h-full">
          <div class="w-72 sm:w-96">
            <Logo class="mb-10" />

            <!-- Launcher redirect screen -->
            <LauncherRedirectMessage v-if="launcherCode" :code="launcherCode" />

            <!-- Login form -->
            <Fieldset v-else :legend="t('auth.login.title')">
              <form class="space-y-5 px-2 py-2" @submit.prevent="handleSubmit">
                <div>
                  <FloatLabel variant="on">
                    <InputText
                      id="login_email"
                      v-model="email"
                      type="email"
                      autocomplete="email"
                      :invalid="!!errors.email"
                      fluid
                      @input="errors.email = ''"
                    />
                    <label for="login_email">{{ t('auth.login.email') }}</label>
                  </FloatLabel>
                  <small v-if="errors.email" class="text-red-500 text-xs mt-1 block">
                    {{ errors.email }}
                  </small>
                </div>
                <div>
                  <FloatLabel variant="on">
                    <Password
                      id="login_password"
                      v-model="password"
                      :feedback="false"
                      :invalid="!!errors.password"
                      toggle-mask
                      fluid
                      @input="errors.password = ''"
                    />
                    <label for="login_password">{{ t('auth.login.password') }}</label>
                  </FloatLabel>
                  <small v-if="errors.password" class="text-red-500 text-xs mt-1 block">
                    {{ errors.password }}
                  </small>
                </div>
                <Button
                  type="submit"
                  :label="t('auth.login.submit')"
                  icon="iconify tabler--login-2"
                  :loading="isLoading"
                  fluid
                  rounded
                />
              </form>
            </Fieldset>
          </div>
        </div>
      </template>
    </BaseCard>
  </div>
</template>
