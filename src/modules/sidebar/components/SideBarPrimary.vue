<script lang="ts" setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useSideBarPrimaryStore } from '../stores/sidebar-primary.store'
import type { SidebarItem } from '../types/sidebar.types'

const sideBarPrimaryStore = useSideBarPrimaryStore()
const { sideBarPrimaryItems } = sideBarPrimaryStore
const { selectedSideBarPrimaryItemKey } = storeToRefs(sideBarPrimaryStore)

const selectedSideBarItem = computed<SidebarItem | null>(() => {
  if (selectedSideBarPrimaryItemKey.value === null) return null
  const found = sideBarPrimaryItems.find(
    (i) => i.type !== 'separator' && i.key === selectedSideBarPrimaryItemKey.value,
  )
  return (found as SidebarItem) ?? null
})
</script>

<template>
  <div v-show="selectedSideBarItem !== null" class="flex flex-col w-full h-full overflow-hidden">
    <div v-if="selectedSideBarItem?.hideTitle !== true" class="h-16 flex items-center px-6 shrink-0">
      <h2>{{ selectedSideBarItem?.title }}</h2>
    </div>

    <KeepAlive>
      <component :is="selectedSideBarItem?.content" class="flex-1 overflow-auto min-h-0" />
    </KeepAlive>
  </div>
</template>
