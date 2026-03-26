import { Collection } from '@signaldb/core'
import vueReactivityAdapter from '@signaldb/vue'
import { dataAdapter } from '../sync/manager'
import type { Locality } from '@meerkapp/wms-contracts'

const collectionName = 'localities'
const tableName = 'locality'

export const Localities = new Collection<Locality>(collectionName, dataAdapter, {
  reactivity: vueReactivityAdapter,
  indices: ['updated_at'],
})

export default { collection: Localities, collectionName, tableName }
