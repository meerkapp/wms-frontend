import { Collection } from '@signaldb/core'
import vueReactivityAdapter from '@signaldb/vue'
import { dataAdapter } from '../sync/manager'

const collectionName = 'warehouses'
const tableName = 'warehouse'

export const Warehouses = new Collection(collectionName, dataAdapter, {
  reactivity: vueReactivityAdapter,
  indices: ['updated_at'],
})

export default { collection: Warehouses, collectionName, tableName }
