<script lang="ts" setup>
import { computed, ref } from 'vue'
import { Button, Menu } from 'primevue'
import { useMutation } from '@pinia/colada'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import { useI18n } from 'vue-i18n'
import type { Employee } from '@meerkapp/wms-contracts'
import EmployeeAvatar from './EmployeeAvatar.vue'
import { employeeApi } from '@/modules/employee/api/employee.api'
import { useEmployeeStore } from '@/modules/employee/stores/employee.store'
import { useAuthStore } from '@/modules/auth/stores/auth.store'

const props = defineProps<{
  employee: Employee
  isOwnProfile: boolean
}>()

const { t } = useI18n()
const toast = useToast()
const confirm = useConfirm()
const employeeStore = useEmployeeStore()
const authStore = useAuthStore()

const menu = ref()
const fileInputRef = ref<HTMLInputElement | null>(null)
const localAvatarUrl = ref<string | null>(props.employee.avatarUrl ?? null)

const { mutate: uploadAvatar, asyncStatus: uploadStatus } = useMutation({
  mutation: (file: File) =>
    props.isOwnProfile
      ? employeeApi.uploadOwnAvatar(file)
      : employeeApi.uploadAvatar(props.employee.id, file),
  onSuccess: async (updated) => {
    localAvatarUrl.value = updated.avatarUrl
    employeeStore.updateAvatarInList(props.employee.id, updated.avatarUrl)
    if (props.isOwnProfile) await authStore.refresh()
    toast.add({ severity: 'success', summary: t('employee.form.avatarUploaded'), life: 3000 })
  },
  onError: () => toast.add({ severity: 'error', summary: t('common.error.network'), life: 3000 }),
})

const { mutate: deleteAvatar, asyncStatus: deleteStatus } = useMutation({
  mutation: () =>
    props.isOwnProfile
      ? employeeApi.deleteOwnAvatar()
      : employeeApi.deleteAvatar(props.employee.id),
  onSuccess: async () => {
    localAvatarUrl.value = null
    employeeStore.updateAvatarInList(props.employee.id, null)
    if (props.isOwnProfile) await authStore.refresh()
    toast.add({ severity: 'success', summary: t('employee.form.avatarDeleted'), life: 3000 })
  },
  onError: () => toast.add({ severity: 'error', summary: t('common.error.network'), life: 3000 }),
})

function onFileSelected(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (file) uploadAvatar(file)
}

function confirmDeleteAvatar() {
  confirm.require({
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
