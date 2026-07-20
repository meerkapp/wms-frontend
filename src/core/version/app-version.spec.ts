import { describe, expect, it } from 'vitest'
import { appVersion, isServerVersionCompatible } from './app-version'

describe('app version compatibility', () => {
  it('accepts the exact server release version', () => {
    expect(isServerVersionCompatible(appVersion)).toBe(true)
  })

  it('rejects every different server release version', () => {
    expect(isServerVersionCompatible(`${appVersion}-different`)).toBe(false)
  })
})
