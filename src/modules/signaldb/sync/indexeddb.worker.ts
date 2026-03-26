import { WorkerDataAdapterHost } from '@signaldb/core'
import prepareIndexedDB from '@signaldb/indexeddb'

const storage = prepareIndexedDB({
  version: 1,
  databaseName: 'meerk-server-db',
  schema: {
    countries: [],
    localities: [],
    organizations: [],
    warehouses: [],
    'sync-manager-changes': ['collectionName'],
    'sync-manager-snapshots': ['collectionName'],
    'sync-manager-sync-operations': ['collectionName', 'status'],
  },
})

new WorkerDataAdapterHost(self as WorkerGlobalScope & typeof globalThis, { storage })
