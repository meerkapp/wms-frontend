import { defineStore } from 'pinia'
import { markRaw, ref } from 'vue'
import type { SidebarItem } from '@/modules/sidebar/types/sidebar.types'
import OrganizationManager from '@/modules/organization/components/OrganizationManager.vue'
import { i18n } from '@/plugins/i18n'

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
