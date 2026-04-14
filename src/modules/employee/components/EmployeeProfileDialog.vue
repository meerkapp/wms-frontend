<script lang="ts" setup>
import { computed, inject, type Ref } from 'vue'
import type { DynamicDialogInstance } from 'primevue/dynamicdialogoptions'
import type { Employee } from '@meerkapp/wms-contracts'
import EmployeeDialog from './EmployeeDialog.vue'
import EmployeeProfile from './EmployeeProfile.vue'

const dialogRef = inject<Ref<DynamicDialogInstance>>('dialogRef')

const employee = computed<Employee | undefined>(() => dialogRef?.value.data?.employee)
</script>

<template>
  <EmployeeDialog>
    <EmployeeProfile v-if="employee" :employee="employee" />
  </EmployeeDialog>
</template>
