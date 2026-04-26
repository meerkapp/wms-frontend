import type { Collection } from '@signaldb/core'
import Localities from '../models/localities.model'
import Countries from '../models/countries.model'
import Organizations from '../models/organizations.model'
import Warehouses from '../models/warehouses.model'
import Folders from '../models/folders.model'
import ProductTypes from '../models/product-types.model'
import ProductCollections from '../models/product-collections.model'

export interface CollectionRegistryEntry {
  collection: Collection<{ id: unknown }>
  collectionName: string
  tableName: string
}

export const collectionsRegistry: CollectionRegistryEntry[] = [
  Countries,
  Localities,
  Organizations,
  Warehouses,
  Folders,
  ProductTypes,
  ProductCollections,
]
