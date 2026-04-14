<script lang="ts" setup>
import { computed, inject, type Ref } from 'vue'
import { Button } from 'primevue'
import { useAppDialog } from '@/core/composables/useAppDialog'
import { useI18n } from 'vue-i18n'
import type { DynamicDialogInstance } from 'primevue/dynamicdialogoptions'
import type { Employee } from '@meerkapp/wms-contracts'
import { useAuthStore } from '@/modules/auth/stores/auth.store'
import EmployeeAvatarMenuButton from './EmployeeAvatarMenuButton.vue'
import EmployeeChangePasswordDialog from './EmployeeChangePasswordDialog.vue'

const dialogRef = inject<Ref<DynamicDialogInstance>>('dialogRef')

const { t } = useI18n()
const authStore = useAuthStore()
const { checkUserPermissions } = authStore
const dialog = useAppDialog()

const employee = computed<Employee | undefined>(() => dialogRef?.value.data?.employee)

const isOwnProfile = computed(() => employee.value?.id === authStore.user?.sub)

const canEditAvatar = computed(
  () =>
    !!employee.value &&
    (isOwnProfile.value
      ? checkUserPermissions('employee:update:own:avatar')
      : checkUserPermissions('employee:update:avatar')),
)

const canChangePassword = computed(
  () =>
    !!employee.value && isOwnProfile.value && checkUserPermissions('employee:update:own:password'),
)

function openChangePasswordDialog() {
  dialog.open(EmployeeChangePasswordDialog, {
    props: {
      header: t('employee.changePassword.title'),
      modal: true,
      style: { width: '22rem' },
    },
  })
}
</script>

<template>
  <div v-if="canEditAvatar || canChangePassword" class="flex w-full gap-3">
    <EmployeeAvatarMenuButton
      v-if="canEditAvatar && employee"
      :employee="employee"
      :is-own-profile="isOwnProfile"
    />
    <Button
      v-if="canChangePassword"
      type="button"
      :label="t('employee.changePassword.button')"
      icon="iconify tabler--lock"
      variant="outlined"
      rounded
      @click="openChangePasswordDialog"
    />
  </div>
</template>
