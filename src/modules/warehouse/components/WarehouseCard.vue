<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button, Tag } from 'primevue'
import { useDialog } from 'primevue/usedialog'
import BaseTile from '@/core/components/BaseTile.vue'
import OrganizationIcon from '@/modules/organization/components/OrganizationIcon.vue'
import { useAuthStore } from '@/modules/auth/stores/auth.store'
import { Organizations } from '@/modules/signaldb/models/organizations.model'
import { Localities } from '@/modules/signaldb/models/localities.model'
import type { Warehouse } from '@meerkapp/wms-contracts'

const props = defineProps<{ warehouse: Warehouse }>()

const authStore = useAuthStore()
const { checkUserPermissions } = authStore

const { t } = useI18n()

const organization = computed(() => {
  return Organizations.findOne({ id: props.warehouse.organizationId })
})

const locality = computed(() => {
  return Localities.findOne({ id: props.warehouse.localityId })
})
</script>

<template>
  <BaseTile>
    <div class="flex gap-3 items-center">
      <Tag :value="props.warehouse.code" severity="contrast" />
      <div class="leading-none">
        <h3>{{ props.warehouse.address }}</h3>
        <span class="text-xs">{{ locality?.name }}</span>
      </div>
    </div>
    <Button
      class="mt-5"
      :label="t('common.edit')"
      icon="iconify tabler--edit"
      severity="secondary"
      size="small"
      rounded
      fluid
    />
  </BaseTile>
</template>
