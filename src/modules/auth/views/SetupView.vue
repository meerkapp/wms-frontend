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

const firstName = ref('')
const lastName = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const errors = ref({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '' })
const launcherCode = ref<string | null>(null)

const { mutate: setup, isLoading } = useMutation({
  mutation: () =>
    authApi.setupInit({
      email: email.value,
      password: password.value,
      firstName: firstName.value,
      lastName: lastName.value,
    }),
  onError() {
    toast.add({ severity: 'error', summary: t('common.error.network'), life: 3000 })
  },
  async onSuccess(tokens) {
    auth.setTokens(tokens.access_token)

    if (route.query.redirect === 'launcher') {
      const { code } = await authApi.getLauncherCode()
      launcherCode.value = code
    } else {
      router.push({ name: 'dashboard' })
    }
  },
})

function validate(): boolean {
  errors.value = { firstName: '', lastName: '', email: '', password: '', confirmPassword: '' }

  if (!firstName.value) errors.value.firstName = t('auth.setup.validation.firstNameRequired')
  if (!lastName.value) errors.value.lastName = t('auth.setup.validation.lastNameRequired')

  if (!email.value) {
    errors.value.email = t('auth.setup.validation.emailRequired')
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
    errors.value.email = t('auth.setup.validation.emailInvalid')
  }

  if (!password.value) {
    errors.value.password = t('auth.setup.validation.passwordRequired')
  } else if (password.value.length < 8) {
    errors.value.password = t('auth.setup.validation.passwordTooShort')
  }

  if (!confirmPassword.value) {
    errors.value.confirmPassword = t('auth.setup.validation.confirmPasswordRequired')
  } else if (confirmPassword.value !== password.value) {
    errors.value.confirmPassword = t('auth.setup.validation.passwordMismatch')
  }

  return Object.values(errors.value).every((e) => !e)
}

function handleSubmit() {
  if (!validate()) return
  setup()
}
</script>

<template>
  <div class="h-screen flex flex-col">
    <BaseCard class="m-3 flex-1">
      <template #body>
        <div class="flex flex-col items-center justify-center h-full">
          <div class="w-72 lg:w-96">
            <Logo class="mb-10" />

            <!-- Launcher redirect screen -->
            <LauncherRedirectMessage v-if="launcherCode" :code="launcherCode" />

            <!-- Setup form -->
            <Fieldset v-else :legend="t('auth.setup.title')">
              <p class="text-sm text-muted-color p-2">{{ t('auth.setup.subtitle') }}</p>
              <form class="space-y-5 p-2" @submit.prevent="handleSubmit">
                <div>
                  <FloatLabel variant="on">
                    <InputText
                      id="setup_first_name"
                      v-model="firstName"
                      autocomplete="given-name"
                      :invalid="!!errors.firstName"
                      fluid
                      @input="errors.firstName = ''"
                    />
                    <label for="setup_first_name">{{ t('auth.setup.firstName') }}</label>
                  </FloatLabel>
                  <small v-if="errors.firstName" class="text-red-500 text-xs mt-1 block">
                    {{ errors.firstName }}
                  </small>
                </div>
                <div>
                  <FloatLabel variant="on">
                    <InputText
                      id="setup_last_name"
                      v-model="lastName"
                      autocomplete="family-name"
                      :invalid="!!errors.lastName"
                      fluid
                      @input="errors.lastName = ''"
                    />
                    <label for="setup_last_name">{{ t('auth.setup.lastName') }}</label>
                  </FloatLabel>
                  <small v-if="errors.lastName" class="text-red-500 text-xs mt-1 block">
                    {{ errors.lastName }}
                  </small>
                </div>
                <div>
                  <FloatLabel variant="on">
                    <InputText
                      id="setup_email"
                      v-model="email"
                      type="email"
                      autocomplete="email"
                      :invalid="!!errors.email"
                      fluid
                      @input="errors.email = ''"
                    />
                    <label for="setup_email">{{ t('auth.setup.email') }}</label>
                  </FloatLabel>
                  <small v-if="errors.email" class="text-red-500 text-xs mt-1 block">
                    {{ errors.email }}
                  </small>
                </div>
                <div>
                  <FloatLabel variant="on">
                    <Password
                      id="setup_password"
                      v-model="password"
                      :feedback="true"
                      :invalid="!!errors.password"
                      toggle-mask
                      fluid
                      @input="errors.password = ''"
                    />
                    <label for="setup_password">{{ t('auth.setup.password') }}</label>
                  </FloatLabel>
                  <small v-if="errors.password" class="text-red-500 text-xs mt-1 block">
                    {{ errors.password }}
                  </small>
                  <small v-else class="text-surface-500 text-xs mt-1 block">
                    {{ t('auth.setup.passwordHint') }}
                  </small>
                </div>
                <div>
                  <FloatLabel variant="on">
                    <Password
                      id="setup_confirm_password"
                      v-model="confirmPassword"
                      :feedback="false"
                      :invalid="!!errors.confirmPassword"
                      toggle-mask
                      fluid
                      @input="errors.confirmPassword = ''"
                    />
                    <label for="setup_confirm_password">{{
                      t('auth.setup.confirmPassword')
                    }}</label>
                  </FloatLabel>
                  <small v-if="errors.confirmPassword" class="text-red-500 text-xs mt-1 block">
                    {{ errors.confirmPassword }}
                  </small>
                </div>
                <Button
                  type="submit"
                  :label="t('auth.setup.submit')"
                  icon="iconify tabler--user-check"
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
