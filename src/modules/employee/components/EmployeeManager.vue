<script setup lang="ts">
import { computed, ref, nextTick, onMounted, onUnmounted } from 'vue'
import { Button, Skeleton } from 'primevue'
import { useDialog } from 'primevue/usedialog'
import { useI18n } from 'vue-i18n'
import BaseCard from '@/core/components/BaseCard.vue'
import EmployeeCard from '@/modules/employee/components/EmployeeCard.vue'
import EmployeeFormDialog from '@/modules/employee/components/EmployeeFormDialog.vue'
import EmployeeCreatedSuccessDialog from '@/modules/employee/components/EmployeeCreatedSuccessDialog.vue'
import { useAuthStore } from '@/modules/auth/stores/auth.store'
import { employeeApi } from '@/modules/employee/api/employee.api'
import { socket } from '@/core/api/socket'
import type { Employee } from '@meerkapp/wms-contracts'

const { t } = useI18n()
const dialog = useDialog()
const authStore = useAuthStore()
const { checkUserPermissions } = authStore

const LIMIT = 20

const employees = ref<Employee[]>([])
const total = ref(0)
const isLoading = ref(false)
const page = ref(1)
const scrollEl = ref<HTMLElement | null>(null)
const tick = ref(0)
let tickInterval: ReturnType<typeof setInterval>

onMounted(() => {
  tickInterval = setInterval(() => tick.value++, 60_000)
  socket.on('employee:status', ({ employeeId, lastSeen }) => {
    if (!lastSeen) return
    const emp = employees.value.find((e) => e.id === employeeId)
    if (emp) emp.lastSeen = lastSeen
  })
})
onUnmounted(() => {
  clearInterval(tickInterval)
  socket.off('employee:status')
})

const hasMore = computed(() => employees.value.length < total.value)

const title = computed(() =>
  total.value ? `${t('employee.manager.title')} (${total.value})` : t('employee.manager.title'),
)

async function loadPage(p: number) {
  if (isLoading.value) return
  isLoading.value = true
  try {
    const result = await employeeApi.getAll(p, LIMIT)
    total.value = result.total
    employees.value.push(...result.items)
    page.value = p
  } finally {
    isLoading.value = false
  }
}

loadPage(1)

function onScroll(e: Event) {
  if (!hasMore.value || isLoading.value) return
  const el = e.target as HTMLElement
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) {
    loadPage(page.value + 1)
  }
}

async function reset() {
  employees.value = []
  total.value = 0
  page.value = 1
  await nextTick()
  if (scrollEl.value) scrollEl.value.scrollTop = 0
  loadPage(1)
}

function openCreateDialog() {
  dialog.open(EmployeeFormDialog, {
    props: {
      header: t('employee.form.titleCreate'),
      modal: true,
      style: { width: '54rem' },
    },
    data: { mode: 'create' },
    onClose: (options) => {
      if (!options?.data) return
      reset()
      dialog.open(EmployeeCreatedSuccessDialog, {
        props: {
          header: t('employee.form.titleCreate'),
          modal: true,
          style: { width: '32rem' },
        },
        data: { email: options.data.email, password: options.data.password },
      })
    },
  })
}
</script>

<template>
  <BaseCard :title="title" class="h-full">
    <template #header>
      <Button
        v-if="checkUserPermissions('role:create')"
        size="small"
        icon="iconify tabler--shield-cog"
        severity="secondary"
        rounded
      />
      <Button
        v-if="checkUserPermissions('employee:create')"
        size="small"
        icon="iconify tabler--user-plus"
        severity="secondary"
        rounded
        @click="openCreateDialog"
      />
    </template>
    <template #main>
      <div ref="scrollEl" class="h-full overflow-y-auto px-3 pb-3 space-y-3" @scroll.passive="onScroll">
        <EmployeeCard
          v-for="employee in employees"
          :key="employee.id"
          :employee="employee"
          :tick="tick"
          @updated="
            (emp) => {
              const idx = employees.findIndex((e) => e.id === emp.id)
              if (idx !== -1) employees[idx] = emp
            }
          "
        />
        <Skeleton v-if="isLoading" height="140px" />
      </div>
    </template>
  </BaseCard>
</template>
