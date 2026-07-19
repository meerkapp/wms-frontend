import Dexie, { type EntityTable, type Table } from 'dexie'
import type {
  Country,
  Folder,
  Locality,
  Organization,
  ProductBarcode,
  ProductBrand,
  ProductCollection,
  ProductMeasure,
  ProductShipment,
  ProductType,
  Warehouse,
} from '@meerkapp/wms-contracts'
import type {
  LocalProductItem,
  LocalProductItemStats,
  LocalProductPackage,
  ProductItemStatsCacheScope,
} from '../types/entities.types'
import type {
  LocalAccountAvatarCache,
  LocalAccountProfile,
  LocalSetting,
  ReadModelMetadata,
} from '../types/local-state.types'
import type { SyncState } from '../types/sync.types'

export const WMS_LOCAL_DB_NAME = 'meerk-wms-sync-read-model-db'

export const WMS_LOCAL_DB_SCHEMAS = {
  1: {
    countries: 'id, updatedAt, code',
    localities: 'id, updatedAt, name, countryId',
    organizations: 'id, updatedAt, name',
    warehouses: 'id, updatedAt, code, organizationId, localityId',
    folders: 'id, updatedAt, parentId, name, pinnedAt, pinOrder',
    productTypes: 'id, updatedAt, name',
    productCollections: 'id, updatedAt, folderId, defaultProductTypeId, name, pinnedAt, pinOrder',
    productBrands: 'id, updatedAt, name',
    productMeasures: 'id, updatedAt, code, name',
    productPackages: 'id, updatedAt, productItemId, name',
    productShipments: 'id, updatedAt, warehouseId, productItemId, quantity, [warehouseId+quantity]',
    productItems:
      'id, updatedAt, sku, name, productCollectionId, productTypeId, productBrandId, productMeasureId, isPublic',
    productBarcodes: 'id, updatedAt, code, productItemId',
    syncState: 'id, status, lastSyncedAt',
  },
  2: {
    productItemStats:
      'id, updatedAt, productItemId, warehouseId, [warehouseId+productItemId], [productItemId+warehouseId]',
    productItemStatsCache: 'warehouseId, pinned, loadedAt, accessedAt, expiresAt',
  },
  3: {
    productItemStatsCache: null,
  },
  4: {
    productItemStatsCache:
      '[accountId+warehouseId], accountId, warehouseId, pinned, loadedAt, accessedAt, expiresAt',
  },
  5: {
    accountProfiles: 'accountId, lastAuthenticatedAt',
    localSettings: 'key',
    readModelMetadata: 'key',
  },
  6: {
    accountAvatarCache: 'accountId, sourceUrl, cachedAt',
  },
} as const

export class WmsLocalDb extends Dexie {
  countries!: EntityTable<Country, 'id'>
  localities!: EntityTable<Locality, 'id'>
  organizations!: EntityTable<Organization, 'id'>
  warehouses!: EntityTable<Warehouse, 'id'>
  folders!: EntityTable<Folder, 'id'>
  productTypes!: EntityTable<ProductType, 'id'>
  productCollections!: EntityTable<ProductCollection, 'id'>
  productBrands!: EntityTable<ProductBrand, 'id'>
  productMeasures!: EntityTable<ProductMeasure, 'id'>
  productPackages!: EntityTable<LocalProductPackage, 'id'>
  productShipments!: EntityTable<ProductShipment, 'id'>
  productItems!: EntityTable<LocalProductItem, 'id'>
  productItemStats!: EntityTable<LocalProductItemStats, 'id'>
  productItemStatsCache!: Table<ProductItemStatsCacheScope, [string, number]>
  productBarcodes!: EntityTable<ProductBarcode, 'id'>
  syncState!: EntityTable<SyncState, 'id'>
  accountProfiles!: EntityTable<LocalAccountProfile, 'accountId'>
  accountAvatarCache!: EntityTable<LocalAccountAvatarCache, 'accountId'>
  localSettings!: EntityTable<LocalSetting, 'key'>
  readModelMetadata!: EntityTable<ReadModelMetadata, 'key'>

  constructor(name = WMS_LOCAL_DB_NAME) {
    super(name)

    this.version(1).stores(WMS_LOCAL_DB_SCHEMAS[1])

    this.version(2).stores(WMS_LOCAL_DB_SCHEMAS[2])

    // The v2 cache scopes were not attributable to an account. Drop only that
    // metadata table during migration; the dataset-scoped stats rows remain.
    // Dexie does not support changing a primary key in place, hence the
    // explicit remove/recreate pair.
    this.version(3).stores(WMS_LOCAL_DB_SCHEMAS[3])

    this.version(4).stores(WMS_LOCAL_DB_SCHEMAS[4])

    this.version(5).stores(WMS_LOCAL_DB_SCHEMAS[5])

    this.version(6).stores(WMS_LOCAL_DB_SCHEMAS[6])
  }
}

export const db = new WmsLocalDb()
