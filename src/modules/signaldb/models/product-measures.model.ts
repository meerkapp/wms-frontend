import { Collection } from '@signaldb/core'
import vueReactivityAdapter from '@signaldb/vue'
import { dataAdapter } from '../sync/manager'
import type { ProductMeasure } from '@meerkapp/wms-contracts'

const collectionName = 'product_measures'
const tableName = 'product_measure'

export const ProductMeasures = new Collection<ProductMeasure>(collectionName, dataAdapter, {
  reactivity: vueReactivityAdapter,
  indices: ['updatedAt'],
})

export default { collection: ProductMeasures, collectionName, tableName }
