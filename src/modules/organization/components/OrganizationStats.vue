<script setup lang="ts">
import { Tag } from 'primevue'
import { useQuery } from '@pinia/colada'
import { useI18n } from 'vue-i18n'
import { organizationApi } from '@/modules/organization/api/organization.api'

const props = defineProps<{ organizationId: number }>()

const { t } = useI18n()

const { data, status } = useQuery({
  key: () => ['organization-stats', props.organizationId],
  query: () => organizationApi.stats(props.organizationId),
})
</script>

<template>
  <div v-if="status === 'success'" class="flex items-center gap-2 pt-4">
    <Tag
      icon="iconify tabler--building-warehouse"
      :value="String(data?.warehouseCount)"
      severity="info"
      v-tooltip.bottom="t('organization.stats.warehouses')"
    />
    <Tag
      icon="iconify tabler--users"
      :value="String(data?.employeeCount)"
      severity="info"
      v-tooltip.bottom="t('organization.stats.employees')"
    />
  </div>
</template>
