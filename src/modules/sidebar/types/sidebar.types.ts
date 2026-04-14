import type { Component, ComputedRef } from 'vue'

export interface SidebarItem {
  type?: 'item'
  title: string
  hideTitle?: boolean
  key: string
  iconClass: string
  badge?: ComputedRef<number>
  content: Component
  position: 'top' | 'bottom'
  disabled?: boolean
}

export interface SidebarSeparator {
  type: 'separator'
  key: string
  position: 'top' | 'bottom'
}

export type SidebarEntry = SidebarItem | SidebarSeparator
