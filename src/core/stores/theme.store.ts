import { defineStore } from 'pinia'
import { computed, ref, watchEffect } from 'vue'

export const useThemeStore = defineStore('theme', () => {
  type Theme = 'light' | 'dark' | 'system'

  // Tailwind v4 removed --tw-gradient-stops, so we use plain CSS gradients applied to body
  const STATUS_GRADIENTS = {
    green: {
      light: 'radial-gradient(circle 600px at bottom left, rgb(74 222 128 / 0.2), transparent)',
      dark: 'radial-gradient(circle 600px at bottom left, rgb(34 197 94 / 0.2), transparent)',
    },
    red: {
      light: 'radial-gradient(circle 600px at bottom left, rgb(248 113 113 / 0.2), transparent)',
      dark: 'radial-gradient(circle 600px at bottom left, rgb(239 68 68 / 0.2), transparent)',
    },
    yellow: {
      light: 'radial-gradient(circle 600px at bottom left, rgb(251 191 36 / 0.2), transparent)',
      dark: 'radial-gradient(circle 600px at bottom left, rgb(234 179 8 / 0.2), transparent)',
    },
  }

  type StatusKey = keyof typeof STATUS_GRADIENTS
  const currentStatus = ref<StatusKey>('green')

  // const THEME_STORE_KEY = 'themePreference'

  const currentTheme = ref<Theme>('system')
  const isSystemThemeDark = ref<boolean>(true)

  const isDarkTheme = computed(() => currentTheme.value === 'dark' || isSystemThemeDark.value)

  watchEffect(() => {
    const variant = isDarkTheme.value ? 'dark' : 'light'
    document.body.style.backgroundImage = STATUS_GRADIENTS[currentStatus.value][variant]
  })

  async function applyTheme(theme: Theme) {
    const isDark = theme == 'system' ? isSystemThemeDark.value : theme === 'dark'

    document.documentElement.classList.toggle('app-dark', isDark)
    document.body.dataset.agThemeMode = isDark ? 'app-dark' : 'app-light'

    currentTheme.value = theme
  }

  async function setTheme(theme: Theme) {
    await applyTheme(theme)
    // await window.electronStore.set(THEME_STORE_KEY, theme)
  }

  async function toggleTheme() {
    const theme: Theme = currentTheme.value === 'dark' ? 'light' : 'dark'
    await applyTheme(theme)
    // await window.electronStore.set(THEME_STORE_KEY, theme)
  }

  async function loadTheme() {
    // const savedTheme = await window.electronStore.get(THEME_STORE_KEY)
    // isSystemThemeDark.value = await window.theme.getDarkStatus()
    // await applyTheme(savedTheme || 'system')
    await applyTheme('system')
  }

  return {
    STATUS_GRADIENTS,
    currentStatus,
    isDarkTheme,
    currentTheme,
    isSystemThemeDark,
    setTheme,
    toggleTheme,
    loadTheme,
  }
})
