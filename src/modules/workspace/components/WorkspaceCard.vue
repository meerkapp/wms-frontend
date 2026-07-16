<script setup lang="ts">
import { Button } from 'primevue'
import NavigationBreadcrumb from '@/modules/navigation/components/NavigationBreadcrumb.vue'
import { useNavigationStore } from '@/modules/navigation/stores/navigation.store'

import { storeToRefs } from 'pinia'

const navigationStore = useNavigationStore()
const { selectedItem } = storeToRefs(navigationStore)
const { clearSelectedItem } = navigationStore
</script>

<template>
  <div class="h-full flex flex-col bg-surface-100 dark:bg-surface-900 rounded-xl overflow-hidden">
    <template v-if="selectedItem != null">
      <div class="flex items-center h-12 shrink-0">
        <NavigationBreadcrumb />
        <div class="mr-2">
          <Button icon="iconify tabler--x" variant="text" rounded @click="clearSelectedItem()" />
        </div>
      </div>
      <div class="flex-1 min-h-0">
        <slot name="main"></slot>
      </div>
      <div class="flex items-center h-12 shrink-0">
        <slot name="footer"></slot>
      </div>
    </template>
    <div v-else class="flex-1 flex items-center justify-center text-muted-color">Empty</div>
  </div>
</template>
