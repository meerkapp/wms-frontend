<script lang="ts" setup>
import { ref, watchEffect, computed } from 'vue'
import { FloatLabel, Select } from 'primevue'
import OrganizationIcon from './OrganizationIcon.vue'
import { Organizations } from '@/modules/signaldb/models/organizations.model'
import type { Organization } from '@meerkapp/wms-contracts'

const props = defineProps<{ organizationId: Organization['id'] | null; label: string }>()
const emit = defineEmits<{
  'update:organizationId': [value: Organization['id']]
}>()

const organizationOptions = ref<Organization[]>([])

watchEffect((onCleanup) => {
  const cursor = Organizations.find({}, { sort: { name: 1 } })
  organizationOptions.value = cursor.fetch()

  onCleanup(() => {
    cursor.cleanup()
  })
})

const selectedOrganization = computed(() => {
  return organizationOptions.value.find((org) => org.id === props.organizationId)
})
</script>

<template>
  <FloatLabel variant="on">
    <Select
      :model-value="props.organizationId"
      :options="organizationOptions"
      class="w-full"
      optionLabel="name"
      optionValue="id"
      labelId="on_organization"
      :filter="organizationOptions.length > 5"
      @update:model-value="(value) => emit('update:organizationId', value)"
    >
      <template #option="{ option }">
        <OrganizationIcon :website="option.website" />
        <span class="ml-2">{{ option.name }}</span>
      </template>
      <template #value>
        <div v-if="selectedOrganization" class="flex items-center gap-2">
          <OrganizationIcon :website="selectedOrganization.website" />
          <span>{{ selectedOrganization.name }}</span>
        </div>
      </template>
    </Select>
    <label for="on_organization">{{ props.label }}</label>
  </FloatLabel>
</template>
