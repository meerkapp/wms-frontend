import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Employee } from '@meerkapp/wms-contracts'

const dependencies = vi.hoisted(() => ({
  getAll: vi.fn(),
  socketOn: vi.fn(),
  socketOff: vi.fn(),
}))

vi.mock('@/modules/employee/api/employee.api', () => ({
  employeeApi: { getAll: dependencies.getAll },
}))

vi.mock('@/core/api/socket', () => ({
  socket: {
    on: dependencies.socketOn,
    off: dependencies.socketOff,
  },
}))

import { useEmployeeStore } from './employee.store'

function employee(id: string, firstName = id): Employee {
  return { id, firstName } as Employee
}

function page(items: Employee[], pageNumber: number, total = items.length) {
  return {
    items,
    total,
    page: pageNumber,
    limit: 20,
    pages: Math.ceil(total / 20),
  }
}

beforeEach(() => {
  setActivePinia(createPinia())
  for (const dependency of Object.values(dependencies)) dependency.mockReset()
})

describe('employee store', () => {
  it('replaces page one after reconnect instead of duplicating employees', async () => {
    dependencies.getAll
      .mockResolvedValueOnce(page([employee('a'), employee('b')], 1, 2))
      .mockResolvedValueOnce(page([employee('a'), employee('b')], 1, 2))
    const store = useEmployeeStore()

    await store.reload()
    await store.reload()

    expect(store.employees.map(({ id }) => id)).toEqual(['a', 'b'])
    expect(store.total).toBe(2)
  })

  it('merges later pages by id and refreshes an overlapping employee', async () => {
    dependencies.getAll
      .mockResolvedValueOnce(page([employee('a'), employee('b', 'Before')], 1, 3))
      .mockResolvedValueOnce(page([employee('b', 'After'), employee('c')], 2, 3))
    const store = useEmployeeStore()

    await store.reload()
    await store.loadNextPage()

    expect(store.employees.map(({ id }) => id)).toEqual(['a', 'b', 'c'])
    expect(store.employees.find(({ id }) => id === 'b')?.firstName).toBe('After')
  })

  it('registers realtime handlers only once', () => {
    const store = useEmployeeStore()

    store.setup()
    store.setup()

    expect(dependencies.socketOn).toHaveBeenCalledTimes(1)
    store.teardown()

    store.setup()
    expect(dependencies.socketOn).toHaveBeenCalledTimes(2)
    store.teardown()
  })

  it('ignores an older page response when reload supersedes it', async () => {
    let resolveSecondPage!: (result: ReturnType<typeof page>) => void
    const secondPage = new Promise<ReturnType<typeof page>>((resolve) => {
      resolveSecondPage = resolve
    })
    dependencies.getAll
      .mockResolvedValueOnce(page([employee('a'), employee('b')], 1, 3))
      .mockReturnValueOnce(secondPage)
      .mockResolvedValueOnce(page([employee('a', 'Fresh'), employee('d')], 1, 2))
    const store = useEmployeeStore()

    await store.reload()
    const olderRequest = store.loadNextPage()
    await vi.waitFor(() => expect(dependencies.getAll).toHaveBeenCalledTimes(2))
    await store.reload()
    resolveSecondPage(page([employee('b'), employee('c')], 2, 3))
    await olderRequest

    expect(store.employees.map(({ id }) => id)).toEqual(['a', 'd'])
    expect(store.employees[0]?.firstName).toBe('Fresh')
    expect(store.total).toBe(2)
    expect(store.isLoading).toBe(false)
  })

  it('invalidates a pending request and clears server-only data on teardown', async () => {
    let resolvePage!: (result: ReturnType<typeof page>) => void
    dependencies.getAll.mockReturnValueOnce(
      new Promise<ReturnType<typeof page>>((resolve) => {
        resolvePage = resolve
      }),
    )
    const store = useEmployeeStore()
    store.setup()

    const pendingRequest = store.reload()
    store.teardown()
    resolvePage(page([employee('a')], 1, 1))
    await pendingRequest

    expect(store.employees).toEqual([])
    expect(store.total).toBe(0)
    expect(store.isLoading).toBe(false)
  })
})
