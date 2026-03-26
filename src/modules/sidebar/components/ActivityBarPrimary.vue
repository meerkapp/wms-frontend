<script lang="ts" setup>
import { computed, ref, useTemplateRef } from 'vue'
import { Menu, Avatar } from 'primevue'
import type { MenuItem } from 'primevue/menuitem'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'
import ActivityBarButton from './ActivityBarButton.vue'
// import EmployeeAvatar from '../../../components/EmployeeAvatar.vue'
// import EmployeeProfileDialog from '../../../components/EmployeeProfileDialog.vue'
// import { useAuthStore } from '../../auth/stores/auth'
import { useAuthStore } from '@/modules/auth/stores/auth.store'
import { useSideBarPrimaryStore } from '../stores/sidebar-primary.store'

// const props = defineProps<{ selectedKey: SidebarItem['key'] | null; options: SidebarItem[] }>()
// const emit = defineEmits(['update:selectedKey'])

const router = useRouter()

const sideBarPrimaryStore = useSideBarPrimaryStore()
const { setSelectedSideBarPrimaryItemKey, sideBarPrimaryItems } = sideBarPrimaryStore
const { selectedSideBarPrimaryItemKey } = storeToRefs(sideBarPrimaryStore)

const authStore = useAuthStore()
const { user } = authStore
// const authStore = useAuthStore()
// const { activeUser, activeServerId } = storeToRefs(authStore)

const topPositionOptions = computed(() => sideBarPrimaryItems.filter((p) => p.position === 'top'))
const bottomPositionOptions = computed(() =>
  sideBarPrimaryItems.filter((p) => p.position === 'bottom'),
)

const userMenu = useTemplateRef('userMenu')
const userMenuItems = ref<MenuItem[]>([])

const isEmployeeProfileDialogVisible = ref(false)

// function openUserMenu(event: Event) {
//   if (userMenuItems.value.length === 0) {
//     userMenuItems.value = [
//       {
//         label: activeUser.value?.fullName,
//         items: [
//           {
//             label: 'Мой профиль',
//             icon: 'pi pi-id-card',
//             command: () => {
//               isEmployeeProfileDialogVisible.value = true
//             },
//           },
//           {
//             label: 'Выйти',
//             icon: 'pi pi-users',
//             command: async () => {
//               const serverId = activeServerId.value
//               await authStore.logout()
//               router.push({ name: 'welcome', params: { serverId } })
//             },
//           },
//         ],
//       },
//     ]
//   }
//   userMenu.value?.toggle(event)
// }
</script>

<template>
  <div class="w-16 h-full flex flex-col justify-between items-center">
    <div class="flex flex-col items-center">
      <ActivityBarButton
        v-for="panel in topPositionOptions"
        :key="panel.key"
        :selectedKey="selectedSideBarPrimaryItemKey"
        :panel="panel"
        size="large"
        @update:selectedKey="setSelectedSideBarPrimaryItemKey($event)"
      />
    </div>
    <div class="flex flex-col items-center mb-2">
      <ActivityBarButton
        v-for="panel in bottomPositionOptions"
        :key="panel.key"
        :selectedKey="selectedSideBarPrimaryItemKey"
        :panel="panel"
        size="large"
        @update:selectedKey="setSelectedSideBarPrimaryItemKey($event)"
      />
      <div v-if="user">
        <div class="flex w-14 h-14" v-tooltip="{ value: user?.firstName + ' ' + user?.lastName }">
          <Avatar
            :label="user?.firstName?.charAt(0)"
            size="large"
            shape="circle"
            class="m-auto cursor-pointer"
          />
        </div>
        <Menu ref="userMenu" :model="userMenuItems" popup />
      </div>
    </div>
  </div>
</template>
