import { computed, ref, shallowRef, watch, watchEffect } from 'vue'
import { defineStore, storeToRefs } from 'pinia'
import { i18n } from '@/plugins/i18n'
import { useNavigationStore } from '@modules/navigation/stores/navigation.store'
import { useAuthStore } from '@/modules/auth/stores/auth.store'
import {
  productBrandRepository,
  productMeasureRepository,
} from '@/modules/sync/repositories/read-model.repository'
import { productItemRepository } from '@/modules/sync/repositories/product.repository'
import { productItemStatsRepository } from '@/modules/sync/repositories/product-item-stats.repository'
import { subscribeDexieLiveQuery } from '@/modules/sync/composables/dexie-live-query'
import type { LocalProductItem, LocalProductItemStats } from '@/modules/sync/types/entities.types'
import type { GridApi } from 'ag-grid-community'
import type { ProductBrand, ProductMeasure, Warehouse } from '@meerkapp/wms-contracts'
import type {
  FilterPreset,
  FilterPresetKey,
  ProductTableItem,
} from '@modules/product-table/types/product-table.type'

export const useProductTableStore = defineStore('product-table', () => {
  const navigationStore = useNavigationStore()
  const authStore = useAuthStore()
  const { selectedItem: selectedNavigationItem } = storeToRefs(navigationStore)
  const { user } = storeToRefs(authStore)

  const gridApi = shallowRef<GridApi<LocalProductItem> | null>(null)

  const filterPresets: FilterPreset[] = [
    { key: 'all', name: i18n.global.t('product.table.filter.options.all'), validate: () => true },
    {
      key: 'in-stock',
      name: i18n.global.t('product.table.filter.options.in-stock'),
      validate: (productItem) => productItem.quantity > 0,
    },
    {
      key: 'out-of-stock',
      name: i18n.global.t('product.table.filter.options.out-of-stock'),
      validate: (productItem) => productItem.quantity === 0,
    },
    {
      key: 'public',
      name: i18n.global.t('product.table.filter.options.public'),
      validate: (productItem) => productItem.isPublic,
    },
    {
      key: 'private',
      name: i18n.global.t('product.table.filter.options.private'),
      validate: (productItem) => !productItem.isPublic,
    },
  ]
  const selectedFilterPresetKey = ref<FilterPresetKey>('all')

  const selectedProductItemId = ref<LocalProductItem['id'] | null>(null)
  const selectedWarehouseId = ref<Warehouse['id'] | null>(null)
  const isProductTableTruncated = ref(false)

  const rawItems = shallowRef<LocalProductItem[]>([])
  const rawStats = shallowRef<LocalProductItemStats[]>([])
  const rawBrands = shallowRef<ProductBrand[]>([])
  const rawMeasures = shallowRef<ProductMeasure[]>([])

  watchEffect((onCleanup) => {
    const unsubscribe = subscribeDexieLiveQuery(productBrandRepository.listByName, (items) => {
      rawBrands.value = items
    })
    onCleanup(unsubscribe)
  })

  watchEffect((onCleanup) => {
    const unsubscribe = subscribeDexieLiveQuery(productMeasureRepository.listByCode, (items) => {
      rawMeasures.value = items
    })
    onCleanup(unsubscribe)
  })

  watchEffect((onCleanup) => {
    const type = selectedNavigationItem.value?.type

    if (type !== 'product_collection' && type !== 'product_archive') {
      rawItems.value = []
      isProductTableTruncated.value = false
      return
    }

    const productCollectionId =
      type === 'product_collection' ? Number(selectedNavigationItem.value!.id) : null

    const unsubscribe = subscribeDexieLiveQuery(
      () => productItemRepository.listByCollection(productCollectionId),
      (result) => {
        rawItems.value = result.items
        isProductTableTruncated.value = result.truncated
      },
    )

    let cancelled = false
    if (!authStore.isOffline) {
      void productItemRepository.fetchByCollection(productCollectionId).catch((error) => {
        if (!cancelled) console.error('[product-items:fetch]', error)
      })
    }

    onCleanup(() => {
      cancelled = true
      unsubscribe()
    })
  })

  watchEffect((onCleanup) => {
    const warehouseId = selectedWarehouseId.value
    const navigationType = selectedNavigationItem.value?.type
    const isProductTableOpen =
      navigationType === 'product_collection' || navigationType === 'product_archive'

    if (warehouseId === null || !isProductTableOpen) {
      rawStats.value = []
      productItemStatsRepository.setActiveWarehouse(null)
      return
    }

    productItemStatsRepository.setActiveWarehouse(warehouseId)
    const unsubscribe = subscribeDexieLiveQuery(
      () => productItemStatsRepository.listByWarehouse(warehouseId),
      (stats) => {
        rawStats.value = stats
      },
    )

    let cancelled = false
    void (async () => {
      await productItemStatsRepository.cleanupExpired()
      if (!authStore.isOffline) {
        await productItemStatsRepository.ensureForWarehouse(warehouseId, {
          pinned: warehouseId === user.value?.warehouseId,
        })
      }
    })().catch((error) => {
      if (!cancelled) console.error('[product-item-stats:fetch]', error)
    })

    onCleanup(() => {
      cancelled = true
      unsubscribe()
      productItemStatsRepository.setActiveWarehouse(null)
    })
  })

  const statsMap = computed(() => new Map(rawStats.value.map((stat) => [stat.productItemId, stat])))

  const brandMap = computed(
    () => new Map(rawBrands.value.map((productBrand) => [productBrand.id, productBrand])),
  )

  const measureMap = computed(
    () => new Map(rawMeasures.value.map((productMeasure) => [productMeasure.id, productMeasure])),
  )

  const productTableItems = computed<ProductTableItem[]>(() =>
    rawItems.value.map((item) => ({
      ...item,
      productBrandName:
        (item.productBrandId === null ? null : brandMap.value.get(item.productBrandId)?.name) ?? '',
      productMeasureName:
        (item.productMeasureId === null
          ? null
          : (measureMap.value.get(item.productMeasureId)?.name ??
            measureMap.value.get(item.productMeasureId)?.code)) ?? '',
      retailPrice:
        statsMap.value.get(item.id)?.retailPrice === null ||
        statsMap.value.get(item.id)?.retailPrice === undefined
          ? null
          : String(statsMap.value.get(item.id)?.retailPrice),
      currency: statsMap.value.get(item.id)?.currency ?? null,
      quantity: Number(statsMap.value.get(item.id)?.quantity ?? 0),
    })),
  )

  function setGridApi(api: GridApi<LocalProductItem>) {
    gridApi.value = api
  }

  watch(selectedNavigationItem, (newVal, oldVal) => {
    if (newVal?.type !== oldVal?.type || newVal?.id !== oldVal?.id) {
      // setSelectedProductItemId(null, false)
      selectedProductItemId.value = null

      if (newVal && gridApi.value) {
        gridApi.value.ensureIndexVisible(0, 'top')
      }
    }
  })

  function setSelectedProductItemId(
    id: LocalProductItem['id'] | null,
    scrollToSelectedProduct = true,
  ) {
    selectedProductItemId.value = id

    if (gridApi.value) {
      if (selectedProductItemId.value !== null) {
        requestAnimationFrame(() => {
          const node = gridApi.value?.getRowNode(String(selectedProductItemId.value))
          if (node) {
            if (!node.isSelected()) node.setSelected(true)
            if (scrollToSelectedProduct) gridApi.value?.ensureNodeVisible(node, 'middle')
          }
        })
      } else {
        const selectedRows = gridApi.value.getSelectedRows()
        if (selectedRows && selectedRows.length > 0) gridApi.value.deselectAll()
      }
    }
  }

  function setSelectedFilterPresetKey(key: FilterPresetKey) {
    selectedFilterPresetKey.value = key
    gridApi.value?.onFilterChanged()
  }

  return {
    gridApi,
    productTableItems,
    isProductTableTruncated,
    selectedProductItemId,
    selectedWarehouseId,
    filterPresets,
    selectedFilterPresetKey,
    setGridApi,
    setSelectedProductItemId,
    setSelectedFilterPresetKey,
  }
})
