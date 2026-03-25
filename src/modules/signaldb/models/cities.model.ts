import { Collection } from '@signaldb/core'
import vueReactivityAdapter from '@signaldb/vue'
import { dataAdapter } from '../sync/manager'
import type { City } from '@meerkapp/wms-contracts'

const collectionName = 'cities'
const tableName = 'city'

export const Cities = new Collection<City>(collectionName, dataAdapter, {
  reactivity: vueReactivityAdapter,
  indices: ['updated_at'],
})

export default { collection: Cities, collectionName, tableName }
