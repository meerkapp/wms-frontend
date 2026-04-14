<script setup lang="ts">
import { computed, ref, nextTick, onMounted, onUnmounted } from 'vue'
import { Button, Skeleton } from 'primevue'
import { useAppDialog } from '@/core/composables/useAppDialog'
import { useI18n } from 'vue-i18n'
import BaseCard from '@/core/components/BaseCard.vue'
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
  store.loadPage(1)
})
onUnmounted(() => store.teardown())

const title = computed(() =>
  store.total ? `${t('employee.manager.title')} (${store.total})` : t('employee.manager.title'),
)

function onScroll(e: Event) {
  if (!store.hasMore || store.isLoading) return
  const el = e.target as HTMLElement
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) {
    store.loadNextPage()
  }
}

async function onCreateSuccess(email: string, password: string) {
  store.reset()
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
      onClose: () => store.reset(),
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
        @click="openRoleManager"
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
      <div
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
