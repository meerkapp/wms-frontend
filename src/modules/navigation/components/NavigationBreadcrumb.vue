<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { Breadcrumb } from 'primevue'
import { useNavigationStore } from '../stores/navigation.store'
import NavigationIcon from './NavigationIcon.vue'

const navigationStore = useNavigationStore()
const { selectedItem, itemsMap } = storeToRefs(navigationStore)

const breadcrumbPath = computed(() => {
  if (!selectedItem.value) return []

  const { type, id } = selectedItem.value
  const path: { label: string; type: string; id: number }[] = []

  const currentKey = `${type}_${id}`
  const currentItem = itemsMap.value.get(currentKey)

  if (!currentItem) return []

  path.unshift({ label: currentItem.label, type, id })

  let parentGroupId = currentItem.parentGroupId
  while (parentGroupId !== null) {
    const parentKey = `folder_${parentGroupId}`
    const parentItem = itemsMap.value.get(parentKey)

    if (!parentItem) break

    path.unshift({ label: parentItem.label, type: 'folder', id: parentGroupId })
    parentGroupId = parentItem.parentGroupId
  }

  return path
})
</script>

<template>
  <Breadcrumb
    v-if="breadcrumbPath.length > 0"
    :model="breadcrumbPath"
    :pt="{
      root: 'h-12 flex items-center !bg-transparent overflow-x-scroll flex-1 min-w-0 p-0! ml-4',
    }"
  >
    <template #item="{ item }">
      <span class="flex items-center gap-1.5 whitespace-nowrap">
        <NavigationIcon :type="item.type" />
        <span>{{ item.label }}</span>
      </span>
    </template>
  </Breadcrumb>
</template>
