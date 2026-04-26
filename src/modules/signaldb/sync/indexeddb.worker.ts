import { WorkerDataAdapterHost } from '@signaldb/core'
import prepareIndexedDB from '@signaldb/indexeddb'

const storage = prepareIndexedDB({
  version: 3,
  databaseName: 'meerk-server-db',
  schema: {
    countries: [],
    localities: [],
    organizations: [],
    warehouses: [],
    folders: [],
    product_types: [],
    product_collections: [],
    'sync-manager-changes': ['collectionName'],
    'sync-manager-snapshots': ['collectionName'],
    'sync-manager-sync-operations': ['collectionName', 'status'],
  },
})

new WorkerDataAdapterHost(self as WorkerGlobalScope & typeof globalThis, { storage })
