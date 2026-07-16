<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { storeToRefs } from 'pinia'
import { Message } from 'primevue'
import { AgGridVue } from 'ag-grid-vue3'
import {
  CellApiModule,
  CellStyleModule,
  ClientSideRowModelModule,
  CustomFilterModule,
  EventApiModule,
  ExternalFilterModule,
  LocaleModule,
  QuickFilterModule,
  RowApiModule,
  RowSelectionModule,
  ScrollApiModule,
  ValidationModule,
  ValueCacheModule,
  iconSetMaterial,
  themeQuartz,
  type Module,
} from 'ag-grid-community'
import type { ColDef, SelectionChangedEvent, IRowNode } from 'ag-grid-community'
import { useNavigationStore } from '@modules/navigation/stores/navigation.store'
import { useProductTableStore } from '@modules/product-table/stores/product-table.store'
import type { ProductTableItem } from '@modules/product-table/types/product-table.type'
import ProductBrandFilter from '@modules/product-table/components/ProductBrandFilter.vue'
import { getCurrencyMinorUnits } from '@meerkapp/wms-contracts'
import { formatMinorAmount } from '@/modules/price-list/utils/money'
import { PRODUCT_TABLE_LIMIT } from '@/modules/sync/repositories/product.repository'

const productTableStore = useProductTableStore()
const { setGridApi, setSelectedProductItemId, filterPresets } = productTableStore
const {
  productTableItems,
  isProductTableTruncated,
  selectedProductItemId,
  selectedFilterPresetKey,
} = storeToRefs(productTableStore)

const navigationStore = useNavigationStore()
const { selectedItem } = storeToRefs(navigationStore)

const props = defineProps<{ quickFilterValue: string }>()
const { locale, t } = useI18n()

const productTableModules: Module[] = [
  ClientSideRowModelModule,
  CustomFilterModule,
  QuickFilterModule,
  ExternalFilterModule,
  RowSelectionModule,
  RowApiModule,
  ScrollApiModule,
  CellApiModule,
  EventApiModule,
  CellStyleModule,
  ValueCacheModule,
  LocaleModule,
  ...(import.meta.env.DEV ? [ValidationModule] : []),
]

const isArchive = computed(() => selectedItem.value?.type === 'product_archive')

function toCurrencyPrice(
  value: string | null,
  currency: ProductTableItem['currency'] | undefined,
): string {
  if (value === null || currency === null || currency === undefined) return '—'
  const majorAmount = Number(formatMinorAmount(value, getCurrencyMinorUnits(currency)))
  return new Intl.NumberFormat(locale.value, {
    style: 'currency',
    currency,
  }).format(majorAmount)
}

const columnDefs = computed<ColDef<ProductTableItem>[]>(() => [
  {
    field: 'sku',
    headerName: t('product.table.columns.sku'),
    sortable: false,
    width: 120,
    cellClass: 'text-center',
  },
  {
    field: 'name',
    headerName: t('product.table.columns.name'),
    sortable: false,
    flex: 1,
    minWidth: 250,
  },
  {
    field: 'productBrandName',
    headerName: t('product.table.columns.brand'),
    sortable: false,
    filter: ProductBrandFilter,
  },
  {
    field: 'productMeasureName',
    headerName: t('product.table.columns.measure'),
    width: 110,
  },
  {
    field: 'quantity',
    headerName: t('product.table.columns.quantity'),
    hide: isArchive.value,
    width: 110,
  },
  {
    field: 'retailPrice',
    headerName: t('product.table.columns.retailPrice'),
    width: 160,
    valueFormatter: ({ value, data }) => toCurrencyPrice(value, data?.currency),
  },
])

