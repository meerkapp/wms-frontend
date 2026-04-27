import { Collection } from '@signaldb/core'
import vueReactivityAdapter from '@signaldb/vue'
import { dataAdapter } from '../sync/manager'
import type { ProductShipment } from '@meerkapp/wms-contracts'

const collectionName = 'product_shipments'
const tableName = 'product_shipment'

export const ProductShipments = new Collection<ProductShipment>(collectionName, dataAdapter, {
  reactivity: vueReactivityAdapter,
  indices: ['updatedAt'],
})

export default { collection: ProductShipments, collectionName, tableName }
