import { defineStore } from 'pinia'
import { ref } from 'vue'
import { i18n } from '@/plugins/i18n'
import { socket } from '@/core/api/socket'
import { dayjs } from '@/plugins/dayjs'

interface EmployeeStatusEvent {
  employeeId: string
  status: 'online' | 'offline'
  lastSeen?: string
}

export const usePresenceStore = defineStore('presence', () => {
  const { t } = i18n.global
  const onlineIds = ref<Set<string>>(new Set())

  function onPresenceList(ids: string[]) {
    onlineIds.value = new Set(ids)
  }

  function onEmployeeStatus({ employeeId, status }: EmployeeStatusEvent) {
    const next = new Set(onlineIds.value)
    if (status === 'online') {
      next.add(employeeId)
    } else {
      next.delete(employeeId)
    }
    onlineIds.value = next
  }

  function setup() {
    socket.on('presence:list', onPresenceList)
    socket.on('employee:status', onEmployeeStatus)
  }

  function teardown() {
    socket.off('presence:list', onPresenceList)
    socket.off('employee:status', onEmployeeStatus)
    onlineIds.value = new Set()
  }

  function isOnline(employeeId: string): boolean {
    return onlineIds.value.has(employeeId)
  }

  function getPresenceLabel(employeeId: string, lastSeen: string | null): string {
    if (isOnline(employeeId)) return t('presence.online')
    if (!lastSeen) return ''
    if (dayjs().diff(dayjs(lastSeen), 'second') < 60) return t('presence.justNow')
    return t('presence.lastSeen', { time: dayjs(lastSeen).fromNow() })
  }

  return { onlineIds, setup, teardown, isOnline, getPresenceLabel }
})
