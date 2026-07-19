import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const dependencies = vi.hoisted(() => ({
  getThemePreference: vi.fn(),
  setThemePreference: vi.fn(),
}))

vi.mock('@/modules/sync/repositories/local-state.repository', () => ({
  localStateRepository: {
    getThemePreference: dependencies.getThemePreference,
    setThemePreference: dependencies.setThemePreference,
  },
}))

import { useThemeStore } from './theme.store'

let systemThemeDark = true
let mediaQueryTarget: EventTarget

beforeEach(() => {
  setActivePinia(createPinia())
  systemThemeDark = true
  mediaQueryTarget = new EventTarget()

  vi.stubGlobal('window', {
    matchMedia: vi.fn(() => ({
      get matches() {
        return systemThemeDark
      },
      addEventListener: mediaQueryTarget.addEventListener.bind(mediaQueryTarget),
      removeEventListener: mediaQueryTarget.removeEventListener.bind(mediaQueryTarget),
    })),
  })
  vi.stubGlobal('document', {
    documentElement: {
      classList: { toggle: vi.fn() },
    },
    body: { dataset: {} },
  })

  dependencies.getThemePreference.mockReset()
  dependencies.setThemePreference.mockReset()
  dependencies.setThemePreference.mockResolvedValue(undefined)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('theme store', () => {
  it('toggles both ways when the system theme is dark and persists the explicit choice', async () => {
    dependencies.getThemePreference.mockResolvedValue(null)
    const store = useThemeStore()

    await store.loadTheme('account-a')
    expect(store.currentTheme).toBe('system')
    expect(store.isDarkTheme).toBe(true)

    await store.toggleTheme()
    expect(store.currentTheme).toBe('light')
    expect(store.isDarkTheme).toBe(false)
    expect(document.body.dataset.agThemeMode).toBe('app-light')

    await store.toggleTheme()
    expect(store.currentTheme).toBe('dark')
    expect(store.isDarkTheme).toBe(true)
    expect(document.body.dataset.agThemeMode).toBe('app-dark')
    expect(dependencies.setThemePreference).toHaveBeenNthCalledWith(1, 'account-a', 'light')
    expect(dependencies.setThemePreference).toHaveBeenNthCalledWith(2, 'account-a', 'dark')
  })

  it('restores a separate preference when the active account changes', async () => {
    dependencies.getThemePreference.mockImplementation(async (accountId: string) =>
      accountId === 'account-a' ? 'light' : 'dark',
    )
    const store = useThemeStore()

    await store.loadTheme('account-a')
    expect(store.currentTheme).toBe('light')
    expect(store.isDarkTheme).toBe(false)

    await store.loadTheme('account-b')
    expect(store.currentTheme).toBe('dark')
    expect(store.isDarkTheme).toBe(true)
  })

  it('does not apply a stale preference after a faster account switch', async () => {
    let resolveFirstAccount!: (theme: 'light') => void
    const firstAccountPreference = new Promise<'light'>((resolve) => {
      resolveFirstAccount = resolve
    })
    dependencies.getThemePreference.mockImplementation((accountId: string) =>
      accountId === 'account-a' ? firstAccountPreference : Promise.resolve('dark'),
    )
    const store = useThemeStore()

    const firstLoad = store.loadTheme('account-a')
    await store.loadTheme('account-b')
    resolveFirstAccount('light')
    await firstLoad

    expect(store.currentTheme).toBe('dark')
    expect(store.isDarkTheme).toBe(true)
  })

  it('follows system changes while the system preference is active', async () => {
    dependencies.getThemePreference.mockResolvedValue(null)
    const store = useThemeStore()
    await store.loadTheme('account-a')
    store.startSystemThemeMonitoring()

    systemThemeDark = false
    mediaQueryTarget.dispatchEvent(Object.assign(new Event('change'), { matches: false }))

    expect(store.isSystemThemeDark).toBe(false)
    expect(store.isDarkTheme).toBe(false)
    expect(document.body.dataset.agThemeMode).toBe('app-light')
    store.stopSystemThemeMonitoring()
  })
})
