import { beforeEach, describe, expect, it, vi } from 'vitest'

const dependencies = vi.hoisted(() => ({
  add: vi.fn(),
}))

vi.mock('primevue/usetoast', () => ({
  useToast: () => dependencies,
}))

import {
  APP_TOAST_ERROR_LIFE_MS,
  APP_TOAST_GROUP,
  APP_TOAST_LIFE_MS,
  useAppToast,
} from './useAppToast'

beforeEach(() => {
  dependencies.add.mockReset()
})

describe('useAppToast', () => {
  it('applies compact defaults', () => {
    const toast = useAppToast()

    toast.success('Saved')

    expect(dependencies.add).toHaveBeenCalledWith({
      group: APP_TOAST_GROUP,
      severity: 'success',
      summary: 'Saved',
      life: APP_TOAST_LIFE_MS,
      closable: false,
    })
  })

  it('keeps multiple messages in the same group', () => {
    const toast = useAppToast()

    toast.success('Saved')
    toast.info('Synchronized')

    expect(dependencies.add).toHaveBeenCalledTimes(2)
    expect(dependencies.add).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        group: APP_TOAST_GROUP,
        severity: 'info',
        summary: 'Synchronized',
      }),
    )
  })

  it('supports detail and an explicit lifetime', () => {
    const toast = useAppToast()

    toast.error('Failed', { detail: 'Try again', life: 3500 })

    expect(dependencies.add).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'error',
        summary: 'Failed',
        detail: 'Try again',
        life: 3500,
      }),
    )
  })

  it('keeps errors visible longer by default', () => {
    const toast = useAppToast()

    toast.error('Failed')

    expect(dependencies.add).toHaveBeenCalledWith(
      expect.objectContaining({
        severity: 'error',
        life: APP_TOAST_ERROR_LIFE_MS,
      }),
    )
  })
})
