import type { Collection } from '@signaldb/core'
import Localities from '../models/localities.model'
import Countries from '../models/countries.model'
import Organizations from '../models/organizations.model'
import Warehouses from '../models/warehouses.model'

export interface CollectionRegistryEntry {
  collection: Collection<any>
  collectionName: string
  tableName: string
}

export const collectionsRegistry: CollectionRegistryEntry[] = [
  Countries,
  Localities,
  Organizations,
  Warehouses,
]
