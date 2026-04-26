<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { PanelMenu, Divider, ContextMenu } from 'primevue'
import type { MenuItem } from 'primevue/menuitem'
import { useNavigationStore } from '../stores/navigation.store'
import { useNavigationActions } from '../composables/useNavigationActions'
import { useAuthStore } from '@/modules/auth/stores/auth.store'
import NavigationIcon from './NavigationIcon.vue'
import type { NavigationMenuItem } from '@/modules/navigation/types/navigation.types'

const { t } = useI18n()

const expandedKeys = ref<Record<string, boolean>>({})

const navigationStore = useNavigationStore()
const { setSelectedItem } = navigationStore
const { menuItems, selectedItem, rawFolders, rawProductCollections } =
  storeToRefs(navigationStore)
const { extraMenuItems } = navigationStore

const { checkUserPermissions } = useAuthStore()

const {
  openCreateFolderDialog,
  openEditFolderDialog,
  openCreateCollectionDialog,
  openEditCollectionDialog,
  pinFolder,
  unpinFolder,
  moveFolderUp,
  moveFolderDown,
  pinCollection,
  unpinCollection,
  moveCollectionUp,
  moveCollectionDown,
} = useNavigationActions()

const contextMenu = ref<InstanceType<typeof ContextMenu>>()
const contextMenuItems = ref<MenuItem[]>([])
const contextMenuKey = ref<string | null>(null)

function onClickPanelMenuItem(type: NavigationMenuItem['type'], id: NavigationMenuItem['id']) {
  if (type !== 'folder' && (type !== selectedItem.value?.type || id !== selectedItem.value?.id))
    setSelectedItem(type, id)
}

function findSiblings(nodes: NavigationMenuItem[], key: string): NavigationMenuItem[] | null {
  if (nodes.some((n) => n.key === key)) return nodes
  for (const node of nodes) {
    if (node.items) {
      const found = findSiblings(node.items, key)
      if (found) return found
    }
  }
  return null
}

function onRowContextMenu(event: MouseEvent, rawItem: unknown) {
  const item = rawItem as NavigationMenuItem
  const isPinned = item.pinnedAt !== null
  const canPin =
    item.type === 'folder'
      ? checkUserPermissions('folder:pin')
      : checkUserPermissions('product_collection:pin')

  const siblings = findSiblings(menuItems.value, item.key) ?? []
  const pinnedSiblings = siblings.filter((s) => s.pinnedAt !== null)
  const pinnedIndex = pinnedSiblings.findIndex((s) => s.key === item.key)

  const items: MenuItem[] = []

  if (item.type === 'folder') {
    items.push({
      label: t('common.create'),
      icon: 'iconify tabler--plus',
      items: [
        {
          label: t('navigation.contextMenu.folder'),
          icon: 'iconify tabler--folder-plus',
          command: () => openCreateFolderDialog(item.id),
        },
        {
          label: t('navigation.contextMenu.collection'),
          icon: 'iconify tabler--table-plus',
          command: () => openCreateCollectionDialog(item.id),
        },
      ],
    })
  }

  if (canPin) {
    items.push(
      isPinned
        ? {
            label: t('navigation.contextMenu.unpin'),
            icon: 'iconify tabler--pinned-off',
            command: () => {
              if (item.type === 'folder') unpinFolder(item.id)
              else unpinCollection(item.id)
            },
          }
        : {
            label: t('navigation.contextMenu.pin'),
            icon: 'iconify tabler--pin',
            command: () => {
              if (item.type === 'folder') pinFolder(item.id)
              else pinCollection(item.id)
            },
          },
    )
  }

  if (canPin && isPinned) {
    if (pinnedIndex > 0) {
      items.push({
        label: t('navigation.contextMenu.moveUp'),
        icon: 'iconify tabler--arrow-up',
        command: () => {
          if (item.type === 'folder') moveFolderUp(item.id)
          else moveCollectionUp(item.id)
        },
      })
    }
    if (pinnedIndex < pinnedSiblings.length - 1) {
      items.push({
        label: t('navigation.contextMenu.moveDown'),
        icon: 'iconify tabler--arrow-down',
        command: () => {
          if (item.type === 'folder') moveFolderDown(item.id)
          else moveCollectionDown(item.id)
        },
      })
    }
  }

  items.push(
    { separator: true },
    {
      label: t('common.edit'),
      icon: 'iconify tabler--edit',
      command: () => {
        if (item.type === 'folder') {
          const folder = rawFolders.value.find((f) => f.id === item.id)
          if (folder) openEditFolderDialog(folder)
        } else if (item.type === 'product_collection') {
          const collection = rawProductCollections.value.find((c) => c.id === item.id)
          if (collection) openEditCollectionDialog(collection)
        }
      },
    },
  )

  contextMenuItems.value = items
  contextMenuKey.value = item.key
  contextMenu.value?.show(event)
}
</script>

