<script lang="ts" setup>
import { computed, inject } from 'vue'
import { Button, FloatLabel, InputText, Message } from 'primevue'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import { useI18n } from 'vue-i18n'
import type { CreateEmployeeDto, Employee, Role, UpdateEmployeeDto } from '@meerkapp/wms-contracts'
import WarehouseSelect from '@/modules/warehouse/components/WarehouseSelect.vue'
import EmployeeRoleMultiSelect from './EmployeeRoleMultiSelect.vue'
import EmployeePasswordInput from './EmployeePasswordInput.vue'
import BaseCard from '@/core/components/BaseCard.vue'
import { useEmployeeRoleSync } from '@/modules/employee/composables/useEmployeeRoleSync'
import { setRolesKey } from '@/modules/employee/keys'
import { useAuthStore } from '@/modules/auth/stores/auth.store'

const props = defineProps<{
  employee?: Employee
  mode: 'create' | 'edit'
}>()

const emit = defineEmits<{
  submit: [data: CreateEmployeeDto | (UpdateEmployeeDto & { roleIds: number[] })]
}>()

const { t } = useI18n()
const authStore = useAuthStore()
const { checkUserPermissions } = authStore
const setRoles = inject(setRolesKey)!

function normalizePhone(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, '')
  return digits.startsWith('+') ? digits : `+${digits}`
}

const isCreate = computed(() => props.mode === 'create')

const isOwnProfile = computed(() => !isCreate.value && props.employee?.id === authStore.user?.sub)

const canEditEmail = computed(
  () =>
    isCreate.value ||
    (isOwnProfile.value
      ? checkUserPermissions('employee:update:own:email')
      : checkUserPermissions('employee:update:email')),
)

const canChangePassword = computed(
  () =>
    !isCreate.value &&
    (isOwnProfile.value
      ? checkUserPermissions('employee:update:own:password')
      : checkUserPermissions('employee:update:password')),
)

const canEditInfo = computed(
  () =>
    isCreate.value ||
    (isOwnProfile.value
      ? checkUserPermissions('employee:update:own:info')
      : checkUserPermissions('employee:update:info')),
)

const validationSchema = computed(() =>
  toTypedSchema(
    z.object({
      firstName: z
        .string({ required_error: t('employee.form.validation.firstNameRequired') })
        .min(1, t('employee.form.validation.firstNameRequired')),
      lastName: z
        .string({ required_error: t('employee.form.validation.lastNameRequired') })
        .min(1, t('employee.form.validation.lastNameRequired')),
      email: canEditEmail.value
        ? z
            .string({ required_error: t('employee.form.validation.emailRequired') })
            .email(t('employee.form.validation.emailInvalid'))
        : z.string().optional(),
      password: isCreate.value
        ? z
            .string({ required_error: t('employee.form.validation.passwordRequired') })
            .min(8, t('employee.form.validation.passwordTooShort'))
        : z.string().min(8, t('employee.form.validation.passwordTooShort')).optional(),
      phone: z
        .string()
        .min(7, t('employee.form.validation.phoneTooShort'))
        .max(20, t('employee.form.validation.phoneTooLong'))
        .optional(),
      warehouseId: z.number().optional(),
      roleIds: z.array(z.number()).optional(),
    }),
  ),
)

const { handleSubmit, errors, defineField, setFieldValue, setFieldError } = useForm({
  validationSchema,
  initialValues: props.employee
    ? {
        firstName: props.employee.firstName,
        lastName: props.employee.lastName,
        email: props.employee.email,
        phone: props.employee.phone ?? undefined,
        warehouseId: props.employee.warehouseId ?? undefined,
        roleIds: props.employee.roleAssignments.map((a) => a.employeeRole.id),
      }
    : undefined,
})

const [firstName, firstNameAttrs] = defineField('firstName')
const [lastName, lastNameAttrs] = defineField('lastName')
const [email, emailAttrs] = defineField('email')
const [password] = defineField('password')
const [phone, phoneAttrs] = defineField('phone')
const [warehouseId] = defineField('warehouseId')
const [roleIds] = defineField('roleIds')

useEmployeeRoleSync(() => (isCreate.value ? undefined : props.employee))

