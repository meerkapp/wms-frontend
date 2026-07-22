// TODO(product-table): add an optional online infinite/server-side mode before
// collections regularly exceed this size. It must complement, not replace,
// the full product_items Dexie sync used for offline catalog browsing.
export const PRODUCT_TABLE_LIMIT = 5000
