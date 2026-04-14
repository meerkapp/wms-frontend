import { toValue, type MaybeRefOrGetter } from 'vue'
import { useMutation } from '@pinia/colada'
import { useToast } from 'primevue/usetoast'
import { useI18n } from 'vue-i18n'
import type { Employee, UpdateEmployeeDto } from '@meerkapp/wms-contracts'
import { employeeApi } from '../api/employee.api'
import { useEmployeeStore } from '../stores/employee.store'

export type UpdateEmployeePayload = UpdateEmployeeDto & { roleIds: number[] }

export function useEmployeeUpdate(
  employee: MaybeRefOrGetter<Employee>,
  afterUpdate?: () => void,
  onError?: (error: unknown) => void,
) {
  const { t } = useI18n()
  const toast = useToast()
  const employeeStore = useEmployeeStore()

  const { mutate } = useMutation({
    mutation: (data: UpdateEmployeePayload) => {
      const emp = toValue(employee)
      return employeeApi.update(emp.id, data)
    },
    onSuccess: (updated) => {
      employeeStore.updateInList(updated)
      afterUpdate?.()
    },
    onError: (error) => {
      if (onError) {
        onError(error)
      } else {
        toast.add({ severity: 'error', summary: t('common.error.network'), life: 3000 })
      }
    },
  })

  return { mutate }
}
