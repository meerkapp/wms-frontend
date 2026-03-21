import { AsyncDataAdapter, WorkerDataAdapter } from '@signaldb/core'
import { SyncManager } from '@signaldb/sync'
import { apiClient } from '@/core/api/client'
import { socket } from '@/core/api/socket'

const isElectron = () => typeof window !== 'undefined' && 'db' in window

const { createSQLiteIPCAdapter } = isElectron()
  ? await import('@meerkapp/electron-bridge')
  : { createSQLiteIPCAdapter: undefined }

const dataAdapter = isElectron()
  ? new AsyncDataAdapter({
      storage: (name) => createSQLiteIPCAdapter!('activeSQLiteServerDatabasePath', name),
    })
  : new WorkerDataAdapter(
      new Worker(new URL('./indexeddb.worker.ts', import.meta.url), { type: 'module' }),
      {},
    )

const syncManager = new SyncManager({
  id: 'sync-manager',
  dataAdapter,
  onError: (options, error) => {
    console.error(options, error)
  },
  registerRemoteChange({ tableName }, onChange) {
    socket.on(`sync:${tableName}`, (changes) => {
      onChange({ changes })
    })
  },
  async pull({ name, tableName }, { lastFinishedSyncStart }) {
    const since = lastFinishedSyncStart
    const res = await apiClient(`/sync/${tableName}`, { params: { since } })
    return { items: res.items }
  },
  async push({ name }, { changes }) {},
})

export { dataAdapter, syncManager }
