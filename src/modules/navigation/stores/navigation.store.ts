import { defineStore } from 'pinia'
import { computed, ref, shallowRef, watchEffect } from 'vue'
import { i18n } from '@/plugins/i18n'
import { Folders } from '@/modules/signaldb/models/folders.model'
import type { Folder, ProductCollection } from '@meerkapp/wms-contracts'
import type { NavigationMenuItem } from '@/modules/navigation/types/navigation.types'
import { ProductCollections } from '@/modules/signaldb/models/product-collections.model'

function comparePinned(
  a: { pinnedAt: string | null; pinOrder: number | null },
  b: { pinnedAt: string | null; pinOrder: number | null },
): number {
  if (a.pinOrder !== null && b.pinOrder !== null && a.pinOrder !== b.pinOrder)
    return a.pinOrder - b.pinOrder
  if (a.pinOrder !== null && b.pinOrder === null) return -1
  if (a.pinOrder === null && b.pinOrder !== null) return 1
  return new Date(a.pinnedAt!).getTime() - new Date(b.pinnedAt!).getTime()
}

function sortRawItems<T extends { pinnedAt: string | null; pinOrder: number | null; name: string }>(
  items: T[],
): T[] {
  return [...items].sort((a, b) => {
    const aPinned = a.pinnedAt !== null
    const bPinned = b.pinnedAt !== null
    if (aPinned !== bPinned) return aPinned ? -1 : 1
    if (aPinned) return comparePinned(a, b)
    return a.name.localeCompare(b.name)
  })
}

function sortPinnedMenuItems<T extends { pinnedAt: string | null; pinOrder: number | null }>(
  items: T[],
): T[] {
  return [...items].sort(comparePinned)
}

export const useNavigationStore = defineStore('navigation', () => {
  const selectedItem = ref<{
    type: NavigationMenuItem['type']
    id: NavigationMenuItem['id']
  } | null>(null)

  const extraMenuItems: NavigationMenuItem[] = [
    {
      key: `product_item_archive`,
      id: 1,
      label: i18n.global.t('navigation.archive'),
      type: 'product_archive',
      pinnedAt: null,
      pinOrder: null,
    },
    {
      key: `product_item_favorite`,
      id: 1,
      label: i18n.global.t('navigation.favorites'),
      type: 'product_favorites',
      pinnedAt: null,
      pinOrder: null,
    },
  ]

  const rawFolders = shallowRef<Folder[]>([])
  const rawProductCollections = shallowRef<ProductCollection[]>([])

  watchEffect((onCleanup) => {
    const cursor = Folders.find({})
    rawFolders.value = cursor.fetch()
    onCleanup(() => cursor.cleanup())
  })

  watchEffect((onCleanup) => {
    const cursor = ProductCollections.find({})
    rawProductCollections.value = cursor.fetch()
    onCleanup(() => cursor.cleanup())
  })

  const itemsMap = computed(() => {
    const map = new Map<string, { label: string; parentGroupId: number | null }>()

    for (const folder of rawFolders.value) {
      map.set(`folder_${folder.id}`, {
        label: folder.name,
        parentGroupId: folder.parentId,
      })
    }

    for (const collection of rawProductCollections.value) {
      map.set(`product_collection_${collection.id}`, {
        label: collection.name,
        parentGroupId: collection.folderId,
      })
    }

    for (const item of extraMenuItems) {
      map.set(`${item.type}_${item.id}`, {
        label: item.label,
        parentGroupId: null,
      })
    }

    return map
  })

  const menuItems = computed(() => {
    const foldersByParent = new Map<number | null, Folder[]>()
    const collectionsByFolder = new Map<number | null, ProductCollection[]>()

    for (const folder of rawFolders.value) {
      const key = folder.parentId
      if (!foldersByParent.has(key)) foldersByParent.set(key, [])
      foldersByParent.get(key)!.push(folder)
    }

    for (const collection of rawProductCollections.value) {
      const key = collection.folderId
      if (!collectionsByFolder.has(key)) collectionsByFolder.set(key, [])
      collectionsByFolder.get(key)!.push(collection)
    }

    const buildTree = (parentId: number | null): NavigationMenuItem[] => {
      const folders = sortRawItems(foldersByParent.get(parentId) ?? [])
      const collections = sortRawItems(collectionsByFolder.get(parentId) ?? [])

      const folderItems: NavigationMenuItem[] = folders.map((folder) => ({
        key: `folder_${folder.id}`,
        id: folder.id,
        label: folder.name,
        type: 'folder',
        pinnedAt: folder.pinnedAt,
        pinOrder: folder.pinOrder,
        items: buildTree(folder.id),
      }))

      const collectionItems: NavigationMenuItem[] = collections.map((collection) => ({
        key: `product_collection_${collection.id}`,
        id: collection.id,
        label: collection.name,
        type: 'product_collection',
        pinnedAt: collection.pinnedAt,
        pinOrder: collection.pinOrder,
      }))

      // Pinned folders and collections are interleaved by their pin order/date;
      // unpinned folders come before unpinned collections (alphabetically within each group).
      const pinned = sortPinnedMenuItems([
        ...folderItems.filter((i) => i.pinnedAt !== null),
        ...collectionItems.filter((i) => i.pinnedAt !== null),
      ])
      const unpinned = [
        ...folderItems.filter((i) => i.pinnedAt === null),
        ...collectionItems.filter((i) => i.pinnedAt === null),
      ]

      return [...pinned, ...unpinned]
    }

    return buildTree(null)
  })

  function setSelectedItem(type: NavigationMenuItem['type'], id: NavigationMenuItem['id']) {
    selectedItem.value = { type, id }
  }

  function clearSelectedItem() {
    selectedItem.value = null
  }

  return {
    menuItems,
    extraMenuItems,
    selectedItem,
    itemsMap,
    rawFolders,
    rawProductCollections,
    setSelectedItem,
    clearSelectedItem,
  }
})
