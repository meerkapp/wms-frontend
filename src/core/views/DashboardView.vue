<script setup lang="ts">
import { useAuthStore } from '@/modules/auth/stores/auth.store'

const authStore = useAuthStore()
const { user } = authStore
</script>

<template>
  <div class="h-screen">
    <h1>{{ user?.firstName }} {{ user?.lastName }}</h1>
    <p>{{ user?.email }}</p>
    <p>{{ user?.stockId }}</p>
    <p>{{ user?.isActive }}</p>
    <p>{{ user?.permissions }}</p>
  </div>
</template>
