<script lang="ts" setup>
import { computed, nextTick } from 'vue'
import { storeToRefs } from 'pinia'
import { useSideBarPrimaryStore } from '../stores/sidebar-primary.store'

const sideBarPrimaryStore = useSideBarPrimaryStore()
const { sideBarPrimaryItems } = sideBarPrimaryStore
const { selectedSideBarPrimaryItemKey } = storeToRefs(sideBarPrimaryStore)

const selectedSideBarItem = computed(() =>
  selectedSideBarPrimaryItemKey.value !== null
    ? sideBarPrimaryItems.find((i) => i.key === selectedSideBarPrimaryItemKey.value) || null
    : null,
)
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
