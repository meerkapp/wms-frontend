<script lang="ts" setup>
import { computed, inject, watch } from 'vue'
import { Button, FloatLabel, InputText, InputGroup, Message, Password } from 'primevue'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import { useI18n } from 'vue-i18n'
import { useQuery } from '@pinia/colada'
import type { CreateEmployeeDto, Employee, Role, UpdateEmployeeDto } from '@meerkapp/wms-contracts'
import WarehouseSelect from '@/modules/warehouse/components/WarehouseSelect.vue'
import EmployeeAvatar from './EmployeeAvatar.vue'
import EmployeeRoleMultiSelect from './EmployeeRoleMultiSelect.vue'
import { roleApi } from '@/modules/employee/api/role.api'

const props = defineProps<{
  employee?: Employee
  mode: 'create' | 'edit'
}>()

const emit = defineEmits<{
  submit: [data: CreateEmployeeDto | (UpdateEmployeeDto & { roleIds: number[] })]
}>()

const { t } = useI18n()
const setRoles = inject<(roles: Role[]) => void>('setRoles')!

function generatePassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
  return Array.from(crypto.getRandomValues(new Uint8Array(12)))
    .map((n) => chars[n % chars.length])
    .join('')
}

const isCreate = computed(() => props.mode === 'create')

const validationSchema = computed(() =>
  toTypedSchema(
    z.object({
      firstName: z
        .string({ required_error: t('employee.form.validation.firstNameRequired') })
        .min(1, t('employee.form.validation.firstNameRequired')),
      lastName: z
        .string({ required_error: t('employee.form.validation.lastNameRequired') })
        .min(1, t('employee.form.validation.lastNameRequired')),
      email: isCreate.value
        ? z
            .string({ required_error: t('employee.form.validation.emailRequired') })
            .email(t('employee.form.validation.emailInvalid'))
        : z.string().optional(),
      password: isCreate.value
        ? z
            .string({ required_error: t('employee.form.validation.passwordRequired') })
            .min(8, t('employee.form.validation.passwordTooShort'))
        : z.string().optional(),
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
        warehouseId: props.employee.warehouseId ?? undefined,
        roleIds: props.employee.roleAssignments.map((a) => a.employeeRole.id),
      }
    : undefined,
})

const [firstName, firstNameAttrs] = defineField('firstName')
const [lastName, lastNameAttrs] = defineField('lastName')
const [email, emailAttrs] = defineField('email')
const [password, passwordAttrs] = defineField('password')
const [warehouseId] = defineField('warehouseId')
const [roleIds] = defineField('roleIds')

const { data: roles } = useQuery({ key: ['roles'], query: () => roleApi.getAll() })

watch(
  roles,
  (allRoles) => {
    if (!allRoles || isCreate.value) return
    const employeeRoleIds = props.employee?.roleAssignments.map((a) => a.employeeRole.id) ?? []
    setRoles(allRoles.filter((r) => employeeRoleIds.includes(r.id)))
  },
  { immediate: true },
)

const onSubmit = handleSubmit((values) => {
  if (isCreate.value) {
    const { warehouseId, roleIds, ...rest } = values
    emit('submit', {
      ...rest,
      ...(warehouseId ? { warehouseId } : {}),
      ...(roleIds?.length ? { roleIds } : {}),
    } as CreateEmployeeDto)
  } else {
    emit('submit', {
      firstName: values.firstName,
      lastName: values.lastName,
      warehouseId: values.warehouseId ?? null,
      roleIds: values.roleIds ?? [],
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
  <form class="space-y-5" @submit.prevent="onSubmit">
    <div class="flex justify-center">
      <EmployeeAvatar :first-name="firstName ?? ''" size="xlarge" />
    </div>
    <div>
      <FloatLabel variant="on">
        <InputText
          id="employee_first_name"
          v-model="firstName"
          v-bind="firstNameAttrs"
          :invalid="!!errors.firstName"
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
          :disabled="!isCreate"
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
    <div v-if="isCreate">
      <FloatLabel variant="on">
        <InputGroup>
          <Password
            id="employee_password"
            v-model="password"
            v-bind="passwordAttrs"
            :invalid="!!errors.password"
            :feedback="false"
            toggle-mask
            fluid
          />
          <Button
            type="button"
            variant="outlined"
            icon="iconify tabler--hexagon-asterisk"
            v-tooltip.bottom="t('employee.form.generatePassword')"
            @click="setFieldValue('password', generatePassword())"
          />
        </InputGroup>
        <label for="employee_password">{{ t('employee.form.password') }}</label>
      </FloatLabel>
      <Message v-if="errors.password" size="small" severity="error" variant="simple">{{
        errors.password
      }}</Message>
    </div>
    <div>
      <EmployeeRoleMultiSelect
        :role-ids="(roleIds as number[] | undefined) ?? []"
        :label="t('common.optionalField', { label: t('employee.form.roles') })"
        @update:roles="onRolesChange"
      />
    </div>
    <div>
      <WarehouseSelect
        :warehouse-id="warehouseId ?? null"
        :label="t('common.optionalField', { label: t('employee.form.warehouse') })"
        @update:warehouse-id="setFieldValue('warehouseId', $event)"
      />
    </div>
    <Button type="submit" :label="t('common.save')" rounded fluid />
  </form>
</template>
