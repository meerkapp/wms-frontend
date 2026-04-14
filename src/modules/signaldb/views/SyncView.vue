<script setup lang="ts">
import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { ProgressBar } from 'primevue'
import { useAuthStore } from '@/modules/auth/stores/auth.store'
import EmployeeAvatar from '@/modules/employee/components/EmployeeAvatar.vue'
import { syncManager } from '../sync/manager'
import { collectionsRegistry } from '../sync/collections'
import { useRouter } from 'vue-router'
import { connectSocket } from '@/core/api/socket'

const authStore = useAuthStore()
const { user, accessToken } = storeToRefs(authStore)

const router = useRouter()

onMounted(async () => {
  if (accessToken.value) connectSocket(accessToken.value)

  for (const { collection, collectionName, tableName } of collectionsRegistry) {
    syncManager.addCollection(collection, { name: collectionName, tableName })
    await syncManager.sync(collectionName)
  }

  router.push({ name: 'workspace' })
})
</script>

<template>
  <div class="h-screen flex flex-col justify-center">
    <div class="text-center">
      <EmployeeAvatar :first-name="user?.firstName" :image="user?.avatarUrl" size="xlarge" class="mr-2" />
      <p class="text-2xl m-5 font-light">
        {{ $t('sync.greeting', { firstName: user?.firstName, lastName: user?.lastName }) }}
      </p>
      <ProgressBar mode="indeterminate" style="height: 3px" class="m-auto w-2xs" />
    </div>
  </div>
</template>
