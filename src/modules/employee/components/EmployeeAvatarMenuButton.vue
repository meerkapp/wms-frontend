<script lang="ts" setup>
import { computed, ref } from 'vue'
import { Button, Menu } from 'primevue'
import { useMutation } from '@pinia/colada'
import { useI18n } from 'vue-i18n'
import type { Employee } from '@meerkapp/wms-contracts'
import EmployeeAvatar from './EmployeeAvatar.vue'
import { employeeApi } from '@/modules/employee/api/employee.api'
import { useEmployeeStore } from '@/modules/employee/stores/employee.store'
import { useAuthStore } from '@/modules/auth/stores/auth.store'
import { useAccountAvatarStore } from '@/modules/auth/stores/account-avatar.store'
import { parseApiError } from '@/core/api/errors'
import { useAppConfirm } from '@/core/composables/useAppConfirm'
import { useAppToast } from '@/core/composables/useAppToast'

const props = defineProps<{
  employee: Employee
  isOwnProfile: boolean
}>()

const { t } = useI18n()
const toast = useAppToast()
const confirm = useAppConfirm()
const employeeStore = useEmployeeStore()
const authStore = useAuthStore()
const accountAvatarStore = useAccountAvatarStore()

const menu = ref()
const fileInputRef = ref<HTMLInputElement | null>(null)
const selectedAvatarFile = ref<File | null>(null)
const localAvatarUrl = ref<string | null>(props.employee.avatarUrl ?? null)

function handleAvatarError(error: unknown) {
  selectedAvatarFile.value = null
  toast.error(
    parseApiError(error)?.status === 403
      ? t('common.error.forbidden')
      : t('common.error.network'),
  )
}

const { mutate: uploadAvatar, asyncStatus: uploadStatus } = useMutation({
  mutation: (file: File) =>
    props.isOwnProfile
      ? employeeApi.uploadOwnAvatar(file)
      : employeeApi.uploadAvatar(props.employee.id, file),
  onSuccess: async (updated) => {
    localAvatarUrl.value = updated.avatarUrl
    employeeStore.updateAvatarInList(props.employee.id, updated.avatarUrl)
    if (props.isOwnProfile) {
      const avatarFile = selectedAvatarFile.value
      if (avatarFile) {
        await accountAvatarStore
          .replaceAvatar(props.employee.id, updated.avatarUrl, avatarFile)
          .catch((error) => console.error('[account-avatar:replace]', error))
      }
      await authStore.refresh()
    }
    selectedAvatarFile.value = null
    toast.success(t('employee.form.avatarUploaded'))
  },
  onError: handleAvatarError,
})

const { mutate: deleteAvatar, asyncStatus: deleteStatus } = useMutation({
  mutation: () =>
    props.isOwnProfile
      ? employeeApi.deleteOwnAvatar()
      : employeeApi.deleteAvatar(props.employee.id),
  onSuccess: async () => {
    localAvatarUrl.value = null
    employeeStore.updateAvatarInList(props.employee.id, null)
    if (props.isOwnProfile) {
      await accountAvatarStore
        .removeAvatar(props.employee.id)
        .catch((error) => console.error('[account-avatar:remove]', error))
      await authStore.refresh()
    }
    toast.success(t('employee.form.avatarDeleted'))
  },
  onError: handleAvatarError,
})

function onFileSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    selectedAvatarFile.value = file
    uploadAvatar(file)
  }
  input.value = ''
}

function confirmDeleteAvatar() {
  confirm.open({
    message: t('employee.form.deleteAvatarConfirm'),
    icon: 'iconify tabler--alert-triangle',
    acceptProps: { severity: 'danger' },
    accept: () => deleteAvatar(),
  })
}

const menuItems = computed(() => [
  {
    label: t('employee.form.uploadAvatar'),
    icon: 'iconify tabler--camera',
    command: () => fileInputRef.value?.click(),
  },
  ...(localAvatarUrl.value
    ? [
        { separator: true },
        {
          label: t('employee.form.deleteAvatar'),
          icon: 'iconify tabler--trash',
          class: '[&_.p-menu-item-label]:text-red-500! [&_.p-menu-item-icon]:text-red-500!',
          command: confirmDeleteAvatar,
        },
      ]
    : []),
])

function toggle(event: Event) {
  menu.value.toggle(event)
}
</script>

<template>
  <Button
    type="button"
    :label="t('employee.form.avatar')"
    :loading="uploadStatus === 'loading' || deleteStatus === 'loading'"
    aria-haspopup="true"
    aria-controls="avatar_menu"
    variant="outlined"
    rounded
    @click="toggle"
  >
    <template #icon>
      <EmployeeAvatar :first-name="employee.firstName" :image="localAvatarUrl" size="small" />
    </template>
  </Button>
  <Menu ref="menu" id="avatar_menu" :model="menuItems" :popup="true" />
  <input ref="fileInputRef" type="file" accept="image/*" class="hidden" @change="onFileSelected" />
</template>
