import { db } from '../db/db'
import type { SyncCollection } from '../types/sync.types'

export const syncCollections: SyncCollection[] = [
  { id: 'countries', tableName: 'country', table: db.countries },
  { id: 'localities', tableName: 'locality', table: db.localities },
  {
    id: 'organizations',
    tableName: 'organization',
    table: db.organizations,
  },
  { id: 'warehouses', tableName: 'warehouse', table: db.warehouses },
  { id: 'folders', tableName: 'folder', table: db.folders },
  { id: 'productTypes', tableName: 'product_type', table: db.productTypes },
  {
    id: 'productCollections',
    tableName: 'product_collection',
    table: db.productCollections,
  },
  {
    id: 'productBrands',
    tableName: 'product_brand',
    table: db.productBrands,
  },
  {
    id: 'productMeasures',
    tableName: 'product_measure',
    table: db.productMeasures,
  },
  {
    id: 'productPackages',
    tableName: 'product_package',
    table: db.productPackages,
  },
  {
    id: 'productShipments',
    tableName: 'product_shipment',
    table: db.productShipments,
  },
  {
    id: 'productItems',
    tableName: 'product_item',
    table: db.productItems,
  },
  {
    id: 'productItemStats',
    tableName: 'product_item_stats',
    table: db.productItemStats,
    initialSync: false,
    socketSync: true,
  },
  {
    id: 'productBarcodes',
    tableName: 'product_barcode',
    table: db.productBarcodes,
  },
]

export function getSyncCollectionByTableName(tableName: string) {
  return syncCollections.find((collection) => collection.tableName === tableName)
}
