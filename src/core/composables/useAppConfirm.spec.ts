import { beforeEach, describe, expect, it, vi } from 'vitest'

const dependencies = vi.hoisted(() => ({ require: vi.fn() }))

vi.mock('primevue/useconfirm', () => ({
  useConfirm: () => ({ require: dependencies.require }),
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

import { APP_CONFIRM_GROUP, useAppConfirm } from './useAppConfirm'

beforeEach(() => dependencies.require.mockReset())

describe('useAppConfirm', () => {
  it('applies the shared group and safe confirmation defaults', () => {
    const confirm = useAppConfirm()

    confirm.open({ header: 'Delete?', message: 'This cannot be undone.' })

    expect(dependencies.require).toHaveBeenCalledWith(
      expect.objectContaining({
        group: APP_CONFIRM_GROUP,
        blockScroll: true,
        defaultFocus: 'reject',
        rejectProps: expect.objectContaining({
          label: 'common.cancel',
          severity: 'secondary',
          variant: 'text',
          rounded: true,
        }),
        acceptProps: expect.objectContaining({ rounded: true }),
      }),
    )
  })

  it('can use the dialog close action instead of a reject button', () => {
    const confirm = useAppConfirm()

    confirm.open({ message: 'Archive?', showReject: false })

    expect(dependencies.require).toHaveBeenCalledWith(
      expect.objectContaining({
        defaultFocus: 'none',
        rejectClass: 'hidden!',
      }),
    )
  })
})
