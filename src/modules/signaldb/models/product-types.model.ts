import { Collection } from '@signaldb/core'
import vueReactivityAdapter from '@signaldb/vue'
import { dataAdapter } from '../sync/manager'
import type { ProductType } from '@meerkapp/wms-contracts'

const collectionName = 'product_types'
const tableName = 'product_type'

export const ProductTypes = new Collection<ProductType>(collectionName, dataAdapter, {
  reactivity: vueReactivityAdapter,
  indices: ['updatedAt'],
})

export default { collection: ProductTypes, collectionName, tableName }
