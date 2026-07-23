import { describe, expect, it } from 'vitest'
import { socket } from './socket'

describe('socket transport', () => {
  it('can be initialized without browser globals', () => {
    expect(socket.connected).toBe(false)
  })
})
