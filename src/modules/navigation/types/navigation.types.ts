export interface NavigationMenuItem {
  key: string
  id: number
  label: string
  type: 'folder' | 'product_collection' | 'text_document' | 'product_favorites' | 'product_archive'
  pinnedAt: string | null
  pinOrder: number | null
  items?: NavigationMenuItem[]
}