<template>
  <div class="flex flex-col">
    <PanelMenu
      :model="extraMenuItems"
      class="w-full"
      :pt="{
        root: 'gap-0!',
        rootlist: 'ml-6! border-l border-surface p-0!',
        contentcontainer: 'transition-none!',
      }"
    >
      <template #item="{ item, root }">
        <a
          class="flex items-center px-4! py-2 cursor-pointer group select-none"
          :class="{
            'pl-6': root === true,
            'bg-pink-100 dark:bg-pink-950 border-l border-pink-400':
              item.type === 'product_favorites' &&
              item.type === selectedItem?.type &&
              item.id === selectedItem?.id,
            'bg-gray-200 dark:bg-gray-800 border-l border-gray-400':
              item.type === 'product_archive' &&
              item.type === selectedItem?.type &&
              item.id === selectedItem?.id,
            'border-l border-transparent hover:bg-surface-50 dark:hover:bg-surface-800':
              item.type !== selectedItem?.type || item.id !== selectedItem?.id,
          }"
          @click="onClickPanelMenuItem(item.type, item.id)"
        >
          <NavigationIcon :type="item.type" />
          <span class="ml-2 truncate">{{ item.label }}</span>
        </a>
      </template>
    </PanelMenu>
    <Divider />
    <ContextMenu ref="contextMenu" :model="contextMenuItems" @hide="contextMenuKey = null" />
    <PanelMenu
      v-model:expandedKeys="expandedKeys"
      :model="menuItems"
      class="w-full"
      :pt="{
        root: 'gap-0!',
        rootlist: 'ml-4! border-l border-surface p-0!',
        submenu: 'ml-4! border-l border-surface p-0!',
        contentcontainer: 'animate-none!',
      }"
      multiple
    >
      <template #item="{ item, active, root }">
        <a
          class="flex items-center px-4! py-2 cursor-pointer group select-none"
          :class="{
            'pl-6': root === true,
            'bg-blue-100 dark:bg-blue-950 border-l border-blue-400':
              item.type === 'product_collection' &&
              item.type === selectedItem?.type &&
              item.id === selectedItem?.id,
            'bg-emerald-100 dark:bg-emerald-950 border-l border-emerald-400':
              item.type === 'text_document' &&
              item.type === selectedItem?.type &&
              item.id === selectedItem?.id,
            'bg-pink-100 dark:bg-pink-950 border-l border-pink-400':
              item.type === 'product_favorites' &&
              item.type === selectedItem?.type &&
              item.id === selectedItem?.id,
            'border-l border-transparent hover:bg-surface-50 dark:hover:bg-surface-800':
              item.type !== selectedItem?.type || item.id !== selectedItem?.id,
            'ring-1 ring-primary ring-inset': item.key === contextMenuKey,
          }"
          @click="onClickPanelMenuItem(item.type, item.id)"
          @contextmenu.prevent="onRowContextMenu($event, item)"
        >
          <NavigationIcon :type="item.type" :active="active" />
          <span class="ml-2 truncate">{{ item.label }}</span>
          <i v-if="item.pinnedAt" class="iconify tabler--pin ml-auto text-primary/40 shrink-0" />
        </a>
      </template>
    </PanelMenu>
  </div>
</template>
