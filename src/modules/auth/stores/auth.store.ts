import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { jwtDecode } from 'jwt-decode'
import { FetchError } from 'ofetch'
import type { Permission } from '@meerkapp/wms-contracts'
import { ClientUpdateRequiredError } from '@/core/api/client-update-required.error'
import { authApi } from '@/modules/auth/api/auth.api'
import {
  accountSessionChannel,
  type AccountSessionMessage,
} from '@/modules/auth/services/account-session-channel'
import type { DeviceAccountSummary, JwtPayload } from '@/modules/auth/types/auth.types'
import { usePresenceStore } from '@/modules/employee/stores/presence.store'
import {
  localStateRepository,
  OFFLINE_ACCESS_GRACE_PERIOD_MS,
} from '@/modules/sync/repositories/local-state.repository'
import { localSyncService } from '@/modules/sync/services/sync.service'
import type {
  ActiveAccountSelection,
  ActiveAccountUpdate,
  LocalAccountProfile,
} from '@/modules/sync/types/local-state.types'

export type AuthSessionMode = 'anonymous' | 'online' | 'offline-readonly'
export type CrossTabAccountTransition =
  | 'ignored'
  | 'activated-online'
  | 'activated-offline'
  | 'deactivated'

interface SessionCommitOptions {
  announce?: boolean
  expectedSelection?: ActiveAccountSelection
}

function decodeAccessToken(access: string): JwtPayload | null {
  try {
    return jwtDecode<JwtPayload>(access)
  } catch {
    return null
  }
}

function toLocalAccountProfile(account: JwtPayload): LocalAccountProfile {
  return {
    accountId: account.sub,
    email: account.email,
    firstName: account.firstName,
    lastName: account.lastName,
    warehouseId: account.warehouseId,
    isActive: account.isActive,
    permissions: account.permissions,
    lastSeen: account.lastSeen,
    avatarUrl: account.avatarUrl,
    lastAuthenticatedAt: Date.now(),
  }
}

function toJwtPayload(account: LocalAccountProfile): JwtPayload {
  return {
    sub: account.accountId,
    email: account.email,
    firstName: account.firstName,
    lastName: account.lastName,
    warehouseId: account.warehouseId,
    isActive: account.isActive,
    permissions: account.permissions,
    lastSeen: account.lastSeen,
    avatarUrl: account.avatarUrl,
  }
}

function isUnauthorized(error: unknown) {
  return error instanceof FetchError && error.status === 401
}

function isNetworkFailure(error: unknown) {
  if (error instanceof ClientUpdateRequiredError) return true
  if (error instanceof TypeError) return true
  return error instanceof FetchError && (error.status === undefined || error.status === 0)
}

function isRetryableRemoteFailure(error: unknown) {
  return (
    isNetworkFailure(error) ||
    (error instanceof FetchError && error.status !== undefined && error.status >= 500)
  )
}

function isSameSelection(left: ActiveAccountSelection, right: ActiveAccountSelection): boolean {
  return left.accountId === right.accountId && left.revision === right.revision
}

