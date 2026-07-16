import type { LocalEntity } from '../types/entities.types'
import type {
  DeletedId,
  NormalizedSyncBatch,
  SyncChangePayload,
  SyncCursor,
  SyncPullResponse,
} from '../types/sync.types'

type Warn = (message: string, details?: unknown) => void

const defaultWarn: Warn = (message, details) => console.warn(message, details)

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isEntityId(value: unknown): value is DeletedId {
  return typeof value === 'number' || typeof value === 'string'
}

function normalizeEntities<T extends LocalEntity>(value: unknown, warn: Warn): T[] {
  if (!Array.isArray(value)) return []

  const byId = new Map<DeletedId, T>()
  for (const candidate of value) {
    if (!isObjectRecord(candidate) || !isEntityId(candidate.id)) {
      warn('[sync] Ignoring an entity without a valid id', candidate)
      continue
    }

    // A change containing only { id } is not a valid upsert. Deletes are
    // represented separately and are always applied through bulkDelete(id).
    if (Object.keys(candidate).every((key) => key === 'id')) {
      warn('[sync] Ignoring an incomplete upsert payload', candidate)
      continue
    }

    const next = candidate as T
    const previous = byId.get(candidate.id)
    if (!previous || !isOlderEntity(next, previous)) byId.set(candidate.id, next)
  }

  return [...byId.values()]
}

function normalizeDeletedIds(value: unknown): DeletedId[] {
  if (!Array.isArray(value)) return []

  const ids = new Set<DeletedId>()
  for (const candidate of value) {
    if (isEntityId(candidate)) ids.add(candidate)
    else if (isObjectRecord(candidate) && isEntityId(candidate.id)) ids.add(candidate.id)
  }
  return [...ids]
}

function normalizeCursor(value: unknown, fallback: SyncCursor, warn: Warn): SyncCursor {
  if (value === null || typeof value === 'string' || typeof value === 'number') return value
  if (value !== undefined) warn('[sync] Ignoring an invalid cursor', value)
  return fallback
}

export function normalizePullResponse<T extends LocalEntity>(
  response: SyncPullResponse<T>,
  fallbackCursor: SyncCursor,
  warn: Warn = defaultWarn,
): NormalizedSyncBatch<T> {
  if (Array.isArray(response)) {
    const upserted = normalizeEntities<T>(response, warn)
    return {
      upserted,
      deletedIds: [],
      cursor: fallbackCursor,
      hasMore: false,
    }
  }

  const upserted = normalizeEntities<T>(response.upserted ?? response.items ?? [], warn)
  const rawCursor =
    'nextCursor' in response
      ? response.nextCursor
      : 'cursor' in response
        ? response.cursor
        : 'revision' in response
          ? response.revision
          : fallbackCursor

  return {
    upserted,
    deletedIds: normalizeDeletedIds(response.deletedIds ?? response.deleted),
    cursor: normalizeCursor(rawCursor, fallbackCursor, warn),
    hasMore: response.hasMore === true,
  }
}

export function normalizeSocketPayload<T extends LocalEntity>(
  payload: unknown,
  fallbackCursor: SyncCursor,
  warn: Warn = defaultWarn,
): NormalizedSyncBatch<T> {
  if (Array.isArray(payload)) {
    const upserted: unknown[] = []
    const deletedIds: DeletedId[] = []

    for (const change of payload) {
      if (!isObjectRecord(change)) continue
      const type = change.type
      if (type === 'remove' || type === 'delete' || type === 'deleted') {
        if (isEntityId(change.id)) deletedIds.push(change.id)
      } else if (isObjectRecord(change.item)) {
        upserted.push(change.item)
      } else if (isObjectRecord(change.data)) {
        upserted.push(change.data)
      } else {
        upserted.push(change)
      }
    }

    const normalized = normalizeEntities<T>(upserted, warn)
    return {
      upserted: normalized,
      deletedIds: normalizeDeletedIds(deletedIds),
      cursor: fallbackCursor,
      hasMore: false,
    }
  }

  if (!isObjectRecord(payload)) {
    return { upserted: [], deletedIds: [], cursor: fallbackCursor, hasMore: false }
  }

  if ('changes' in payload) return normalizeSocketPayload(payload.changes, fallbackCursor, warn)

  const change = payload as SyncChangePayload<unknown>
  const hasSeparateChanges = 'added' in change || 'modified' in change
  const rawUpserted = hasSeparateChanges
    ? [
        ...(Array.isArray(change.added) ? change.added : []),
        ...(Array.isArray(change.modified) ? change.modified : []),
      ]
    : (change.upserted ?? [])
  const upserted = normalizeEntities<T>(rawUpserted, warn)
  const deletedIds = normalizeDeletedIds(change.removed ?? change.deletedIds ?? change.deleted)
  return {
    upserted,
    deletedIds,
    cursor: normalizeCursor(
      'cursor' in change ? change.cursor : fallbackCursor,
      fallbackCursor,
      warn,
    ),
    hasMore: false,
  }
}

export function hasSyncCursorChanged(current: SyncCursor, next: SyncCursor): boolean {
  return current !== next
}

export function isOlderEntity(incoming: LocalEntity, existing: LocalEntity): boolean {
  const incomingValue = 'updatedAt' in incoming ? incoming.updatedAt : undefined
  const existingValue = 'updatedAt' in existing ? existing.updatedAt : undefined
  if (typeof incomingValue !== 'string' || typeof existingValue !== 'string') return false

  const incomingTime = Date.parse(incomingValue)
  const existingTime = Date.parse(existingValue)
  if (Number.isFinite(incomingTime) && Number.isFinite(existingTime)) {
    return incomingTime < existingTime
  }

  return incomingValue < existingValue
}
