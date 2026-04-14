<script lang="ts" setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import ActivityBarButton from './ActivityBarButton.vue'
import EmployeeCurrentUserButton from '@/modules/employee/components/EmployeeCurrentUserButton.vue'
import { useSideBarPrimaryStore } from '../stores/sidebar-primary.store'

const sideBarPrimaryStore = useSideBarPrimaryStore()
const { setSelectedSideBarPrimaryItemKey, sideBarPrimaryItems } = sideBarPrimaryStore
const { selectedSideBarPrimaryItemKey } = storeToRefs(sideBarPrimaryStore)

const topPositionOptions = computed(() => sideBarPrimaryItems.filter((p) => p.position === 'top'))
const bottomPositionOptions = computed(() =>
  sideBarPrimaryItems.filter((p) => p.position === 'bottom'),
)
</script>

<template>
  <div class="w-16 h-full flex flex-col justify-between items-center">
    <div class="flex flex-col items-center">
      <template v-for="entry in topPositionOptions" :key="entry.key">
        <hr
          v-if="entry.type === 'separator'"
          class="w-8 border-surface-200 dark:border-surface-700 my-1"
        />
        <ActivityBarButton
          v-else
          :selectedKey="selectedSideBarPrimaryItemKey"
          :panel="entry"
          size="large"
          @update:selectedKey="setSelectedSideBarPrimaryItemKey($event)"
        />
      </template>
    </div>
    <div class="flex flex-col items-center mb-2">
      <template v-for="entry in bottomPositionOptions" :key="entry.key">
        <hr v-if="entry.type === 'separator'" class="w-6 border-surface-500 my-0.5" />
        <ActivityBarButton
          v-else
          :selectedKey="selectedSideBarPrimaryItemKey"
          :panel="entry"
          size="large"
          @update:selectedKey="setSelectedSideBarPrimaryItemKey($event)"
        />
      </template>
      <div class="mt-1.5">
        <EmployeeCurrentUserButton />
      </div>
    </div>
  </div>
</template>
