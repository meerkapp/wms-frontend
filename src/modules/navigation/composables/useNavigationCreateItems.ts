import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { MenuItem } from 'primevue/menuitem'

interface CreateItemCommands {
  onCreateFolder?: () => void
  onCreateCollection?: () => void
}

export function useNavigationCreateItems(commands?: CreateItemCommands) {
  const { t } = useI18n()

  const createMenuItems = computed<MenuItem[]>(() => [
    {
      label: t('navigation.contextMenu.folder'),
      icon: 'iconify tabler--folder-plus',
      command: commands?.onCreateFolder,
    },
    {
      label: t('navigation.contextMenu.collection'),
      icon: 'iconify tabler--table-plus',
      command: commands?.onCreateCollection,
    },
  ])

  return { createMenuItems }
}
