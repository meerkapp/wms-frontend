<script setup lang="ts">
import { watchEffect, ref } from 'vue'
import { Splitter, SplitterPanel } from 'primevue'
import { storeToRefs } from 'pinia'

import ActivityBarPrimary from '@/modules/sidebar/components/ActivityBarPrimary.vue'
import SideBarPrimary from '@/modules/sidebar/components/SideBarPrimary.vue'
import { useAuthStore } from '@/modules/auth/stores/auth.store'
import { useSideBarPrimaryStore } from '@/modules/sidebar/stores/sidebar-primary.store'
import BaseCard from '../components/BaseCard.vue'

import WarehouseSelect from '@/modules/warehouse/components/WarehouseSelect.vue'

const authStore = useAuthStore()
const { user } = authStore

const sideBarPrimaryStore = useSideBarPrimaryStore()
const { selectedSideBarPrimaryItemKey } = storeToRefs(sideBarPrimaryStore)

const warehouseId = ref<number | null>(null)

// const countries = ref<any[]>([])

// watchEffect((onCleanup) => {
//   const cursor = Countries.find({})
//   countries.value = cursor.fetch() ?? []

//   onCleanup(() => {
//     cursor.cleanup()
//   })
// })
</script>

<template>
  <div class="h-screen flex">
    <ActivityBarPrimary />
    <Splitter
      class="w-full"
      :gutterSize="selectedSideBarPrimaryItemKey !== null ? 6 : 0"
      pt:root="!border-0 !bg-transparent"
    >
      <SplitterPanel
        v-show="selectedSideBarPrimaryItemKey !== null"
        :size="15"
        :minSize="13"
        pt:root="py-1.5"
      >
        <SideBarPrimary />
      </SplitterPanel>
      <SplitterPanel :size="80" :minSize="70" pt:root="py-1.5">
        <div class="h-full">
          <WarehouseSelect v-model:warehouseId="warehouseId" class="w-fit min-w-3xs" />
          <BaseCard title="test" class="h-full mt-2">
            <template #main> </template>
          </BaseCard>
        </div>
      </SplitterPanel>
    </Splitter>
    <!-- <h1>{{ user?.firstName }} {{ user?.lastName }}</h1>
    <p>{{ user?.email }}</p>
    <p>{{ user?.stockId }}</p>
    <p>{{ user?.isActive }}</p>
    <p>{{ user?.permissions }}</p>
    {{ countries }} -->
  </div>
</template>
