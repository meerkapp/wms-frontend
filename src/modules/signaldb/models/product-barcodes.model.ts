import { Collection } from '@signaldb/core'
import vueReactivityAdapter from '@signaldb/vue'
import { dataAdapter } from '../sync/manager'
import type { ProductBarcode } from '@meerkapp/wms-contracts'

const collectionName = 'product_barcodes'
const tableName = 'product_barcode'

export const ProductBarcodes = new Collection<ProductBarcode>(collectionName, dataAdapter, {
  reactivity: vueReactivityAdapter,
  indices: ['updatedAt'],
})

export default { collection: ProductBarcodes, collectionName, tableName }
