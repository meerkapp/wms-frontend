import { toValue, type MaybeRefOrGetter } from 'vue'
import { useMutation } from '@pinia/colada'
import { useToast } from 'primevue/usetoast'
import { useI18n } from 'vue-i18n'
import type { Employee, UpdateEmployeeDto } from '@meerkapp/wms-contracts'
import { employeeApi } from '../api/employee.api'
import { useEmployeeStore } from '../stores/employee.store'
import { useAuthStore } from '@/modules/auth/stores/auth.store'

export type UpdateEmployeePayload = UpdateEmployeeDto

export function useEmployeeUpdate(
  employee: MaybeRefOrGetter<Employee>,
  isOwnProfile: MaybeRefOrGetter<boolean>,
  afterUpdate?: () => void,
  onError?: (error: unknown) => void,
) {
  const { t } = useI18n()
  const toast = useToast()
  const employeeStore = useEmployeeStore()
  const authStore = useAuthStore()

  const { mutate } = useMutation({
    mutation: (data: UpdateEmployeePayload) => {
      const emp = toValue(employee)
      return toValue(isOwnProfile) ? employeeApi.updateMe(data) : employeeApi.update(emp.id, data)
    },
    onSuccess: async (updated) => {
      employeeStore.updateInList(updated)
      if (toValue(isOwnProfile)) {
        await authStore.refresh().catch((error) => console.error('[auth:refresh-profile]', error))
      }
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
