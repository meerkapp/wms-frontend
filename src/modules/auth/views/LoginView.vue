<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useMutation } from '@pinia/colada'
import { useToast } from 'primevue/usetoast'
import { Button, Fieldset, FloatLabel, InputText, Message, Password } from 'primevue'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'

import BaseCard from '@/core/components/BaseCard.vue'
import Logo from '@/core/components/Logo.vue'
import LauncherRedirectMessage from '@/modules/auth/components/LauncherRedirectMessage.vue'
import { authApi } from '@/modules/auth/api/auth.api'
import { useAuthStore } from '@/modules/auth/stores/auth.store'
import { connectSocket } from '@/core/api/socket'
import { usePresenceStore } from '@/modules/employee/stores/presence.store'

const { t } = useI18n()
const router = useRouter()
const route = useRoute()
const toast = useToast()
const auth = useAuthStore()
const presence = usePresenceStore()

const launcherCode = ref<string | null>(null)

const validationSchema = computed(() =>
  toTypedSchema(
    z.object({
      email: z
        .string()
        .min(1, t('auth.login.validation.emailRequired'))
        .email(t('auth.login.validation.emailInvalid')),
      password: z.string().min(1, t('auth.login.validation.passwordRequired')),
    }),
  ),
)

const { handleSubmit, errors, defineField } = useForm({ validationSchema })

const [email, emailAttrs] = defineField('email')
const [password, passwordAttrs] = defineField('password')

const { mutate: login, isLoading } = useMutation({
  mutation: () => authApi.login({ email: email.value!, password: password.value! }),
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
    connectSocket(tokens.access_token)
    presence.setup()

    if (route.query.redirect === 'launcher') {
      const { code } = await authApi.getLauncherCode()
      launcherCode.value = code
    } else {
      router.push({ name: 'sync' })
    }
  },
})

const onSubmit = handleSubmit(() => login())
</script>

<template>
  <div class="h-screen flex flex-col">
    <BaseCard class="m-3 flex-1">
      <template #main>
        <div class="flex flex-col items-center justify-center h-full">
          <div class="w-72 sm:w-96">
            <Logo class="mb-10" />

            <!-- Launcher redirect screen -->
            <LauncherRedirectMessage v-if="launcherCode" :code="launcherCode" />

            <!-- Login form -->
            <Fieldset v-else :legend="t('auth.login.title')">
              <form class="space-y-5 px-2 py-2" @submit.prevent="onSubmit">
                <div>
                  <FloatLabel variant="on">
                    <InputText
                      id="login_email"
                      v-model="email"
                      v-bind="emailAttrs"
                      type="email"
                      autocomplete="email"
                      :invalid="!!errors.email"
                      fluid
                    />
                    <label for="login_email">{{ t('auth.login.email') }}</label>
                  </FloatLabel>
                  <Message v-if="errors.email" size="small" severity="error" variant="simple">{{ errors.email }}</Message>
                </div>
                <div>
                  <FloatLabel variant="on">
                    <Password
                      id="login_password"
                      v-model="password"
                      v-bind="passwordAttrs"
                      :feedback="false"
                      :invalid="!!errors.password"
                      toggle-mask
                      fluid
                    />
                    <label for="login_password">{{ t('auth.login.password') }}</label>
                  </FloatLabel>
                  <Message v-if="errors.password" size="small" severity="error" variant="simple">{{ errors.password }}</Message>
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
