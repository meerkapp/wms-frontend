import { inject, watch, toValue, type MaybeRefOrGetter } from 'vue'
import { useQuery } from '@pinia/colada'
import type { Employee } from '@meerkapp/wms-contracts'
import { roleApi } from '../api/role.api'
import { setRolesKey } from '../keys'

export function useEmployeeRoleSync(employee: MaybeRefOrGetter<Employee | undefined>) {
  const setRoles = inject(setRolesKey)
  const { data: roles } = useQuery({ key: ['roles'], query: () => roleApi.getAll() })

  watch(
    [roles, () => toValue(employee)],
    ([allRoles, emp]) => {
      if (!allRoles || !emp) return
      const employeeRoleIds = emp.roleAssignments.map((a) => a.employeeRole.id)
      setRoles?.(allRoles.filter((r) => employeeRoleIds.includes(r.id)))
    },
    { immediate: true },
  )
}
