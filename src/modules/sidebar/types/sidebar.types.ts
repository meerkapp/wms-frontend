import type { Component, ComputedRef } from 'vue'

export interface SidebarItem {
  title: string
  hideTitle?: boolean
  key: string
  iconClass: string
  badge?: ComputedRef<number>
  content: Component
  position: 'top' | 'bottom'
  disabled?: boolean
}
