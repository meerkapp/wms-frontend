<script lang="ts" setup>
import { computed, inject, ref, type Ref } from 'vue'
import type { DynamicDialogInstance } from 'primevue/dynamicdialogoptions'
import { useMutation } from '@pinia/colada'
import { useAppToast } from '@/core/composables/useAppToast'
import { useI18n } from 'vue-i18n'
import type { CreateEmployeeDto, Employee, UpdateEmployeeDto } from '@meerkapp/wms-contracts'
import EmployeeDialog from './EmployeeDialog.vue'
import EmployeeForm from './EmployeeForm.vue'
import { employeeApi } from '@/modules/employee/api/employee.api'
import { useEmployeeUpdate } from '@/modules/employee/composables/useEmployeeUpdate'
import { parseApiError } from '@/core/api/errors'
import { useAuthStore } from '@/modules/auth/stores/auth.store'

const dialogRef = inject<Ref<DynamicDialogInstance>>('dialogRef')

const { t } = useI18n()
const toast = useAppToast()
const authStore = useAuthStore()

const employee = computed<Employee | undefined>(() => dialogRef?.value.data?.employee)
const mode = computed<'create' | 'edit'>(() => dialogRef?.value.data?.mode ?? 'create')
const isOwnProfile = computed(() => employee.value?.id === authStore.user?.sub)

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
    toast.error(t('common.error.forbidden'))
  } else {
    toast.error(t('common.error.network'))
  }
}

const { mutate: updateEmployee } = useEmployeeUpdate(
  () => employee.value!,
  isOwnProfile,
  () => dialogRef?.value.close(),
  (error) => handleEmployeeError(error),
)

function onSubmit(data: CreateEmployeeDto | UpdateEmployeeDto) {
  if (mode.value === 'create') {
    createEmployee(data as CreateEmployeeDto)
  } else {
    updateEmployee(data as UpdateEmployeeDto)
  }
}
</script>

<template>
  <EmployeeDialog>
    <EmployeeForm ref="formRef" :employee="employee" :mode="mode" @submit="onSubmit" />
  </EmployeeDialog>
</template>
