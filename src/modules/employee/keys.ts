import type { InjectionKey } from 'vue'
import type { Role } from '@meerkapp/wms-contracts'

export const setRolesKey: InjectionKey<(roles: Role[]) => void> = Symbol('setRoles')
