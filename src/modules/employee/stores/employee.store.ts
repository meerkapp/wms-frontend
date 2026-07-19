import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { socket } from '@/core/api/socket'
import { employeeApi } from '../api/employee.api'
import type { Employee } from '@meerkapp/wms-contracts'

const LIMIT = 20

export const useEmployeeStore = defineStore('employee', () => {
  const employees = ref<Employee[]>([])
  const total = ref(0)
  const page = ref(1)
  const isLoading = ref(false)
  const isError = ref(false)
  const tick = ref(0)

  let tickInterval: ReturnType<typeof setInterval> | null = null
  let isSetup = false
  let requestGeneration = 0

  const hasMore = computed(() => employees.value.length < total.value)

  function onEmployeeStatus({ employeeId, lastSeen }: { employeeId: string; lastSeen?: string }) {
    if (!lastSeen) return
    const emp = employees.value.find((e) => e.id === employeeId)
    if (emp) emp.lastSeen = lastSeen
  }

  function setup() {
    if (isSetup) return
    isSetup = true
    tickInterval = setInterval(() => tick.value++, 60_000)
    socket.on('employee:status', onEmployeeStatus)
  }

  function teardown() {
    requestGeneration += 1
    isSetup = false
    if (tickInterval) {
      clearInterval(tickInterval)
      tickInterval = null
    }
    socket.off('employee:status', onEmployeeStatus)
    employees.value = []
    total.value = 0
    page.value = 1
    isLoading.value = false
    isError.value = false
  }

  async function reload() {
    const generation = ++requestGeneration
    isLoading.value = true
    isError.value = false
    try {
      const result = await employeeApi.getAll(1, LIMIT)
      if (generation !== requestGeneration) return

      total.value = result.total
      employees.value = mergeEmployees([], result.items)
      page.value = result.page
    } catch {
      if (generation === requestGeneration) isError.value = true
    } finally {
      if (generation === requestGeneration) isLoading.value = false
    }
  }

  function mergeEmployees(current: Employee[], incoming: Employee[]): Employee[] {
    const merged = [...current]
    const indexById = new Map(merged.map((employee, index) => [employee.id, index]))

    for (const employee of incoming) {
      const index = indexById.get(employee.id)
      if (index === undefined) {
        indexById.set(employee.id, merged.length)
        merged.push(employee)
      } else {
        merged[index] = employee
      }
    }

    return merged
  }

  async function loadNextPage() {
    if (isLoading.value || !hasMore.value) return

    const generation = requestGeneration
    const nextPage = page.value + 1
    isLoading.value = true
    isError.value = false
    try {
      const result = await employeeApi.getAll(nextPage, LIMIT)
      if (generation !== requestGeneration) return

      total.value = result.total
      employees.value = mergeEmployees(employees.value, result.items)
      page.value = result.page
    } catch {
      if (generation === requestGeneration) isError.value = true
    } finally {
      if (generation === requestGeneration) isLoading.value = false
    }
  }

  function updateInList(updated: Employee) {
    const idx = employees.value.findIndex((e) => e.id === updated.id)
    if (idx !== -1) employees.value[idx] = updated
  }

  function updateAvatarInList(id: string, avatarUrl: string | null) {
    const emp = employees.value.find((e) => e.id === id)
    if (emp) emp.avatarUrl = avatarUrl
  }

  return {
    employees,
    total,
    isLoading,
    isError,
    tick,
    hasMore,
    setup,
    teardown,
    reload,
    loadNextPage,
    updateInList,
    updateAvatarInList,
  }
})