const onSubmit = handleSubmit((values) => {
  if (isCreate.value) {
    const { warehouseId, roleIds, phone, ...rest } = values
    emit('submit', {
      ...rest,
      ...(phone ? { phone: normalizePhone(phone) } : {}),
      ...(warehouseId ? { warehouseId } : {}),
      ...(roleIds?.length ? { roleIds } : {}),
    } as CreateEmployeeDto)
  } else {
    emit('submit', {
      firstName: values.firstName,
      lastName: values.lastName,
      phone: values.phone ? normalizePhone(values.phone) : null,
      warehouseId: values.warehouseId ?? null,
      roleIds: values.roleIds ?? [],
      ...(canEditEmail.value ? { email: values.email } : {}),
      ...(values.password ? { newPassword: values.password } : {}),
    })
  }
})

defineExpose({ setFieldError })

function onRolesChange(updatedRoles: Role[]) {
  setRoles(updatedRoles)
  setFieldValue(
    'roleIds',
    updatedRoles.map((r) => r.id),
  )
}
</script>

<template>
  <BaseCard :title="t('employee.form.title')" class="h-full">
    <template #main>
      <form class="px-5 space-y-5" @submit.prevent="onSubmit">
        <div>
          <FloatLabel variant="on">
            <InputText
              id="employee_first_name"
              v-model="firstName"
              v-bind="firstNameAttrs"
              :invalid="!!errors.firstName"
              :disabled="!canEditInfo"
              autocomplete="given-name"
              fluid
            />
            <label for="employee_first_name">{{ t('employee.form.firstName') }}</label>
          </FloatLabel>
          <Message v-if="errors.firstName" size="small" severity="error" variant="simple">{{
            errors.firstName
          }}</Message>
        </div>
        <div>
          <FloatLabel variant="on">
            <InputText
              id="employee_last_name"
              v-model="lastName"
              v-bind="lastNameAttrs"
              :invalid="!!errors.lastName"
              :disabled="!canEditInfo"
              autocomplete="family-name"
              fluid
            />
            <label for="employee_last_name">{{ t('employee.form.lastName') }}</label>
          </FloatLabel>
          <Message v-if="errors.lastName" size="small" severity="error" variant="simple">{{
            errors.lastName
          }}</Message>
        </div>
        <div>
          <FloatLabel variant="on">
            <InputText
              id="employee_email"
              v-model="email"
              v-bind="emailAttrs"
              :invalid="!!errors.email"
              :disabled="!canEditEmail"
              type="email"
              autocomplete="email"
              fluid
            />
            <label for="employee_email">{{ t('employee.form.email') }}</label>
          </FloatLabel>
          <Message v-if="errors.email" size="small" severity="error" variant="simple">{{
            errors.email
          }}</Message>
        </div>
        <div v-if="isCreate || (canChangePassword && !isOwnProfile)">
          <EmployeePasswordInput
            v-model="password"
            input-id="employee_password"
            :invalid="!!errors.password"
            :label="t('employee.form.password')"
          />
          <Message v-if="errors.password" size="small" severity="error" variant="simple">{{
            errors.password
          }}</Message>
        </div>
        <div>
          <WarehouseSelect
            :warehouse-id="warehouseId ?? null"
            :label="t('common.optionalField', { label: t('employee.form.warehouse') })"
            :disabled="!checkUserPermissions('employee:update:warehouse')"
            @update:warehouse-id="setFieldValue('warehouseId', $event)"
          />
        </div>
        <div>
          <EmployeeRoleMultiSelect
            :role-ids="(roleIds as number[] | undefined) ?? []"
            :label="t('common.optionalField', { label: t('employee.form.roles') })"
            :disabled="!(isCreate || checkUserPermissions('employee:update:roles'))"
            @update:roles="onRolesChange"
          />
        </div>
        <div>
          <FloatLabel variant="on">
            <InputText
              id="employee_phone"
              v-model="phone"
              v-bind="phoneAttrs"
              :invalid="!!errors.phone"
              :disabled="!canEditInfo"
              type="tel"
              autocomplete="tel"
              fluid
            />
            <label for="employee_phone">{{
              t('common.optionalField', { label: t('employee.form.phone') })
            }}</label>
          </FloatLabel>
          <Message v-if="errors.phone" size="small" severity="error" variant="simple">{{
            errors.phone
          }}</Message>
        </div>

        <Button type="submit" :label="t('common.save')" rounded fluid class="mb-5" />
      </form>
    </template>
  </BaseCard>
</template>
