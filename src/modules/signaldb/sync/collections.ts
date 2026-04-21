import type { Collection } from '@signaldb/core'
import Localities from '../models/localities.model'
import Countries from '../models/countries.model'
import Organizations from '../models/organizations.model'
import Warehouses from '../models/warehouses.model'
import ProductTypes from '../models/product-types.model'

export interface CollectionRegistryEntry {
  collection: Collection<object>
  collectionName: string
  tableName: string
}

export const collectionsRegistry: CollectionRegistryEntry[] = [
  Countries,
  Localities,
  Organizations,
  Warehouses,
  ProductTypes,
]
