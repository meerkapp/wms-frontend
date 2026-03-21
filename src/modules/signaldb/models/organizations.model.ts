import { Collection } from '@signaldb/core'
import vueReactivityAdapter from '@signaldb/vue'
import { dataAdapter } from '../sync/manager'

const collectionName = 'organizations'
const tableName = 'organization'

export const Organizations = new Collection(collectionName, dataAdapter, {
  reactivity: vueReactivityAdapter,
  indices: ['updated_at'],
})

export default { collection: Organizations, collectionName, tableName }
