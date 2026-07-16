import type { EntityTable } from 'dexie'
import { db } from '../db/db'
import { syncApi } from '../api/sync.api'
import { chunkArray } from '../utils/batching'
import { isOlderEntity } from '../utils/sync.helpers'
import type { LocalEntity, LocalProductItem, LocalProductPackage } from '../types/entities.types'
import type {
  ProductBarcode,
  ProductCollection,
  ProductItem,
  ProductShipment,
  Warehouse,
} from '@meerkapp/wms-contracts'

// TODO(product-table): add an optional online infinite/server-side mode before
// collections regularly exceed this size. It must complement, not replace,
// the full product_items Dexie sync used for offline catalog browsing.
export const PRODUCT_TABLE_LIMIT = 5000

export interface BoundedProductItemList {
  items: LocalProductItem[]
  truncated: boolean
}

interface FetchResponse<T> {
  items: T[]
  hasMore?: boolean
}

function getItems<T>(response: T[] | FetchResponse<T>, source: string) {
  if (Array.isArray(response)) return response
  if (response.hasMore) {
    console.warn(
      `[${source}] Results were limited to ${PRODUCT_TABLE_LIMIT}; ` +
        'an infinite/server-side row model is still required.',
    )
  }
  return response.items
}

function trimToProductTableLimit<T>(items: T[], source: string): T[] {
  if (items.length <= PRODUCT_TABLE_LIMIT) return items
  console.warn(
    `[${source}] Dexie query exceeded ${PRODUCT_TABLE_LIMIT} rows; ` +
      'showing a bounded client-side result.',
  )
  return items.slice(0, PRODUCT_TABLE_LIMIT)
}

async function putFetchedItems<T extends LocalEntity>(table: EntityTable<T, 'id'>, items: T[]) {
  if (items.length === 0) return

  await db.transaction('rw', table, async () => {
    for (const chunk of chunkArray(items, 1000)) {
      const existing = await table.bulkGet(
        chunk.map((item) => item.id) as Parameters<typeof table.bulkGet>[0],
      )
      const freshItems = chunk.filter((item, index) => {
        const localItem = existing[index]
        return !localItem || !isOlderEntity(item, localItem)
      })
      if (freshItems.length > 0) await table.bulkPut(freshItems)
    }
  })
}

export const productPackageRepository = {
  list: () => db.productPackages.toArray(),

  async listBasePrices(productItemIds: LocalProductItem['id'][]) {
    if (productItemIds.length === 0) return []
    const items = (await db.productPackages
      .where('productItemId')
      .anyOf(productItemIds)
      .and((productPackage) => productPackage.isBase)
      .limit(PRODUCT_TABLE_LIMIT + 1)
      .toArray()) as LocalProductPackage[]
    return trimToProductTableLimit(items, 'product-packages')
  },
}

export const productShipmentRepository = {
  async listPositiveByWarehouse(
    warehouseId: Warehouse['id'],
    productItemIds: LocalProductItem['id'][],
  ) {
    if (productItemIds.length === 0) return []
    const visibleIds = new Set(productItemIds)
    const items = (await db.productShipments
      .where('warehouseId')
      .equals(warehouseId)
      .filter((shipment) => shipment.quantity > 0 && visibleIds.has(shipment.productItemId))
      .limit(PRODUCT_TABLE_LIMIT + 1)
      .toArray()) as ProductShipment[]
    return trimToProductTableLimit(items, 'product-shipments')
  },
}

export const productItemRepository = {
  listByName: () => db.productItems.orderBy('name').toArray(),

  async listByCollection(
    productCollectionId: ProductCollection['id'] | null,
  ): Promise<BoundedProductItemList> {
    // Traverse the SKU index first, then filter and cap. Applying sortBy()
    // after limit() would sort only an arbitrary primary-key subset.
    const items = (await db.productItems
      .orderBy('sku')
      .filter((item) => item.productCollectionId === productCollectionId)
      .limit(PRODUCT_TABLE_LIMIT + 1)
      .toArray()) as LocalProductItem[]

    return {
      items: items.slice(0, PRODUCT_TABLE_LIMIT),
      truncated: items.length > PRODUCT_TABLE_LIMIT,
    }
  },

  get: (id: ProductItem['id']) => db.productItems.get(id),

  async fetchById(id: ProductItem['id']) {
    const items = getItems(
      await syncApi.fetchProductItems<LocalProductItem>({ id }),
      'product-items:fetch-by-id',
    )
    await putFetchedItems(db.productItems, items)
    return items[0]
  },

  async fetchByCollection(productCollectionId: ProductCollection['id'] | null) {
    const items = getItems(
      await syncApi.fetchProductItems<LocalProductItem>({ productCollectionId }),
      'product-items:fetch-by-collection',
    )
    await putFetchedItems(db.productItems, items)
    return items
  },
}

export const productBarcodeRepository = {
  getByCode: (code: ProductBarcode['code']) =>
    db.productBarcodes.where('code').equals(code).first(),

  async fetchByCode(code: ProductBarcode['code']) {
    const items = getItems(
      await syncApi.fetchProductBarcodes<ProductBarcode>(code),
      'product-barcodes:fetch-by-code',
    )
    await putFetchedItems(db.productBarcodes, items)
    return items[0]
  },
}
