import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { requestHealthcheck } from '@/core/api/health'

const HEALTHCHECK_INTERVAL_MS = 15_000
const HEALTHCHECK_RETRY_MS = 2_000
const HEALTHCHECK_TIMEOUT_MS = 5_000
const SERVER_FAILURE_THRESHOLD = 2

export type ConnectivityStatus = 'checking' | 'online' | 'server-unavailable' | 'offline'
export type ConnectivityStatusColor = 'green' | 'yellow' | 'red'
export type ConnectionUnavailableReason = Exclude<ConnectivityStatus, 'online'>

function browserIsOnline() {
  return typeof navigator === 'undefined' || navigator.onLine
}

export const useConnectivityStore = defineStore('connectivity', () => {
  const isClientOnline = ref(browserIsOnline())
  const isServerOnline = ref<boolean | null>(null)
  let consecutiveServerFailures = 0
  let monitoring = false
  let healthcheckPromise: Promise<void> | null = null
  let healthcheckController: AbortController | null = null
  let intervalId: ReturnType<typeof setInterval> | null = null
  let retryId: ReturnType<typeof setTimeout> | null = null

  const status = computed<ConnectivityStatus>(() => {
    if (!isClientOnline.value) return 'offline'
    if (isServerOnline.value === true) return 'online'
    if (isServerOnline.value === false) return 'server-unavailable'
    return 'checking'
  })

  const statusColor = computed<ConnectivityStatusColor>(() => {
    if (status.value === 'online') return 'green'
    if (status.value === 'offline') return 'red'
    return 'yellow'
  })

  function clearRetry() {
    if (retryId !== null) clearTimeout(retryId)
    retryId = null
  }

  function scheduleRetry() {
    if (!monitoring || retryId !== null) return
    retryId = setTimeout(() => {
      retryId = null
      void checkServer()
    }, HEALTHCHECK_RETRY_MS)
  }

  function markClientOffline() {
    isClientOnline.value = false
    isServerOnline.value = null
    consecutiveServerFailures = 0
    clearRetry()
    healthcheckController?.abort()
  }

  function markClientOnline() {
    isClientOnline.value = true
    isServerOnline.value = null
    consecutiveServerFailures = 0
    void checkServer()
  }

  function handleWindowFocus() {
    if (browserIsOnline()) void checkServer()
  }

  function checkServer(): Promise<void> {
    if (!browserIsOnline()) {
      markClientOffline()
      return Promise.resolve()
    }
    isClientOnline.value = true
    if (healthcheckPromise) return healthcheckPromise

    const controller = new AbortController()
    healthcheckController = controller
    const timeoutId = setTimeout(() => controller.abort(), HEALTHCHECK_TIMEOUT_MS)

    const promise = requestHealthcheck(controller.signal)
      .then(() => {
        consecutiveServerFailures = 0
        isServerOnline.value = true
        clearRetry()
      })
      .catch(() => {
        if (!browserIsOnline()) {
          markClientOffline()
          return
        }
        consecutiveServerFailures += 1
        if (consecutiveServerFailures >= SERVER_FAILURE_THRESHOLD) {
          isServerOnline.value = false
        } else {
          scheduleRetry()
        }
      })
      .finally(() => {
        clearTimeout(timeoutId)
        if (healthcheckController === controller) healthcheckController = null
        if (healthcheckPromise === promise) healthcheckPromise = null
      })

    healthcheckPromise = promise
    return promise
  }

  function startMonitoring() {
    if (monitoring || typeof window === 'undefined') return
    monitoring = true
    window.addEventListener('online', markClientOnline)
    window.addEventListener('offline', markClientOffline)
    window.addEventListener('focus', handleWindowFocus)
    intervalId = setInterval(() => void checkServer(), HEALTHCHECK_INTERVAL_MS)

    if (browserIsOnline()) void checkServer()
    else markClientOffline()
  }

  function stopMonitoring() {
    if (!monitoring || typeof window === 'undefined') return
    monitoring = false
    window.removeEventListener('online', markClientOnline)
    window.removeEventListener('offline', markClientOffline)
    window.removeEventListener('focus', handleWindowFocus)
    if (intervalId !== null) clearInterval(intervalId)
    intervalId = null
    clearRetry()
    healthcheckController?.abort()
    healthcheckController = null
  }

  return {
    isClientOnline,
    isServerOnline,
    status,
    statusColor,
    checkServer,
    startMonitoring,
    stopMonitoring,
  }
})
