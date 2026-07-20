import { ref } from 'vue'
import { useRegisterSW } from 'virtual:pwa-register/vue'

export function useAppUpdate() {
  let registration: ServiceWorkerRegistration | undefined

  const isUpdating = ref(false)
  const { needRefresh: isUpdateAvailable, updateServiceWorker } = useRegisterSW({
    immediate: true,
    onRegisteredSW: (_scriptUrl, value) => {
      registration = value
    },
    onRegisterError: (error) => {
      console.error('[pwa:register]', error)
    },
  })

  async function checkForUpdate() {
    if (!registration || isUpdateAvailable.value || !navigator.onLine) return
    await registration.update()
  }

  async function installUpdate() {
    if (!isUpdateAvailable.value || isUpdating.value) return

    isUpdating.value = true
    try {
      await updateServiceWorker()
    } catch (error) {
      isUpdating.value = false
      throw error
    }
  }

  return {
    checkForUpdate,
    installUpdate,
    isUpdateAvailable,
    isUpdating,
  }
}
