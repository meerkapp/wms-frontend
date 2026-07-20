import type {
  ConnectionUnavailableReason,
  ConnectivityStatus,
} from '@/core/stores/connectivity.store'
import type { SidebarAvailability } from './types/sidebar.types'

export function resolveOnlineRequiredReason(
  availability: SidebarAvailability,
  connectivityStatus: ConnectivityStatus,
  isOfflineSession: boolean,
): ConnectionUnavailableReason | null {
  if (availability === 'local-read-model') return null
  if (connectivityStatus === 'offline') return 'offline'
  if (connectivityStatus === 'server-unavailable') return 'server-unavailable'
  if (connectivityStatus === 'update-required') return 'update-required'
  if (connectivityStatus === 'checking' || isOfflineSession) return 'checking'
  return null
}
