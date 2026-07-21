import { describe, expect, it } from 'vitest'
import { decideAccountStartup } from './account-startup'

describe('account startup policy', () => {
  it('opens login when no account is available', () => {
    expect(decideAccountStartup([])).toEqual({ type: 'login' })
  })

  it('restores the only available account automatically', () => {
    expect(decideAccountStartup(['account-a'])).toEqual({
      type: 'restore',
      accountId: 'account-a',
    })
  })

  it('requires an explicit choice when multiple accounts are available', () => {
    expect(decideAccountStartup(['account-a', 'account-b'])).toEqual({ type: 'select' })
  })
})
