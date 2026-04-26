import { useI18n } from 'vue-i18n'
import { useMutation } from '@pinia/colada'
import { useToast } from 'primevue/usetoast'
import { useAppDialog } from '@/core/composables/useAppDialog'
import { useNavigationStore } from '../stores/navigation.store'
import { folderApi } from '../api/folder.api'
import { productCollectionApi } from '../api/product-collection.api'
import type {
  Folder,
  ProductCollection,
  CreateFolderDto,
  UpdateFolderDto,
  CreateProductCollectionDto,
  UpdateProductCollectionDto,
} from '@meerkapp/wms-contracts'
import FolderFormDialog from '../components/FolderFormDialog.vue'
import ProductCollectionFormDialog from '../components/ProductCollectionFormDialog.vue'

export function useNavigationActions() {
  const { t } = useI18n()
  const dialog = useAppDialog()
  const toast = useToast()
  const navigationStore = useNavigationStore()

  const onError = () =>
    toast.add({ severity: 'error', summary: t('common.error.network'), life: 3000 })

  const { mutate: createFolder } = useMutation({
    mutation: (dto: CreateFolderDto) => folderApi.create(dto),
    onError,
  })

  const { mutate: updateFolder } = useMutation({
    mutation: ({ id, dto }: { id: number; dto: UpdateFolderDto }) => folderApi.update(id, dto),
    onError,
  })

  const { mutate: createCollection } = useMutation({
    mutation: (dto: CreateProductCollectionDto) => productCollectionApi.create(dto),
    onSuccess: (collection) => navigationStore.setSelectedItem('product_collection', collection.id),
    onError,
  })

  const { mutate: updateCollection } = useMutation({
    mutation: ({ id, dto }: { id: number; dto: UpdateProductCollectionDto }) =>
      productCollectionApi.update(id, dto),
    onError,
  })

  const { mutate: pinFolder } = useMutation({
    mutation: (id: number) => folderApi.pin(id),
    onError,
  })

  const { mutate: unpinFolder } = useMutation({
    mutation: (id: number) => folderApi.unpin(id),
    onError,
  })

  const { mutate: moveFolderUp } = useMutation({
    mutation: (id: number) => folderApi.moveUp(id),
    onError,
  })

  const { mutate: moveFolderDown } = useMutation({
    mutation: (id: number) => folderApi.moveDown(id),
    onError,
  })

  const { mutate: pinCollection } = useMutation({
    mutation: (id: number) => productCollectionApi.pin(id),
    onError,
  })

  const { mutate: unpinCollection } = useMutation({
    mutation: (id: number) => productCollectionApi.unpin(id),
    onError,
  })

  const { mutate: moveCollectionUp } = useMutation({
    mutation: (id: number) => productCollectionApi.moveUp(id),
    onError,
  })

  const { mutate: moveCollectionDown } = useMutation({
    mutation: (id: number) => productCollectionApi.moveDown(id),
    onError,
  })

  function openCreateFolderDialog(parentId?: number | null) {
    dialog.open(FolderFormDialog, {
      props: {
        header: t('navigation.folder.form.titleCreate'),
        modal: true,
        style: { width: '24rem' },
      },
      data: { folder: parentId != null ? { parentId } : undefined },
      onClose: (options) => {
        if (options?.data) createFolder(options.data)
      },
    })
  }

  function openEditFolderDialog(folder: Folder) {
    dialog.open(FolderFormDialog, {
      props: {
        header: t('navigation.folder.form.titleEdit'),
        modal: true,
        style: { width: '24rem' },
      },
      data: { folder },
      onClose: (options) => {
        if (options?.data) updateFolder({ id: folder.id, dto: options.data })
      },
    })
  }

  function openCreateCollectionDialog(folderId?: number | null) {
    dialog.open(ProductCollectionFormDialog, {
      props: {
        header: t('navigation.collection.form.titleCreate'),
        modal: true,
        style: { width: '24rem' },
      },
      data: { collection: folderId != null ? { folderId } : undefined },
      onClose: (options) => {
        if (options?.data) createCollection(options.data)
      },
    })
  }

  function openEditCollectionDialog(collection: ProductCollection) {
    dialog.open(ProductCollectionFormDialog, {
      props: {
        header: t('navigation.collection.form.titleEdit'),
        modal: true,
        style: { width: '24rem' },
      },
      data: { collection },
      onClose: (options) => {
        if (options?.data) updateCollection({ id: collection.id, dto: options.data })
      },
    })
  }

  return {
    openCreateFolderDialog,
    openEditFolderDialog,
    openCreateCollectionDialog,
    openEditCollectionDialog,
    pinFolder,
    unpinFolder,
    moveFolderUp,
    moveFolderDown,
    pinCollection,
    unpinCollection,
    moveCollectionUp,
    moveCollectionDown,
  }
}
