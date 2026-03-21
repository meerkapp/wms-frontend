import { Collection } from '@signaldb/core'
import vueReactivityAdapter from '@signaldb/vue'
import { dataAdapter } from '../sync/manager'

const collectionName = 'stocks'
const tableName = 'stock'

export const Stocks = new Collection(collectionName, dataAdapter, {
  reactivity: vueReactivityAdapter,
  indices: ['updated_at'],
})

export default { collection: Stocks, collectionName, tableName }
