<script setup lang="ts">
import { useAuthStore } from '@/modules/auth/stores/auth.store'
import { Countries } from '@/modules/signaldb/models/countries.model'
import { watchEffect, ref } from 'vue'

const authStore = useAuthStore()
const { user } = authStore

const countries = ref<any[]>([])

watchEffect((onCleanup) => {
  const cursor = Countries.find({})
  countries.value = cursor.fetch() ?? []

  onCleanup(() => {
    cursor.cleanup()
  })
})
</script>

<template>
  <div class="h-screen">
    <h1>{{ user?.firstName }} {{ user?.lastName }}</h1>
    <p>{{ user?.email }}</p>
    <p>{{ user?.stockId }}</p>
    <p>{{ user?.isActive }}</p>
    <p>{{ user?.permissions }}</p>
    {{ countries }}
  </div>
</template>
