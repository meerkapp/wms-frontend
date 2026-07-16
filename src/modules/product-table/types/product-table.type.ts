import type { ProductItemStats } from '@meerkapp/wms-contracts'
import type { LocalProductItem } from '@/modules/sync/types/entities.types'

export type ProductTableItem = LocalProductItem & {
  productBrandName: string
  productMeasureName: string
  retailPrice: string | null
  currency: ProductItemStats['currency']
  quantity: number
}

export type FilterPresetKey = 'all' | 'in-stock' | 'out-of-stock' | 'public' | 'private'

export interface FilterPreset {
  key: FilterPresetKey
  name: string
  validate: (item: ProductTableItem) => boolean
}
