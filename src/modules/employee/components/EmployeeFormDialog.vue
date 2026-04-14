<script lang="ts" setup>
import { computed, inject, ref, type Ref } from 'vue'
import type { DynamicDialogInstance } from 'primevue/dynamicdialogoptions'
import { useMutation } from '@pinia/colada'
import { useToast } from 'primevue/usetoast'
import { useI18n } from 'vue-i18n'
import type { CreateEmployeeDto, Employee, UpdateEmployeeDto } from '@meerkapp/wms-contracts'
import EmployeeDialog from './EmployeeDialog.vue'
import EmployeeForm from './EmployeeForm.vue'
import { employeeApi } from '@/modules/employee/api/employee.api'
import { useEmployeeUpdate } from '@/modules/employee/composables/useEmployeeUpdate'
import { parseApiError } from '@/core/api/errors'

const dialogRef = inject<Ref<DynamicDialogInstance>>('dialogRef')

const { t } = useI18n()
const toast = useToast()

const employee = computed<Employee | undefined>(() => dialogRef?.value.data?.employee)
const mode = computed<'create' | 'edit'>(() => dialogRef?.value.data?.mode ?? 'create')

const formRef = ref<InstanceType<typeof EmployeeForm> | null>(null)

const { mutate: createEmployee } = useMutation({
  mutation: (dto: CreateEmployeeDto) => employeeApi.create(dto),
  onSuccess: (_, dto) => {
    dialogRef?.value.close({ email: dto.email, password: dto.password })
  },
  onError: (error) => handleEmployeeError(error),
})

function handleEmployeeError(error: unknown) {
  const apiError = parseApiError(error)
  if (apiError?.status === 409) {
    formRef.value?.setFieldError('email', t('employee.form.validation.emailInUse'))
  } else if (apiError?.status === 403) {
    toast.add({ severity: 'error', summary: t('common.error.forbidden'), life: 3000 })
  } else {
    toast.add({ severity: 'error', summary: t('common.error.network'), life: 3000 })
  }
}

const { mutate: updateEmployee } = useEmployeeUpdate(
  () => employee.value!,
  () => dialogRef?.value.close(),
  (error) => handleEmployeeError(error),
)

function onSubmit(data: CreateEmployeeDto | (UpdateEmployeeDto & { roleIds: number[] })) {
  if (mode.value === 'create') {
    createEmployee(data as CreateEmployeeDto)
  } else {
    updateEmployee(data as UpdateEmployeeDto & { roleIds: number[] })
  }
}
</script>

<template>
  <EmployeeDialog>
    <EmployeeForm ref="formRef" :employee="employee" :mode="mode" @submit="onSubmit" />
  </EmployeeDialog>
</template>
