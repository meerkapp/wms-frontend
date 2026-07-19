import { describe, expect, it } from 'vitest'
import { resolveOnlineRequiredReason } from './sidebar-availability'

describe('sidebar availability', () => {
  it.each(['checking', 'server-unavailable', 'offline'] as const)(
    'keeps local read-model sections available while connectivity is %s',
    (status) => {
      expect(resolveOnlineRequiredReason('local-read-model', status, true)).toBeNull()
    },
  )

  it('blocks server-required sections with the actual connectivity reason', () => {
    expect(resolveOnlineRequiredReason('server-required', 'offline', true)).toBe('offline')
    expect(resolveOnlineRequiredReason('server-required', 'server-unavailable', true)).toBe(
      'server-unavailable',
    )
    expect(resolveOnlineRequiredReason('server-required', 'checking', false)).toBe('checking')
  })

  it('waits for an offline session to refresh before opening server-required content', () => {
    expect(resolveOnlineRequiredReason('server-required', 'online', true)).toBe('checking')
    expect(resolveOnlineRequiredReason('server-required', 'online', false)).toBeNull()
  })
})
