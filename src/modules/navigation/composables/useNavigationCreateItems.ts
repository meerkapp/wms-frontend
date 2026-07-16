import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { MenuItem } from 'primevue/menuitem'
import { useAuthStore } from '@/modules/auth/stores/auth.store'

interface CreateItemCommands {
  onCreateFolder?: () => void
  onCreateCollection?: () => void
}

export function useNavigationCreateItems(commands?: CreateItemCommands) {
  const { t } = useI18n()
  const { checkUserPermissions } = useAuthStore()

  const createMenuItems = computed<MenuItem[]>(() => {
    const items: MenuItem[] = []

    if (checkUserPermissions('folder:create')) {
      items.push({
        label: t('navigation.contextMenu.folder'),
        icon: 'iconify tabler--folder-plus',
        command: commands?.onCreateFolder,
      })
    }
    if (checkUserPermissions('product_collection:create')) {
      items.push({
        label: t('navigation.contextMenu.collection'),
        icon: 'iconify tabler--table-plus',
        command: commands?.onCreateCollection,
      })
    }

    return items
  })

  return { createMenuItems }
}
