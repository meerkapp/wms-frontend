<script lang="ts" setup>
import { inject, type Ref } from 'vue'
import { Button, Message } from 'primevue'
import type { DynamicDialogInstance } from 'primevue/dynamicdialogoptions'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import { useI18n } from 'vue-i18n'
import { useMutation } from '@pinia/colada'
import { useToast } from 'primevue/usetoast'
import { employeeApi } from '../api/employee.api'
import EmployeePasswordInput from './EmployeePasswordInput.vue'
import { parseApiError } from '@/core/api/errors'

const dialogRef = inject<Ref<DynamicDialogInstance>>('dialogRef')

const { t } = useI18n()
const toast = useToast()

const validationSchema = toTypedSchema(
  z.object({
    currentPassword: z
      .string({ required_error: t('employee.changePassword.validation.currentPasswordRequired') })
      .min(1, t('employee.changePassword.validation.currentPasswordRequired')),
    newPassword: z
      .string({ required_error: t('employee.changePassword.validation.newPasswordRequired') })
      .min(8, t('employee.form.validation.passwordTooShort')),
  }),
)

const { handleSubmit, errors, defineField, setFieldError } = useForm({ validationSchema })

const [currentPassword, currentPasswordAttrs] = defineField('currentPassword')
const [newPassword, newPasswordAttrs] = defineField('newPassword')

const { mutate, asyncStatus } = useMutation({
  mutation: (dto: { currentPassword: string; newPassword: string }) =>
    employeeApi.updateMePassword(dto),
  onSuccess: () => {
    toast.add({ severity: 'success', summary: t('employee.changePassword.success'), life: 3000 })
    dialogRef?.value.close()
  },
  onError: (error) => {
    const apiError = parseApiError(error)
    if (apiError?.status === 401) {
      setFieldError('currentPassword', t('employee.changePassword.validation.incorrectPassword'))
    } else {
      toast.add({ severity: 'error', summary: t('common.error.network'), life: 3000 })
    }
  },
})

const onSubmit = handleSubmit((values) => {
  mutate({ currentPassword: values.currentPassword, newPassword: values.newPassword })
})
</script>

<template>
  <form class="mt-1 space-y-5" @submit.prevent="onSubmit">
    <div>
      <EmployeePasswordInput
        v-model="currentPassword"
        v-bind="currentPasswordAttrs"
        input-id="current_password"
        :show-generate="false"
        :invalid="!!errors.currentPassword"
        :label="t('employee.changePassword.currentPassword')"
      />
      <Message v-if="errors.currentPassword" size="small" severity="error" variant="simple">{{
        errors.currentPassword
      }}</Message>
    </div>
    <div>
      <EmployeePasswordInput
        v-model="newPassword"
        v-bind="newPasswordAttrs"
        input-id="new_password"
        :invalid="!!errors.newPassword"
        :label="t('employee.changePassword.newPassword')"
      />
      <Message v-if="errors.newPassword" size="small" severity="error" variant="simple">{{
        errors.newPassword
      }}</Message>
    </div>
    <Button
      type="submit"
      :label="t('common.save')"
      :loading="asyncStatus === 'loading'"
      rounded
      fluid
    />
  </form>
</template>
