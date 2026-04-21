import { defineStore } from 'pinia'
import { markRaw, ref } from 'vue'
import { i18n } from '@/plugins/i18n'
import type { SidebarEntry } from '@/modules/sidebar/types/sidebar.types'
import OrganizationManager from '@/modules/organization/components/OrganizationManager.vue'
import WarehouseManager from '@/modules/warehouse/components/WarehouseManager.vue'
import EmployeeManager from '@/modules/employee/components/EmployeeManager.vue'
import ProductTypeManager from '@/modules/product-type/components/ProductTypeManager.vue'

export const useSideBarPrimaryStore = defineStore('sidebar-primary', () => {
  const sideBarPrimaryItems = markRaw([
    {
      title: i18n.global.t('product.type.manager.title'),
      key: 'product_types',
      iconClass: 'iconify tabler--category',
      content: markRaw(ProductTypeManager),
      position: 'bottom',
      hideTitle: true,
    },
    { type: 'separator', key: 'sep-1', position: 'bottom' },
    {
      title: i18n.global.t('organization.manager.title'),
      key: 'organizations',
      iconClass: 'iconify tabler--building-store',
      content: markRaw(OrganizationManager),
      position: 'bottom',
      hideTitle: true,
    },
    {
      title: i18n.global.t('warehouse.manager.title'),
      key: 'warehouses',
      iconClass: 'iconify tabler--building-warehouse',
      content: markRaw(WarehouseManager),
      position: 'bottom',
      hideTitle: true,
    },
    {
      title: i18n.global.t('employee.manager.title'),
      key: 'employees',
      iconClass: 'iconify tabler--users',
      content: markRaw(EmployeeManager),
      position: 'bottom',
      hideTitle: true,
    },
    { type: 'separator', key: 'sep-2', position: 'bottom' },
  ] as SidebarEntry[])
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
