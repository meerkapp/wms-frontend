<script setup lang="ts">
import { computed, ref, nextTick, onMounted, onUnmounted } from 'vue'
import { Button, Message, Skeleton } from 'primevue'
import { useAppDialog } from '@/core/composables/useAppDialog'
import { useI18n } from 'vue-i18n'
import BaseCard from '@/core/components/BaseCard.vue'
import AppEmptyState from '@/core/components/AppEmptyState.vue'
import EmployeeCard from '@/modules/employee/components/EmployeeCard.vue'
import EmployeeFormDialog from '@/modules/employee/components/EmployeeFormDialog.vue'
import EmployeeCreatedSuccessDialog from '@/modules/employee/components/EmployeeCreatedSuccessDialog.vue'
import EmployeeRoleManager from '@/modules/employee/components/EmployeeRoleManager.vue'
import { useAuthStore } from '@/modules/auth/stores/auth.store'
import { useEmployeeStore } from '@/modules/employee/stores/employee.store'

const { t } = useI18n()
const dialog = useAppDialog()
const { checkUserPermissions } = useAuthStore()
const store = useEmployeeStore()

const scrollEl = ref<HTMLElement | null>(null)

onMounted(() => {
  store.setup()
  void store.reload()
})
onUnmounted(() => store.teardown())

const title = computed(() =>
  store.total ? `${t('employee.manager.title')} (${store.total})` : t('employee.manager.title'),
)

function onScroll(e: Event) {
  if (!store.hasMore || store.isLoading) return
  const el = e.target as HTMLElement
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) {
    void store.loadNextPage()
  }
}

async function onCreateSuccess(email: string, password: string) {
  void store.reload()
  await nextTick()
  if (scrollEl.value) scrollEl.value.scrollTop = 0
  dialog.open(EmployeeCreatedSuccessDialog, {
    props: {
      header: t('employee.form.titleCreate'),
      modal: true,
      style: { width: '28rem' },
    },
    data: { email, password },
  })
}

function openRoleManager() {
  dialog.open(
    EmployeeRoleManager,
    {
      props: {
        header: t('role.manager.title'),
        modal: true,
        style: { width: '64rem' },
      },
      onClose: () => void store.reload(),
    },
    {
      type: 'extended',
      disableContentBackground: true,
    },
  )
}

function openCreateDialog() {
  dialog.open(
    EmployeeFormDialog,
    {
      props: {
        header: t('employee.form.titleCreate'),
        modal: true,
        style: { width: '54rem' },
      },
      data: { mode: 'create' },
      onClose: (options) => {
        if (options?.data) onCreateSuccess(options.data.email, options.data.password)
      },
    },
    { type: 'extended', disableContentBackground: true },
  )
}

function retryLoad() {
  void store.reload()
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
        v-tooltip.bottom="t('role.manager.title')"
        @click="openRoleManager"
      />
      <Button
        v-if="checkUserPermissions('employee:create')"
        size="small"
        icon="iconify tabler--user-plus"
        severity="secondary"
        rounded
        v-tooltip.bottom="t('employee.form.titleCreate')"
        @click="openCreateDialog"
      />
    </template>
    <template #main>
      <div
        v-if="store.isError && store.employees.length === 0"
        class="h-full flex flex-col items-center justify-center gap-4 px-6 text-center"
      >
        <Message severity="error">{{ t('employee.manager.loadError') }}</Message>
        <Button
          :label="t('common.retry')"
          icon="iconify tabler--refresh"
          severity="secondary"
          size="small"
          rounded
          @click="retryLoad"
        />
      </div>
      <AppEmptyState
        v-else-if="!store.isLoading && store.employees.length === 0"
        icon="tabler--users"
        :message="t('employee.manager.empty')"
      />
      <div
        v-else
        ref="scrollEl"
        class="h-full overflow-y-auto px-3 pb-3 space-y-3"
        @scroll.passive="onScroll"
      >
        <EmployeeCard
          v-for="employee in store.employees"
          :key="employee.id"
          :employee="employee"
          :tick="store.tick"
        />
        <Skeleton v-if="store.isLoading" height="140px" />
      </div>
    </template>
  </BaseCard>
</template>
