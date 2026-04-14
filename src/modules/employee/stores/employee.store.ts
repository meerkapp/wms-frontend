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

  const hasMore = computed(() => employees.value.length < total.value)

  function onEmployeeStatus({ employeeId, lastSeen }: { employeeId: string; lastSeen?: string }) {
    if (!lastSeen) return
    const emp = employees.value.find((e) => e.id === employeeId)
    if (emp) emp.lastSeen = lastSeen
  }

  function setup() {
    tickInterval = setInterval(() => tick.value++, 60_000)
    socket.on('employee:status', onEmployeeStatus)
  }

  function teardown() {
    if (tickInterval) {
      clearInterval(tickInterval)
      tickInterval = null
    }
    socket.off('employee:status', onEmployeeStatus)
  }

  async function loadPage(p: number) {
    if (isLoading.value) return
    isLoading.value = true
    isError.value = false
    try {
      const result = await employeeApi.getAll(p, LIMIT)
      total.value = result.total
      employees.value.push(...result.items)
      page.value = p
    } catch {
      isError.value = true
    } finally {
      isLoading.value = false
    }
  }

  function loadNextPage() {
    loadPage(page.value + 1)
  }

  function reset() {
    employees.value = []
    total.value = 0
    page.value = 1
    isError.value = false
    loadPage(1)
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
    loadPage,
    loadNextPage,
    reset,
    updateInList,
    updateAvatarInList,
  }
})
