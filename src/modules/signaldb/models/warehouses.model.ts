import { Collection } from '@signaldb/core'
import vueReactivityAdapter from '@signaldb/vue'
import { dataAdapter } from '../sync/manager'
import type { Warehouse } from '@meerkapp/wms-contracts'

const collectionName = 'warehouses'
const tableName = 'warehouse'

export const Warehouses = new Collection<Warehouse>(collectionName, dataAdapter, {
  reactivity: vueReactivityAdapter,
  indices: ['updated_at'],
})

export default { collection: Warehouses, collectionName, tableName }
