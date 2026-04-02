import { defineStore } from 'pinia'
import { ref } from 'vue'
import { socket } from '@/core/api/socket'
import { dayjs } from '@/plugins/dayjs'

interface EmployeeStatusEvent {
  employeeId: string
  status: 'online' | 'offline'
  lastSeen?: string
}

export const usePresenceStore = defineStore('presence', () => {
  const onlineIds = ref<Set<string>>(new Set())

  function setup() {
    socket.on('presence:list', (ids: string[]) => {
      onlineIds.value = new Set(ids)
    })

    socket.on('employee:status', ({ employeeId, status }: EmployeeStatusEvent) => {
      const next = new Set(onlineIds.value)
      if (status === 'online') {
        next.add(employeeId)
      } else {
        next.delete(employeeId)
      }
      onlineIds.value = next
    })
  }

  function teardown() {
    socket.off('presence:list')
    socket.off('employee:status')
    onlineIds.value = new Set()
  }

  function isOnline(employeeId: string): boolean {
    return onlineIds.value.has(employeeId)
  }

  function getPresenceLabel(
    employeeId: string,
    lastSeen: string | null,
    t: (key: string, args?: object) => string,
  ): string {
    if (isOnline(employeeId)) return t('presence.online')
    if (!lastSeen) return ''
    if (dayjs().diff(dayjs(lastSeen), 'second') < 60) return t('presence.justNow')
    return t('presence.lastSeen', { time: dayjs(lastSeen).fromNow() })
  }

  return { onlineIds, setup, teardown, isOnline, getPresenceLabel }
})
