import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { localStateRepository } from '@/modules/sync/repositories/local-state.repository'
import type { ThemePreference } from '@/modules/sync/types/local-state.types'

const SYSTEM_THEME_QUERY = '(prefers-color-scheme: dark)'

function getSystemThemeDark() {
  return typeof window !== 'undefined' && window.matchMedia(SYSTEM_THEME_QUERY).matches
}

export const useThemeStore = defineStore('theme', () => {
  const currentTheme = ref<ThemePreference>('system')
  const isSystemThemeDark = ref(getSystemThemeDark())
  let activeAccountId: string | null = null
  let systemThemeMediaQuery: MediaQueryList | null = null
  let loadSequence = 0

  const isDarkTheme = computed(
    () =>
      currentTheme.value === 'dark' || (currentTheme.value === 'system' && isSystemThemeDark.value),
  )

  function applyTheme(theme: ThemePreference) {
    const isDark = theme === 'system' ? isSystemThemeDark.value : theme === 'dark'

    document.documentElement.classList.toggle('app-dark', isDark)
    document.body.dataset.agThemeMode = isDark ? 'app-dark' : 'app-light'

    currentTheme.value = theme
  }

  async function setTheme(theme: ThemePreference) {
    applyTheme(theme)

    const accountId = activeAccountId
    if (accountId !== null) {
      await localStateRepository.setThemePreference(accountId, theme)
    }
  }

  async function toggleTheme() {
    await setTheme(isDarkTheme.value ? 'light' : 'dark')
  }

  async function loadTheme(accountId: string | null = null) {
    const sequence = ++loadSequence
    activeAccountId = accountId
    const savedTheme =
      accountId === null ? null : await localStateRepository.getThemePreference(accountId)

    if (sequence === loadSequence) {
      applyTheme(savedTheme ?? 'system')
    }
  }

  function handleSystemThemeChange(event: MediaQueryListEvent) {
    isSystemThemeDark.value = event.matches
    if (currentTheme.value === 'system') applyTheme('system')
  }

  function startSystemThemeMonitoring() {
    if (systemThemeMediaQuery !== null || typeof window === 'undefined') return

    systemThemeMediaQuery = window.matchMedia(SYSTEM_THEME_QUERY)
    isSystemThemeDark.value = systemThemeMediaQuery.matches
    systemThemeMediaQuery.addEventListener('change', handleSystemThemeChange)
    if (currentTheme.value === 'system') applyTheme('system')
  }

  function stopSystemThemeMonitoring() {
    systemThemeMediaQuery?.removeEventListener('change', handleSystemThemeChange)
    systemThemeMediaQuery = null
  }

  return {
    isDarkTheme,
    currentTheme,
    isSystemThemeDark,
    setTheme,
    toggleTheme,
    loadTheme,
    startSystemThemeMonitoring,
    stopSystemThemeMonitoring,
  }
})
