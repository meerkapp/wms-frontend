<script lang="ts" setup>
import { computed, markRaw, useTemplateRef } from 'vue'
import { Menu } from 'primevue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import type { MenuItem } from 'primevue/menuitem'
import { useAuthStore } from '@/modules/auth/stores/auth.store'
import { useAppDialog } from '@/core/composables/useAppDialog'
import { employeeApi } from '@/modules/employee/api/employee.api'
import EmployeeAvatar from './EmployeeAvatar.vue'
import EmployeeProfileDialog from './EmployeeProfileDialog.vue'
import EmployeeFormDialog from './EmployeeFormDialog.vue'
import EmployeeFormDialogFooter from './EmployeeFormDialogFooter.vue'

const router = useRouter()
const { t } = useI18n()
const dialog = useAppDialog()

const authStore = useAuthStore()
const { user } = storeToRefs(authStore)
const { checkUserPermissions } = authStore

const userMenu = useTemplateRef('userMenu')
const menuAnchor = useTemplateRef<HTMLElement>('menuAnchor')

const canEditOwnProfile = computed(() =>
  checkUserPermissions(
    'employee:update:own:info',
    'employee:update:own:email',
    'employee:update:own:password',
    'employee:update:own:avatar',
  ),
)
const employeeFullName = computed(() => `${user.value?.firstName} ${user.value?.lastName}`)

async function openProfileDialog() {
  if (!user.value) return
  const employee = await employeeApi.getOne(user.value.sub)
  dialog.open(
    EmployeeProfileDialog,
    {
      props: {
        header: t('employee.form.titleView'),
        modal: true,
        style: { width: '54rem' },
      },
      data: { employee },
    },
    { type: 'extended', disableContentBackground: true },
  )
}

async function openEditDialog() {
  if (!user.value) return
  const employee = await employeeApi.getOne(user.value.sub)
  dialog.open(
    EmployeeFormDialog,
    {
      props: {
        header: t('employee.form.titleEdit'),
        modal: true,
        style: { width: '54rem' },
      },
      data: { employee, mode: 'edit' },
      templates: {
        footer: markRaw(EmployeeFormDialogFooter),
      },
    },
    { type: 'extended', disableContentBackground: true },
  )
}

async function logout() {
  await authStore.logout()
  router.push({ name: 'login' })
}

const userMenuItems = computed<MenuItem[]>(() => [
  {
    label: user.value ? `${user.value.firstName} ${user.value.lastName}` : '',
    items: [
      {
        label: t('employee.card.openProfile'),
        icon: 'iconify tabler--id',
        command: openProfileDialog,
      },
      ...(canEditOwnProfile.value
        ? [
            {
              label: t('common.edit'),
              icon: 'iconify tabler--edit',
              command: openEditDialog,
            },
          ]
        : []),
      { separator: true },
      {
        label: t('auth.logout'),
        icon: 'iconify tabler--logout',
        class: '[&_.p-menu-item-label]:text-red-500! [&_.p-menu-item-icon]:text-red-500!',
        command: logout,
      },
    ],
  },
])

function toggleUserMenu() {
  if (menuAnchor.value)
    userMenu.value?.toggle({ currentTarget: menuAnchor.value } as unknown as Event)
}
</script>

<template>
  <div
    v-if="user"
    class="group relative flex w-14 h-14"
    @click="toggleUserMenu"
    v-tooltip="{
      value: employeeFullName,
      pt: { text: '!text-nowrap' },
    }"
  >
    <span ref="menuAnchor" class="absolute bottom-0 right-0 w-0 h-0" />
    <EmployeeAvatar
      :first-name="user.firstName"
      :image="user.avatarUrl"
      size="large"
      shape="square"
      class="m-auto cursor-pointer rounded-xl! overflow-hidden [&_img]:transition-transform [&_img]:duration-200 [&_img]:group-hover:scale-125"
    />
  </div>
  <Menu ref="userMenu" :model="userMenuItems" popup />
</template>
