import { db } from '../db/db'
import type {
  Country,
  Folder,
  Locality,
  Organization,
  ProductBrand,
  ProductCollection,
  ProductMeasure,
  ProductType,
  Warehouse,
} from '@meerkapp/wms-contracts'

export const countryRepository = {
  listByCode: () => db.countries.orderBy('code').toArray(),
  get: (id: Country['id']) => db.countries.get(id),
}

export const localityRepository = {
  listByName: () => db.localities.orderBy('name').toArray(),
  get: (id: Locality['id']) => db.localities.get(id),
}

export const organizationRepository = {
  list: () => db.organizations.toArray(),
  listByName: () => db.organizations.orderBy('name').toArray(),
  get: (id: Organization['id']) => db.organizations.get(id),
}

export const warehouseRepository = {
  list: () => db.warehouses.toArray(),
  listByCode: () => db.warehouses.orderBy('code').toArray(),
  get: (id: Warehouse['id']) => db.warehouses.get(id),
}

export const folderRepository = {
  list: () => db.folders.toArray(),
  get: (id: Folder['id']) => db.folders.get(id),
}

export const productTypeRepository = {
  list: () => db.productTypes.toArray(),
  listByName: () => db.productTypes.orderBy('name').toArray(),
  get: (id: ProductType['id']) => db.productTypes.get(id),
}

export const productCollectionRepository = {
  list: () => db.productCollections.toArray(),
  get: (id: ProductCollection['id']) => db.productCollections.get(id),
}

export const productBrandRepository = {
  listByName: () => db.productBrands.orderBy('name').toArray(),
  get: (id: ProductBrand['id']) => db.productBrands.get(id),
}

export const productMeasureRepository = {
  listByCode: () => db.productMeasures.orderBy('code').toArray(),
  get: (id: ProductMeasure['id']) => db.productMeasures.get(id),
}
