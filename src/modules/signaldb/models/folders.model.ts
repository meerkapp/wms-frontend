import { Collection } from '@signaldb/core'
import vueReactivityAdapter from '@signaldb/vue'
import { dataAdapter } from '../sync/manager'
import type { Folder } from '@meerkapp/wms-contracts'

const collectionName = 'folders'
const tableName = 'folder'

export const Folders = new Collection<Folder>(collectionName, dataAdapter, {
  reactivity: vueReactivityAdapter,
  indices: ['updatedAt'],
})

export default { collection: Folders, collectionName, tableName }
