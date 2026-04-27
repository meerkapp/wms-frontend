import { Collection } from '@signaldb/core'
import vueReactivityAdapter from '@signaldb/vue'
import { dataAdapter } from '../sync/manager'
import type { ProductItem } from '@meerkapp/wms-contracts'

const collectionName = 'product_items'
const tableName = 'product_item'

export const ProductItems = new Collection<ProductItem>(collectionName, dataAdapter, {
  reactivity: vueReactivityAdapter,
  indices: ['updatedAt'],
})

export default { collection: ProductItems, collectionName, tableName }
