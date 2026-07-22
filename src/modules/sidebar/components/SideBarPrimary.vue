<script lang="ts" setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import OnlineRequiredState from '@/core/components/OnlineRequiredState.vue'
import { useConnectivityStore } from '@/core/stores/connectivity.store'
import { useAuthStore } from '@/modules/auth/stores/auth.store'
import { useSideBarPrimaryStore } from '../stores/sidebar-primary.store'
import { resolveOnlineRequiredReason } from '../sidebar-availability'
import type { SidebarItem } from '../types/sidebar.types'

const sideBarPrimaryStore = useSideBarPrimaryStore()
const { sideBarPrimaryItems } = sideBarPrimaryStore
const { selectedSideBarPrimaryItemKey } = storeToRefs(sideBarPrimaryStore)
const { status } = storeToRefs(useConnectivityStore())
const { isOffline } = storeToRefs(useAuthStore())

const selectedSideBarItem = computed<SidebarItem | null>(() => {
  if (selectedSideBarPrimaryItemKey.value === null) return null
  const found = sideBarPrimaryItems.find(
    (i) => i.type !== 'separator' && i.key === selectedSideBarPrimaryItemKey.value,
  )
  return (found as SidebarItem) ?? null
})

const onlineRequiredReason = computed(() => {
  if (selectedSideBarItem.value === null) return null
  return resolveOnlineRequiredReason(
    selectedSideBarItem.value.availability,
    status.value,
    isOffline.value,
  )
})
</script>

<template>
  <div v-show="selectedSideBarItem !== null" class="flex flex-col w-full h-full overflow-hidden">
    <div
      v-if="selectedSideBarItem?.hideTitle !== true"
      class="h-16 flex items-center px-6 shrink-0"
    >
      <h2>{{ selectedSideBarItem?.title }}</h2>
    </div>

    <OnlineRequiredState
      v-if="selectedSideBarItem && onlineRequiredReason"
      :title="selectedSideBarItem.title"
      :reason="onlineRequiredReason"
      class="flex-1 min-h-0"
    />
    <KeepAlive v-else>
      <component :is="selectedSideBarItem?.content" class="flex-1 min-h-0" />
    </KeepAlive>
  </div>
</template>
