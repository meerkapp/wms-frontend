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
  onError: (error: any) => {
    if (error?.statusCode === 409 || error?.response?.status === 409) {
      formRef.value?.setFieldError('email', t('employee.form.validation.emailInUse'))
    } else {
      toast.add({ severity: 'error', summary: t('common.error.network'), life: 3000 })
    }
  },
})

function onSubmit(data: CreateEmployeeDto | (UpdateEmployeeDto & { roleIds: number[] })) {
  if (mode.value === 'create') {
    createEmployee(data as CreateEmployeeDto)
  } else {
    dialogRef?.value.close(data)
  }
}
</script>

<template>
  <EmployeeDialog>
    <EmployeeForm ref="formRef" :employee="employee" :mode="mode" @submit="onSubmit" />
  </EmployeeDialog>
</template>
