import { Collection } from '@signaldb/core'
import vueReactivityAdapter from '@signaldb/vue'
import { dataAdapter } from '../sync/manager'
import type { ProductCollection } from '@meerkapp/wms-contracts'

const collectionName = 'product_collections'
const tableName = 'product_collection'

export const ProductCollections = new Collection<ProductCollection>(collectionName, dataAdapter, {
  reactivity: vueReactivityAdapter,
  indices: ['updatedAt'],
})

export default { collection: ProductCollections, collectionName, tableName }
