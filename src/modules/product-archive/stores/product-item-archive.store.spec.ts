import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ProductItem, ProductItemWithRelations } from '@meerkapp/wms-contracts'
import { StaleAccountRequestError } from '@/core/api/stale-account-request.error'

const dependencies = vi.hoisted(() => ({
  listBounded: vi.fn(),
  archive: vi.fn(),
  restore: vi.fn(),
  applyServerDelete: vi.fn(),
  applyServerUpsert: vi.fn(),
}))

vi.mock('@/modules/product-archive/api/product-item-archive.api', () => ({
  productItemArchiveApi: {
    listBounded: dependencies.listBounded,
    archive: dependencies.archive,
    restore: dependencies.restore,
  },
}))

vi.mock('@/modules/sync/services/sync.service', () => ({
  localSyncService: {
    applyServerDelete: dependencies.applyServerDelete,
    applyServerUpsert: dependencies.applyServerUpsert,
  },
}))

vi.mock('@/modules/auth/api/auth.api', () => ({ authApi: {} }))

import { useAuthStore } from '@/modules/auth/stores/auth.store'
import { useConnectivityStore } from '@/core/stores/connectivity.store'
import { useProductItemArchiveStore } from './product-item-archive.store'

function encodeJwtPart(value: object) {
  return btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function accessToken(accountId: string) {
  return `${encodeJwtPart({ alg: 'none', typ: 'JWT' })}.${encodeJwtPart({
    sub: accountId,
    email: `${accountId}@test.local`,
    firstName: 'Test',
    lastName: 'User',
    warehouseId: null,
    isActive: true,
    permissions: ['product_item:archive'],
    lastSeen: null,
    avatarUrl: null,
  })}.signature`
}

function productItem(id: number): ProductItemWithRelations {
  return {
    id,
    sku: `SKU-${id}`,
    name: `Product ${id}`,
    productCollectionId: null,
    productTypeId: 1,
    productBrandId: null,
    productMeasureId: 1,
    countryId: null,
    characteristics: {},
    writeoffStrategy: null,
    isPublic: true,
    archivedAt: '2026-07-23T00:00:00.000Z',
    archivedByEmployeeId: 'employee-a',
    updatedAt: '2026-07-23T00:00:00.000Z',
    productBrand: null,
    productMeasure: {
      id: 1,
      code: 'pcs',
      name: null,
      updatedAt: '2026-07-23T00:00:00.000Z',
    },
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise
  })
  return { promise, resolve }
}

function activateOnlineAccount(accountId = 'account-a') {
  useAuthStore().setTokens(accessToken(accountId))
  const connectivityStore = useConnectivityStore()
  connectivityStore.isClientOnline = true
  connectivityStore.isServerOnline = true
  connectivityStore.isClientVersionCompatible = true
}

beforeEach(() => {
  setActivePinia(createPinia())
  for (const dependency of Object.values(dependencies)) dependency.mockReset()
  dependencies.applyServerDelete.mockResolvedValue(undefined)
  dependencies.applyServerUpsert.mockResolvedValue(undefined)
  activateOnlineAccount()
})

describe('product item archive store', () => {
  it('keeps an ensured barcode match visible outside the bounded archive page', async () => {
    dependencies.listBounded.mockResolvedValue({
      items: [productItem(1)],
      truncated: true,
    })
    const store = useProductItemArchiveStore()

    await expect(store.load(productItem(2))).resolves.toBe(true)

    expect(store.items.map((item: ProductItem) => item.id)).toEqual([1, 2])
    expect(store.isTruncated).toBe(true)
  })

  it('does not mutate the local read model after the active account changes', async () => {
    const response = deferred<ProductItemWithRelations>()
    dependencies.archive.mockReturnValue(response.promise)
    const store = useProductItemArchiveStore()

    const request = store.archive(1)
    useAuthStore().setTokens(accessToken('account-b'))
    response.resolve(productItem(1))

    await expect(request).rejects.toBeInstanceOf(StaleAccountRequestError)
    expect(dependencies.applyServerDelete).not.toHaveBeenCalled()
  })

  it('does not publish a completed mutation when the account changes during local cleanup', async () => {
    const cleanup = deferred<void>()
    dependencies.archive.mockResolvedValue(productItem(1))
    dependencies.applyServerDelete.mockReturnValue(cleanup.promise)
    const store = useProductItemArchiveStore()

    const request = store.archive(1)
    await vi.waitFor(() => expect(dependencies.applyServerDelete).toHaveBeenCalledOnce())
    useAuthStore().setTokens(accessToken('account-b'))
    cleanup.resolve()

    await expect(request).rejects.toBeInstanceOf(StaleAccountRequestError)
    expect(store.revision).toBe(0)
  })

  it('restores a product into the local read model before removing it from the archive', async () => {
    const restored = { ...productItem(1), archivedAt: null, archivedByEmployeeId: null }
    dependencies.listBounded.mockResolvedValue({ items: [productItem(1)], truncated: false })
    dependencies.restore.mockResolvedValue(restored)
    const store = useProductItemArchiveStore()
    await store.load()

    await expect(store.restore(1)).resolves.toBe(true)

    expect(dependencies.applyServerUpsert).toHaveBeenCalledWith('product_item', restored)
    expect(store.items).toEqual([])
    expect(store.revision).toBe(1)
  })
})
