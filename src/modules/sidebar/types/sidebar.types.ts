import type { Component, ComputedRef } from 'vue'

export type SidebarAvailability = 'local-read-model' | 'server-required'

export interface SidebarItem {
  type?: 'item'
  title: string
  hideTitle?: boolean
  key: string
  iconClass: string
  badge?: ComputedRef<number>
  content: Component
  position: 'top' | 'bottom'
  availability: SidebarAvailability
  disabled?: boolean
}

export interface SidebarSeparator {
  type: 'separator'
  key: string
  position: 'top' | 'bottom'
}

export type SidebarEntry = SidebarItem | SidebarSeparator
