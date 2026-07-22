import type { ProductItem } from '@meerkapp/wms-contracts'
import { db } from '../db/db'

const productReadModelTables = [
  db.productItems,
  db.productBarcodes,
  db.productPackages,
  db.productShipments,
  db.productItemStats,
]

export async function removeProductItemsFromCurrentTransaction(
  productItemIds: ProductItem['id'][],
) {
  if (productItemIds.length === 0) return

  await db.productBarcodes.where('productItemId').anyOf(productItemIds).delete()
  await db.productPackages.where('productItemId').anyOf(productItemIds).delete()
  await db.productShipments.where('productItemId').anyOf(productItemIds).delete()
  await db.productItemStats.where('productItemId').anyOf(productItemIds).delete()
  await db.productItems.bulkDelete(productItemIds)
}

export const productReadModelRepository = {
  removeProductItems(productItemIds: ProductItem['id'][]) {
    return db.transaction('rw', productReadModelTables, () =>
      removeProductItemsFromCurrentTransaction(productItemIds),
    )
  },
}

export function getProductReadModelTables() {
  return productReadModelTables
}