const myTheme = themeQuartz
  .withPart(iconSetMaterial)
  .withParams(
    {
      borderRadius: 6,
      browserColorScheme: 'light',
      fontFamily: 'inherit',
      textColor: 'var(--p-text-color)',
      backgroundColor: 'var(--p-surface-0)',
      headerFontSize: '1rem',
      headerFontWeight: 600,
      headerHeight: '3rem',
      rowHeight: '2.25rem',
      wrapperBorderRadius: 0,
      wrapperBorder: { width: 0 },
      borderColor: 'var(--p-content-border-color)',
      rowBorder: { color: 'var(--p-content-border-color)' },
      columnBorder: { color: 'var(--p-content-border-color)' },
      rangeSelectionBorderColor: 'var(--p-primary-color)',
      rowHoverColor: 'var(--p-surface-100)',
      selectedRowBackgroundColor: 'var(--p-surface-200)',
      buttonActiveBackgroundColor: 'var(--p-primary-color)',
      iconButtonActiveBackgroundColor: 'var(--p-primary-color)',
      iconButtonActiveColor: 'var(--p-primary-contrast-color)',
      iconButtonActiveIndicatorColor: 'var(--p-primary-contrast-color)',
    },
    'app-light',
  )
  .withParams(
    {
      borderRadius: 6,
      browserColorScheme: 'dark',
      fontFamily: 'inherit',
      textColor: 'var(--p-text-color)',
      backgroundColor: 'var(--p-surface-950)',
      headerFontSize: '1rem',
      headerFontWeight: 600,
      headerHeight: '3rem',
      rowHeight: '2.25rem',
      wrapperBorderRadius: 0,
      wrapperBorder: { width: 0 },
      borderColor: 'var(--p-content-border-color)',
      rowBorder: { color: 'var(--p-content-border-color)' },
      columnBorder: { color: 'var(--p-content-border-color)' },
      rangeSelectionBorderColor: 'var(--p-primary-color)',
      rowHoverColor: 'var(--p-surface-900)',
      selectedRowBackgroundColor: 'var(--p-surface-800)',
      menuBackgroundColor: 'var(--p-surface-900)',
      buttonActiveBackgroundColor: 'var(--p-primary-color)',
      iconButtonActiveBackgroundColor: 'var(--p-primary-color)',
      iconButtonActiveColor: 'var(--p-primary-contrast-color)',
      iconButtonActiveIndicatorColor: 'var(--p-primary-contrast-color)',
    },
    'app-dark',
  )

function onSelectionChanged({ selectedNodes }: SelectionChangedEvent<ProductTableItem>) {
  if (selectedNodes && selectedNodes.length > 0) {
    const selectedData = selectedNodes[0]?.data
    if (selectedData !== undefined && selectedData.id !== selectedProductItemId.value) {
      setSelectedProductItemId(selectedData.id, false)
    }
  }
}

function isExternalFilterPresent() {
  return selectedFilterPresetKey.value !== 'all'
}

function doesExternalFilterPass(node: IRowNode<ProductTableItem>): boolean {
  if (node && node.data) {
    const productItem = node.data
    const filterPreset = filterPresets.find((p) => p.key === selectedFilterPresetKey.value)
    if (filterPreset) {
      return filterPreset.validate(productItem)
    }
  }
  return true
}
</script>

<template>
  <div class="flex flex-col w-full h-full">
    <Message
      v-if="isProductTableTruncated"
      severity="warn"
      :closable="false"
      size="small"
      class="m-2 shrink-0"
    >
      {{ t('product.table.limitWarning', { limit: PRODUCT_TABLE_LIMIT }) }}
    </Message>
    <div class="relative flex-1 min-h-0">
      <AgGridVue
        :modules="productTableModules"
        :theme="myTheme"
        :rowData="productTableItems"
        :columnDefs="columnDefs"
        :rowSelection="{ mode: 'singleRow', checkboxes: false, enableClickSelection: true }"
        :quickFilterText="props.quickFilterValue"
        :animateRows="false"
        :suppressRowTransform="true"
        :alwaysShowVerticalScroll="true"
        :suppressColumnVirtualisation="true"
        :isExternalFilterPresent="isExternalFilterPresent"
        :doesExternalFilterPass="doesExternalFilterPass"
        :rowBuffer="10"
        :valueCache="true"
        :localeText="{ noRowsToShow: t('product.table.empty') }"
        :getRowId="({ data }) => String(data.id)"
        @gridReady="setGridApi($event.api)"
        @selectionChanged="onSelectionChanged"
        class="w-full h-full"
      />
    </div>
  </div>
</template>

<style scoped>
:deep(.ag-icon-grip:before) {
  color: var(--p-text-muted-color) !important;
}
</style>
