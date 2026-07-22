<script lang="ts" setup>
import { computed } from 'vue'
import { Button } from 'primevue'
import { useDialog } from 'primevue/usedialog'
import { useI18n } from 'vue-i18n'
import { useMutation, useQueryCache } from '@pinia/colada'
import { useToast } from 'primevue/usetoast'

import BaseCard from '@/core/components/BaseCard.vue'
import AppEmptyState from '@/core/components/AppEmptyState.vue'
import OrganizationCard from './OrganizationCard.vue'
import OrganizationFormDialog from './OrganizationFormDialog.vue'
import { useAuthStore } from '@/modules/auth/stores/auth.store'
import { organizationApi } from '@/modules/organization/api/organization.api'
import { useOrganizations } from '@/modules/sync/composables/read-model.composables'
import { localSyncService } from '@/modules/sync/services/sync.service'
import type { CreateOrganizationDto } from '@meerkapp/wms-contracts'

type OrganizationCreateFormResult = CreateOrganizationDto & { priceListId?: number | null }

const { t } = useI18n()
const dialog = useDialog()
const toast = useToast()
const authStore = useAuthStore()
const queryCache = useQueryCache()
const { checkUserPermissions } = authStore

const { mutate: create } = useMutation({
  mutation: async ({ priceListId, ...dto }: OrganizationCreateFormResult) => {
    const organization =
      priceListId === undefined
        ? await organizationApi.create(dto)
        : await organizationApi.createWithPriceListAssignment({ ...dto, priceListId })
    void localSyncService
      .applyServerUpsert('organization', organization)
      .catch((error) => console.error('[organization:create:read-model]', error))
    if (priceListId !== undefined) {
      await queryCache.invalidateQueries({ key: ['price-lists'], exact: true })
    }
    return organization
  },
  onError: () => toast.add({ severity: 'error', summary: t('common.error.network'), life: 3000 }),
})

const organizations = useOrganizations()

const title = computed(() =>
  organizations.value.length > 0
    ? `${t('organization.manager.title')} (${organizations.value.length})`
    : t('organization.manager.title'),
)

function openCreateDialog() {
  dialog.open(OrganizationFormDialog, {
    props: {
      header: t('organization.form.titleCreate'),
      modal: true,
      draggable: false,
      style: { width: '24rem' },
    },
    onClose: (options) => {
      if (options?.data) create(options.data as OrganizationCreateFormResult)
    },
  })
}
</script>

<template>
  <BaseCard :title="title">
    <template #header>
      <Button
        v-if="checkUserPermissions('organization:create')"
        size="small"
        icon="iconify tabler--plus"
        severity="secondary"
        rounded
        v-tooltip.bottom="t('common.create')"
        @click="openCreateDialog"
      />
    </template>
    <template #main>
      <AppEmptyState
        v-if="organizations.length === 0"
        icon="tabler--building-store"
        :message="t('organization.manager.empty')"
      />
      <div v-else class="px-3 @container">
        <div class="grid gap-3 grid-cols-1 @md:grid-cols-2">
          <OrganizationCard v-for="org in organizations" :key="org.id" :organization="org" />
        </div>
      </div>
    </template>
  </BaseCard>
</template>
