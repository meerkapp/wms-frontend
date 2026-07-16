import { computed, type MaybeRefOrGetter } from 'vue'
import {
  countryRepository,
  folderRepository,
  localityRepository,
  organizationRepository,
  productCollectionRepository,
  productTypeRepository,
  warehouseRepository,
} from '../repositories/read-model.repository'
import { productItemRepository, productPackageRepository } from '../repositories/product.repository'
import { useDexieLiveQuery, useDexieLiveQueryById } from './dexie-live-query'

export function useCountries() {
  return useDexieLiveQuery(countryRepository.listByCode, [])
}

export function useCountry(id: MaybeRefOrGetter<number | null | undefined>) {
  return useDexieLiveQueryById(id, (value) => countryRepository.get(Number(value)))
}

export function useLocalities() {
  return useDexieLiveQuery(localityRepository.listByName, [])
}

export function useLocality(id: MaybeRefOrGetter<number | null | undefined>) {
  return useDexieLiveQueryById(id, (value) => localityRepository.get(Number(value)))
}

export function useOrganizations(options: { sortByName?: boolean } = {}) {
  return useDexieLiveQuery(
    options.sortByName ? organizationRepository.listByName : organizationRepository.list,
    [],
  )
}

export function useWarehouses() {
  return useDexieLiveQuery(warehouseRepository.list, [])
}

export function useFolders() {
  return useDexieLiveQuery(folderRepository.list, [])
}

export function useProductTypes(options: { sortByName?: boolean } = {}) {
  return useDexieLiveQuery(
    options.sortByName ? productTypeRepository.listByName : productTypeRepository.list,
    [],
  )
}

export function useProductCollections() {
  return useDexieLiveQuery(productCollectionRepository.list, [])
}

export function useProductItems() {
  return useDexieLiveQuery(productItemRepository.listByName, [])
}

export function useProductPackages() {
  return useDexieLiveQuery(productPackageRepository.list, [])
}

export function useWarehouseLocalityCountry(
  localityId: MaybeRefOrGetter<number | null | undefined>,
) {
  const locality = useLocality(localityId)
  const countryId = computed(() => locality.value?.countryId ?? null)
  const country = useCountry(countryId)

  return { locality, country }
}
