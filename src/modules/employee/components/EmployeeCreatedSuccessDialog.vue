<script lang="ts" setup>
import { inject, type Ref } from 'vue'
import type { DynamicDialogInstance } from 'primevue/dynamicdialogoptions'
import EmployeeCreatedSuccess from './EmployeeCreatedSuccess.vue'

const dialogRef = inject<Ref<DynamicDialogInstance>>('dialogRef')
const email = dialogRef?.value.data?.email as string
const password = dialogRef?.value.data?.password as string
</script>

<template>
  <EmployeeCreatedSuccess :email="email" :password="password" />
</template>
