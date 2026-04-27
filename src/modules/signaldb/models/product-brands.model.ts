import { Collection } from '@signaldb/core'
import vueReactivityAdapter from '@signaldb/vue'
import { dataAdapter } from '../sync/manager'
import type { ProductBrand } from '@meerkapp/wms-contracts'

const collectionName = 'product_brands'
const tableName = 'product_brand'

export const ProductBrands = new Collection<ProductBrand>(collectionName, dataAdapter, {
  reactivity: vueReactivityAdapter,
  indices: ['updatedAt'],
})

export default { collection: ProductBrands, collectionName, tableName }
