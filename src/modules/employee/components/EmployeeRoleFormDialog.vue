<script lang="ts" setup>
import { inject, type Ref } from 'vue'
import { Button, FloatLabel, InputText, Message } from 'primevue'
import type { DynamicDialogInstance } from 'primevue/dynamicdialogoptions'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import { useI18n } from 'vue-i18n'
import { useMutation } from '@pinia/colada'
import { useToast } from 'primevue/usetoast'
import type { Role } from '@meerkapp/wms-contracts'
import { roleApi } from '@/modules/employee/api/role.api'
import EmployeeRoleColorSelect from './EmployeeRoleColorSelect.vue'

const dialogRef = inject<Ref<DynamicDialogInstance>>('dialogRef')

const { t } = useI18n()
const toast = useToast()

const existingRole = dialogRef?.value.data?.role as Role | undefined
const isEdit = !!existingRole

const validationSchema = toTypedSchema(
  z.object({
    name: z
      .string({ required_error: t('role.form.validation.nameRequired') })
      .min(1, t('role.form.validation.nameRequired')),
    color: z
      .string({ required_error: t('role.form.validation.colorRequired') })
      .min(1, t('role.form.validation.colorRequired')),
  }),
)

const { handleSubmit, errors, defineField } = useForm({
  validationSchema,
  initialValues: { name: existingRole?.name ?? '', color: existingRole?.color ?? '' },
})
const [name, nameAttrs] = defineField('name')
const [color] = defineField('color')

const onNetworkError = () =>
  toast.add({ severity: 'error', summary: t('common.error.network'), life: 3000 })

const { mutate: createRole } = useMutation({
  mutation: (dto: Parameters<typeof roleApi.create>[0]) => roleApi.create(dto),
  onSuccess: (role) => dialogRef?.value.close(role),
  onError: onNetworkError,
})

const { mutate: updateRole } = useMutation({
  mutation: (dto: Parameters<typeof roleApi.update>[1]) => roleApi.update(existingRole!.id, dto),
  onSuccess: (role) => dialogRef?.value.close(role),
  onError: onNetworkError,
})

const onSubmit = handleSubmit((values) => {
  const dto = { name: values.name, color: values.color }
  if (isEdit) {
    updateRole(dto)
  } else {
    createRole(dto)
  }
})
</script>

<template>
  <form class="mt-1" @submit.prevent="onSubmit">
    <div>
      <FloatLabel variant="on">
        <InputText
          id="role_name"
          v-model="name"
          v-bind="nameAttrs"
          :invalid="!!errors.name"
          fluid
        />
        <label for="role_name">{{ t('role.form.name') }}</label>
      </FloatLabel>
      <Message v-if="errors.name" size="small" severity="error" variant="simple">{{
        errors.name
      }}</Message>
    </div>
    <EmployeeRoleColorSelect v-model="color" />
    <Message v-if="errors.color" size="small" severity="error" variant="simple">{{
      errors.color
    }}</Message>
    <Button type="submit" :label="t('common.save')" rounded fluid class="mt-5" />
  </form>
</template>