export const useAuthStore = defineStore('auth', () => {
  // Access tokens stay in memory. The server keeps long-lived account
  // memberships behind one opaque httpOnly device-session cookie.
  const accessToken = ref<string | null>(null)
  const offlineUser = ref<JwtPayload | null>(null)
  const deviceAccounts = ref<DeviceAccountSummary[]>([])
  const isCrossTabTransitioning = ref(false)
  let sessionEpoch = 0
  let crossTabTransitionGeneration = 0
  let crossTabTargetSelection: ActiveAccountSelection | null = null
  let refreshFlight: { accountId: string; promise: Promise<boolean> } | null = null
  let offlineExpiryTimer: ReturnType<typeof setTimeout> | null = null

  const onlineUser = computed<JwtPayload | null>(() =>
    accessToken.value ? decodeAccessToken(accessToken.value) : null,
  )
  const user = computed<JwtPayload | null>(() => onlineUser.value ?? offlineUser.value)
  const isAuthenticated = computed(() => !!accessToken.value && !!onlineUser.value)
  const isOffline = computed(() => offlineUser.value !== null && !isAuthenticated.value)
  const canAccessWorkspace = computed(() => isAuthenticated.value || isOffline.value)
  const sessionMode = computed<AuthSessionMode>(() => {
    if (isAuthenticated.value) return 'online'
    if (isOffline.value) return 'offline-readonly'
    return 'anonymous'
  })

  function setTokens(access: string) {
    accessToken.value = access
  }

  function clearOfflineExpiryTimer() {
    if (offlineExpiryTimer !== null) clearTimeout(offlineExpiryTimer)
    offlineExpiryTimer = null
  }

  function scheduleOfflineExpiry(lastAuthenticatedAt: number) {
    clearOfflineExpiryTimer()
    const remaining = lastAuthenticatedAt + OFFLINE_ACCESS_GRACE_PERIOD_MS - Date.now()
    if (remaining <= 0) {
      deactivateSession()
      return
    }
    offlineExpiryTimer = setTimeout(deactivateSession, remaining)
  }

  function stopRealtimeSession() {
    localSyncService.stop()
    usePresenceStore().teardown()
  }

  function announceActiveAccount(update: ActiveAccountUpdate) {
    if (!update.changed) return
    accountSessionChannel.publish({
      type: 'active-account-changed',
      selection: update.selection,
    })
  }

  async function commitOnlineSession(
    access: string,
    epoch: number,
    options: SessionCommitOptions = {},
  ): Promise<boolean> {
    const account = decodeAccessToken(access)
    if (!account) throw new Error('Cannot activate a session with an invalid access token')
    if (epoch !== sessionEpoch) return false

    const activeAccountUpdate = await localStateRepository.saveAuthenticatedAccount(
      toLocalAccountProfile(account),
      { activate: options.expectedSelection === undefined },
    )
    if (epoch !== sessionEpoch) return false
    if (
      options.expectedSelection !== undefined &&
      !isSameSelection(activeAccountUpdate.selection, options.expectedSelection)
    ) {
      return false
    }

    const previousAccountId = user.value?.sub ?? null
    if (previousAccountId !== null && previousAccountId !== account.sub) stopRealtimeSession()

    setTokens(access)
    offlineUser.value = null
    clearOfflineExpiryTimer()
    localSyncService.start(access, {
      accountId: account.sub,
      homeWarehouseId: account.warehouseId,
    })
    usePresenceStore().setup()
    if (options.announce !== false) announceActiveAccount(activeAccountUpdate)
    return true
  }

  async function activateSession(access: string) {
    const epoch = ++sessionEpoch
    return commitOnlineSession(access, epoch)
  }

  async function commitOfflineSession(
    accountId: string,
    epoch: number,
    options: SessionCommitOptions = {},
  ): Promise<boolean> {
    const account = await localStateRepository.getOfflineAccount(accountId)
    if (!account || epoch !== sessionEpoch) return false

    const activeAccountUpdate =
      options.expectedSelection === undefined
        ? await localStateRepository.setActiveAccountId(account.accountId)
        : {
            selection: await localStateRepository.getActiveAccountSelection(),
            changed: false,
          }
    if (epoch !== sessionEpoch) return false
    if (
      options.expectedSelection !== undefined &&
      !isSameSelection(activeAccountUpdate.selection, options.expectedSelection)
    ) {
      return false
    }

    stopRealtimeSession()
    offlineUser.value = toJwtPayload(account)
    accessToken.value = null
    scheduleOfflineExpiry(account.lastAuthenticatedAt)
    await localSyncService.activateOfflineAccount({
      accountId: account.accountId,
      homeWarehouseId: account.warehouseId,
    })
    if (options.announce !== false) announceActiveAccount(activeAccountUpdate)
    return epoch === sessionEpoch
  }

  async function activateOfflineSession(accountId = user.value?.sub ?? null): Promise<boolean> {
    if (accountId === null) return false
    const selection = await localStateRepository.getActiveAccountSelection()
    if (selection.accountId !== accountId) return false
    const epoch = ++sessionEpoch
    return commitOfflineSession(accountId, epoch, {
      announce: false,
      expectedSelection: selection,
    })
  }

  function deactivateSession() {
    sessionEpoch += 1
    clearOfflineExpiryTimer()
    stopRealtimeSession()
    accessToken.value = null
    offlineUser.value = null
  }

  async function removeLocalAccount(accountId: string | null, announce = true) {
    const removesActiveAccount = accountId !== null && user.value?.sub === accountId
    if (removesActiveAccount) deactivateSession()
    if (accountId !== null) {
      const activeAccountUpdate = await localStateRepository.removeAccount(accountId)
      await localSyncService.removeAccount(accountId)
      deviceAccounts.value = deviceAccounts.value.filter(
        (account) => account.accountId !== accountId,
      )
      if (announce) {
        announceActiveAccount(activeAccountUpdate)
        accountSessionChannel.publish({ type: 'account-removed', accountId })
      }
    }
  }

  async function loadDeviceAccounts(): Promise<DeviceAccountSummary[]> {
    const pendingRemovals = await localStateRepository.listPendingAccountRemovals()
    await Promise.all(
      pendingRemovals.map(async ({ accountId }) => {
        if (await requestAccountRemoval(accountId)) {
          await localStateRepository.clearPendingAccountRemoval(accountId)
        }
      }),
    )

    try {
      const response = await authApi.accounts()
      const pendingIds = new Set(
        (await localStateRepository.listPendingAccountRemovals()).map(({ accountId }) => accountId),
      )
      deviceAccounts.value = response.accounts.filter(
        (account) => !pendingIds.has(account.accountId),
      )
    } catch (error) {
      // Startup and offline account selection can continue from local profiles.
      if (!isNetworkFailure(error)) console.error('[auth:device-accounts]', error)
    }
    return deviceAccounts.value
  }

  async function listAvailableAccountIds(): Promise<string[]> {
    const [localAccounts, onlineAccounts] = await Promise.all([
      localStateRepository.listAccountProfiles(),
      loadDeviceAccounts(),
    ])
    return [
      ...new Set([
        ...localAccounts.map((account) => account.accountId),
        ...onlineAccounts.map((account) => account.accountId),
      ]),
    ]
  }

  async function switchAccountInternal(
    accountId: string,
    options: SessionCommitOptions = {},
  ): Promise<boolean> {
    if (user.value?.sub === accountId && canAccessWorkspace.value) return true

    const epoch = ++sessionEpoch
    let tokens: { access_token: string }
    try {
      tokens = await authApi.activateAccount(accountId)
    } catch (error) {
      if (epoch !== sessionEpoch) return false
      if (isNetworkFailure(error)) return commitOfflineSession(accountId, epoch, options)
      if (isUnauthorized(error)) await removeLocalAccount(accountId)
      return false
    }
    return commitOnlineSession(tokens.access_token, epoch, options)
  }

  function switchAccount(accountId: string): Promise<boolean> {
    return switchAccountInternal(accountId)
  }

  function refresh(accountId = user.value?.sub ?? null): Promise<boolean> {
    if (accountId === null) {
      return localStateRepository
        .getActiveAccountSelection()
        .then((selection) =>
          selection.accountId === null
            ? false
            : refreshSelectedAccount(selection.accountId, selection),
        )
    }
    return localStateRepository
      .getActiveAccountSelection()
      .then((selection) =>
        selection.accountId === accountId ? refreshSelectedAccount(accountId, selection) : false,
      )
  }

  function refreshSelectedAccount(
    accountId: string,
    selection: ActiveAccountSelection,
  ): Promise<boolean> {
    if (refreshFlight?.accountId === accountId) return refreshFlight.promise

    const epoch = sessionEpoch
    const promise = (async () => {
      let tokens: { access_token: string }
      try {
        tokens = await authApi.refresh(accountId)
      } catch (error) {
        if (epoch !== sessionEpoch) return false
        if (isNetworkFailure(error)) {
          await commitOfflineSession(accountId, epoch, {
            announce: false,
            expectedSelection: selection,
          })
          return false
        }
        if (isUnauthorized(error)) {
          deactivateSession()
          await removeLocalAccount(accountId)
        }
        return false
      }
      return commitOnlineSession(tokens.access_token, epoch, {
        announce: false,
        expectedSelection: selection,
      })
    })().finally(() => {
      if (refreshFlight?.promise === promise) refreshFlight = null
    })

    refreshFlight = { accountId, promise }
    return promise
  }

  async function applyActiveAccountSelection(
    selection: ActiveAccountSelection,
  ): Promise<CrossTabAccountTransition> {
    if (selection.accountId === null) {
      const shouldNavigate = canAccessWorkspace.value || isCrossTabTransitioning.value
      crossTabTransitionGeneration += 1
      crossTabTargetSelection = null
      isCrossTabTransitioning.value = false
      deactivateSession()
      return shouldNavigate ? 'deactivated' : 'ignored'
    }

    if (selection.accountId === user.value?.sub && canAccessWorkspace.value) {
      return 'ignored'
    }
    if (
      isCrossTabTransitioning.value &&
      crossTabTargetSelection !== null &&
      isSameSelection(crossTabTargetSelection, selection)
    ) {
      return 'ignored'
    }

    const transitionGeneration = ++crossTabTransitionGeneration
    crossTabTargetSelection = selection
    isCrossTabTransitioning.value = true
    deactivateSession()
    try {
      const activated = await switchAccountInternal(selection.accountId, {
        announce: false,
        expectedSelection: selection,
      })
      if (transitionGeneration !== crossTabTransitionGeneration) return 'ignored'
      if (!activated) return canAccessWorkspace.value ? 'ignored' : 'deactivated'
      return isOffline.value ? 'activated-offline' : 'activated-online'
    } finally {
      if (transitionGeneration === crossTabTransitionGeneration) {
        crossTabTargetSelection = null
        isCrossTabTransitioning.value = false
      }
    }
  }

  async function applyAccountSessionMessage(
    message: AccountSessionMessage,
  ): Promise<CrossTabAccountTransition> {
    if (message.type === 'account-removed') {
      deviceAccounts.value = deviceAccounts.value.filter(
        (account) => account.accountId !== message.accountId,
      )
      if (message.accountId !== user.value?.sub) return 'ignored'
    }

    const selection = await localStateRepository.getActiveAccountSelection()
    if (
      message.type === 'active-account-changed' &&
      !isSameSelection(message.selection, selection)
    ) {
      return 'ignored'
    }
    return applyActiveAccountSelection(selection)
  }

  async function reconcileActiveAccount(): Promise<CrossTabAccountTransition> {
    return applyActiveAccountSelection(await localStateRepository.getActiveAccountSelection())
  }

  async function requestAccountRemoval(accountId: string): Promise<boolean> {
    try {
      await authApi.removeAccount(accountId)
      return true
    } catch (error) {
      if (isUnauthorized(error)) return true
      if (isRetryableRemoteFailure(error)) return false
      throw error
    }
  }

  async function removeAccount(accountId: string) {
    if (await requestAccountRemoval(accountId)) {
      await localStateRepository.clearPendingAccountRemoval(accountId)
    } else {
      await localStateRepository.markAccountRemovalPending(accountId)
    }
    await removeLocalAccount(accountId)
  }

  async function logout() {
    const accountId = user.value?.sub ?? null
    if (accountId === null) {
      deactivateSession()
      return
    }
    await removeAccount(accountId)
  }

  function checkUserPermissions(...requiredPermissions: Permission[]): boolean {
    if (!user.value || isOffline.value) return false
    return requiredPermissions.some((permission) => user.value?.permissions?.includes(permission))
  }

  return {
    accessToken,
    user,
    deviceAccounts,
    isAuthenticated,
    isOffline,
    canAccessWorkspace,
    sessionMode,
    isCrossTabTransitioning,
    setTokens,
    activateSession,
    activateOfflineSession,
    deactivateSession,
    removeLocalAccount,
    loadDeviceAccounts,
    listAvailableAccountIds,
    switchAccount,
    refresh,
    applyAccountSessionMessage,
    reconcileActiveAccount,
    removeAccount,
    logout,
    checkUserPermissions,
  }
})
