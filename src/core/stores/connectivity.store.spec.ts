import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const dependencies = vi.hoisted(() => ({
  requestHealthcheck: vi.fn(),
}))

vi.mock('@/core/api/health', () => ({
  requestHealthcheck: dependencies.requestHealthcheck,
}))

import { useConnectivityStore } from './connectivity.store'

let browserOnline = true
let windowTarget: EventTarget

beforeEach(() => {
  setActivePinia(createPinia())
  vi.useFakeTimers()
  browserOnline = true
  windowTarget = new EventTarget()
  vi.stubGlobal('window', windowTarget)
  vi.stubGlobal('navigator', {
    get onLine() {
      return browserOnline
    },
  })
  dependencies.requestHealthcheck.mockReset()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('connectivity store', () => {
  it('requires consecutive server failures before reporting an outage', async () => {
    const store = useConnectivityStore()
    dependencies.requestHealthcheck.mockResolvedValueOnce(undefined)

    await store.checkServer()

    expect(store.status).toBe('online')
    expect(store.statusColor).toBe('green')

    dependencies.requestHealthcheck.mockRejectedValue(new TypeError('Server unavailable'))
    await store.checkServer()
    expect(store.status).toBe('online')

    await store.checkServer()
    expect(store.status).toBe('server-unavailable')
    expect(store.statusColor).toBe('yellow')
  })

  it('reacts immediately to browser offline and rechecks after reconnect', async () => {
    const store = useConnectivityStore()
    dependencies.requestHealthcheck.mockResolvedValue(undefined)
    store.startMonitoring()
    await store.checkServer()

    browserOnline = false
    windowTarget.dispatchEvent(new Event('offline'))

    expect(store.status).toBe('offline')
    expect(store.statusColor).toBe('red')

    browserOnline = true
    windowTarget.dispatchEvent(new Event('online'))
    await store.checkServer()

    expect(store.status).toBe('online')
    store.stopMonitoring()
  })
})
