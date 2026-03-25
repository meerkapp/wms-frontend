import { Collection } from '@signaldb/core'
import vueReactivityAdapter from '@signaldb/vue'
import { dataAdapter } from '../sync/manager'
import type { Organization } from '@meerkapp/wms-contracts'

const collectionName = 'organizations'
const tableName = 'organization'

export const Organizations = new Collection<Organization>(collectionName, dataAdapter, {
  reactivity: vueReactivityAdapter,
  indices: ['updated_at'],
})

export default { collection: Organizations, collectionName, tableName }
