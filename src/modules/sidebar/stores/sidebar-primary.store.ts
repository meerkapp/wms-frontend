import { defineStore } from 'pinia'
import { markRaw, ref } from 'vue'
import { i18n } from '@/plugins/i18n'
import type { SidebarItem } from '@/modules/sidebar/types/sidebar.types'
import OrganizationManager from '@/modules/organization/components/OrganizationManager.vue'
import WarehouseManager from '@/modules/warehouse/components/WarehouseManager.vue'
import EmployeeManager from '@/modules/employee/components/EmployeeManager.vue'

export const useSideBarPrimaryStore = defineStore('sidebar-primary', () => {
  const sideBarPrimaryItems = markRaw([
    {
      title: i18n.global.t('organization.manager.title'),
      key: 'organizations',
      iconClass: 'iconify tabler--building-store',
      content: markRaw(OrganizationManager),
      position: 'bottom',
      hideTitle: true,
    },
    {
      title: 'Склады',
      key: 'warehouse',
      iconClass: 'iconify tabler--building-warehouse',
      content: markRaw(WarehouseManager),
      position: 'bottom',
      hideTitle: true,
    },
    {
      title: 'Сотрудники',
      key: 'employees',
      iconClass: 'iconify tabler--users',
      content: markRaw(EmployeeManager),
      position: 'bottom',
      hideTitle: true,
    },
  ] as SidebarItem[])
  const selectedSideBarPrimaryItemKey = ref<string | null>('organizations')

  function setSelectedSideBarPrimaryItemKey(value: string | null) {
    if (
      selectedSideBarPrimaryItemKey.value !== null &&
      selectedSideBarPrimaryItemKey.value === value
    )
      selectedSideBarPrimaryItemKey.value = null
    else selectedSideBarPrimaryItemKey.value = value
  }

  return { sideBarPrimaryItems, selectedSideBarPrimaryItemKey, setSelectedSideBarPrimaryItemKey }
})
