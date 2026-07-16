import type { EntityTable } from 'dexie'
import type { LocalEntity } from './entities.types'

export type SyncCursor = string | number | null

export interface SyncState {
  id: string
  cursor: SyncCursor
  lastSyncedAt?: string
  status?: 'idle' | 'syncing' | 'error'
  error?: string | null
}

export type SyncStoreName =
  | 'countries'
  | 'localities'
  | 'organizations'
  | 'warehouses'
  | 'folders'
  | 'productTypes'
  | 'productCollections'
  | 'productBrands'
  | 'productMeasures'
  | 'productPackages'
  | 'productShipments'
  | 'productItems'
  | 'productItemStats'
  | 'productBarcodes'

export interface SyncCollection<T extends LocalEntity = LocalEntity> {
  id: SyncStoreName
  tableName: string
  table: EntityTable<T, 'id'>
  initialSync?: boolean
  socketSync?: boolean
}

export type DeletedId = LocalEntity['id']

export interface NormalizedSyncBatch<T extends LocalEntity> {
  upserted: T[]
  deletedIds: DeletedId[]
  cursor: SyncCursor
  hasMore: boolean
}

export type SyncPullResponse<T extends LocalEntity> =
  | T[]
  | {
      items?: T[]
      upserted?: T[]
      deletedIds?: DeletedId[]
      deleted?: Array<DeletedId | { id: DeletedId }>
      cursor?: SyncCursor
      nextCursor?: SyncCursor
      revision?: SyncCursor
      hasMore?: boolean
    }

export interface SyncChangePayload<T = unknown> {
  added?: T[]
  modified?: T[]
  removed?: DeletedId[]
  upserted?: T[]
  deletedIds?: DeletedId[]
  deleted?: Array<DeletedId | { id: DeletedId }>
  cursor?: SyncCursor
}

export interface SyncProgress {
  current: number
  total: number
  collection: SyncCollection
}

export type SyncReason = 'initial' | 'connect' | 'reconnect' | 'retry' | 'manual'

export interface SyncRuntimeState {
  status: 'idle' | 'syncing' | 'error' | 'done'
  reason: SyncReason | null
  current: number
  total: number
  currentTable: string | null
  error: string | null
}
