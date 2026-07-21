import type { ActiveAccountSelection } from '@/modules/sync/types/local-state.types'

const CHANNEL_NAME = 'meerk-wms-account-session'

export type AccountSessionMessage =
  | {
      type: 'active-account-changed'
      selection: ActiveAccountSelection
    }
  | {
      type: 'account-removed'
      accountId: string
    }

type AccountSessionListener = (message: AccountSessionMessage) => void

function isAccountSessionMessage(value: unknown): value is AccountSessionMessage {
  if (typeof value !== 'object' || value === null || !('type' in value)) return false

  if (value.type === 'account-removed') {
    return 'accountId' in value && typeof value.accountId === 'string'
  }

  if (value.type !== 'active-account-changed' || !('selection' in value)) return false
  const selection = value.selection
  return (
    typeof selection === 'object' &&
    selection !== null &&
    'accountId' in selection &&
    (selection.accountId === null || typeof selection.accountId === 'string') &&
    'revision' in selection &&
    typeof selection.revision === 'number' &&
    Number.isSafeInteger(selection.revision) &&
    selection.revision >= 0
  )
}

class AccountSessionChannel {
  private channel: BroadcastChannel | null = null
  private readonly listeners = new Set<AccountSessionListener>()

  publish(message: AccountSessionMessage) {
    this.getChannel()?.postMessage(message)
  }

  subscribe(listener: AccountSessionListener) {
    this.listeners.add(listener)
    this.getChannel()
    return () => {
      this.listeners.delete(listener)
      if (this.listeners.size === 0) {
        this.channel?.close()
        this.channel = null
      }
    }
  }

  private getChannel() {
    if (this.channel !== null || typeof BroadcastChannel === 'undefined') return this.channel

    this.channel = new BroadcastChannel(CHANNEL_NAME)
    this.channel.addEventListener('message', (event: MessageEvent<unknown>) => {
      if (!isAccountSessionMessage(event.data)) return
      for (const listener of this.listeners) listener(event.data)
    })
    return this.channel
  }
}

export const accountSessionChannel = new AccountSessionChannel()
