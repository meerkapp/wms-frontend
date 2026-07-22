import type {
  Country,
  Folder,
  Locality,
  Organization,
  ProductBarcode,
  ProductBrand,
  ProductCollection,
  ProductItem,
  ProductItemFavorite,
  ProductItemStats,
  ProductMeasure,
  ProductPackage,
  ProductShipment,
  ProductType,
  Warehouse,
} from '@meerkapp/wms-contracts'

export type LocalProductPackage = ProductPackage & {
  retailPrice?: number
}

export type LocalProductItem = ProductItem & {
  productBrand?: ProductBrand | null
  productMeasure?: ProductMeasure | null
}

// The sync transport serializes Prisma Decimal/BigInt values as strings. The
// published contract still describes their pre-serialization number/bigint
// forms, so the local read model accepts both without coercing precision away.
export type LocalProductItemStats = Omit<ProductItemStats, 'quantity' | 'retailPrice'> & {
  productItemId: ProductItem['id']
  warehouseId: Warehouse['id']
  quantity: ProductItemStats['quantity'] | string
  retailPrice: ProductItemStats['retailPrice'] | string | null
  updatedAt: string
}

export interface ProductItemStatsCacheScope {
  accountId: string
  warehouseId: Warehouse['id']
  pinned: boolean
  loadedAt: number
  accessedAt: number
  expiresAt: number | null
}

export interface LocalProductItemFavorite extends ProductItemFavorite {
  accountId: string
}

export type LocalEntity =
  | Country
  | Locality
  | Organization
  | Warehouse
  | Folder
  | ProductType
  | ProductCollection
  | ProductBrand
  | ProductMeasure
  | LocalProductPackage
  | ProductShipment
  | LocalProductItem
  | LocalProductItemStats
  | ProductBarcode
