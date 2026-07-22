<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { Splitter, SplitterPanel } from 'primevue'
import { useAuthStore } from '@/modules/auth/stores/auth.store'
import { useSideBarPrimaryStore } from '@/modules/sidebar/stores/sidebar-primary.store'
import { useProductTableStore } from '@/modules/product-table/stores/product-table.store'
import ActivityBarPrimary from '@/modules/sidebar/components/ActivityBarPrimary.vue'
import SideBarPrimary from '@modules/sidebar/components/SideBarPrimary.vue'
import WorkspaceCard from '@modules/workspace/components/WorkspaceCard.vue'
import WarehouseSelect from '@modules/warehouse/components/WarehouseSelect.vue'
import ProductTable from '@modules/product-table/components/ProductTable.vue'
import WorkspaceSearch from '@modules/workspace/components/WorkspaceSearch.vue'
import ProductTableFilterSelect from '@modules/product-table/components/ProductTableFilterSelect.vue'

const { isOffline, user } = storeToRefs(useAuthStore())
const { selectedSideBarPrimaryItemKey } = storeToRefs(useSideBarPrimaryStore())

const productTableStore = useProductTableStore()
const { quickFilterValue, selectedWarehouseId } = storeToRefs(productTableStore)
selectedWarehouseId.value = user.value?.warehouseId ?? null
</script>

<template>
  <div class="h-full flex">
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
      <SplitterPanel :size="80" :minSize="70" pt:root="py-1.5 pr-1.5">
        <div class="h-full flex flex-col gap-1.5">
          <div class="h-12 shrink-0 flex items-center px-1 gap-1.5 justify-between">
            <div class="w-1/3">
              <WarehouseSelect
                v-model:warehouseId="selectedWarehouseId"
                :disabled="isOffline"
                class="w-fit min-w-3xs"
              />
            </div>
            <div class="h-10 flex justify-center w-1/4">
              <WorkspaceSearch v-model:value="quickFilterValue" />
            </div>
            <div class="w-1/3"></div>
          </div>
          <WorkspaceCard class="flex-1 min-h-0">
            <template #main>
              <ProductTable :quickFilterValue="quickFilterValue" />
            </template>
            <template #footer>
              <div class="flex items-center gap-1.5 px-1.5">
                <ProductTableFilterSelect />
              </div>
            </template>
          </WorkspaceCard>
        </div>
      </SplitterPanel>
    </Splitter>
  </div>
</template>
