import { Collection } from '@signaldb/core'
import vueReactivityAdapter from '@signaldb/vue'
import { dataAdapter } from '../sync/manager'
import type { ProductPackage } from '@meerkapp/wms-contracts'

const collectionName = 'product_packages'
const tableName = 'product_package'

export const ProductPackages = new Collection<ProductPackage>(collectionName, dataAdapter, {
  reactivity: vueReactivityAdapter,
  indices: ['updatedAt'],
})

export default { collection: ProductPackages, collectionName, tableName }
