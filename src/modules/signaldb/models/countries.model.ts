import { Collection } from '@signaldb/core'
import vueReactivityAdapter from '@signaldb/vue'
import { dataAdapter } from '../sync/manager'
import type { Country } from '@meerkapp/wms-contracts'

const collectionName = 'countries'
const tableName = 'country'

export const Countries = new Collection<Country>(collectionName, dataAdapter, {
  reactivity: vueReactivityAdapter,
  indices: ['updated_at'],
})

export default { collection: Countries, collectionName, tableName }
