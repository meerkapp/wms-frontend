<script setup lang="ts">
import { Button } from 'primevue'
import { useDialog } from 'primevue/usedialog'
import { useI18n } from 'vue-i18n'
import { useMutation, useQueryCache } from '@pinia/colada'
import { useAppToast } from '@/core/composables/useAppToast'
import BaseTile from '@/core/components/BaseTile.vue'
import OrganizationFormDialog from './OrganizationFormDialog.vue'
import OrganizationIcon from './OrganizationIcon.vue'
import OrganizationStats from './OrganizationStats.vue'
import { organizationApi } from '@/modules/organization/api/organization.api'
import { useAuthStore } from '@/modules/auth/stores/auth.store'
import { localSyncService } from '@/modules/sync/services/sync.service'
import type { Organization, UpdateOrganizationDto } from '@meerkapp/wms-contracts'

type OrganizationFormResult = UpdateOrganizationDto & { priceListId?: number | null }

const props = defineProps<{ organization: Organization }>()

const { t } = useI18n()
const dialog = useDialog()
const toast = useAppToast()
const authStore = useAuthStore()
const queryCache = useQueryCache()
const { checkUserPermissions } = authStore

const { mutate: update } = useMutation({
  mutation: async ({ priceListId, ...dto }: OrganizationFormResult) => {
    const organization =
      priceListId === undefined
        ? await organizationApi.update(props.organization.id, dto)
        : await organizationApi.updateWithPriceListAssignment(props.organization.id, {
            ...dto,
            priceListId,
          })
    void localSyncService
      .applyServerUpsert('organization', organization)
      .catch((error) => console.error('[organization:update:read-model]', error))
    if (priceListId !== undefined) {
      await queryCache.invalidateQueries({ key: ['price-lists'], exact: true })
    }
    return organization
  },
  onError: () => toast.error(t('common.error.network')),
})

function openEditDialog() {
  dialog.open(OrganizationFormDialog, {
    props: {
      header: t('organization.form.titleEdit'),
      modal: true,
      draggable: false,
      style: { width: '24rem' },
    },
    data: {
      organization: props.organization,
    },
    onClose: (options) => {
      if (options?.data) update(options.data as OrganizationFormResult)
    },
  })
}
</script>

<template>
  <BaseTile>
    <div class="flex items-center gap-2">
      <OrganizationIcon :website="props.organization.website" />
      <span class="font-medium truncate text-sm">{{ props.organization.name }}</span>
    </div>
    <OrganizationStats :organizationId="props.organization.id" />
    <Button
      v-if="props.organization.website"
      :label="t('organization.card.visitWebsite')"
      icon="iconify tabler--link"
      as="a"
      :href="props.organization.website"
      target="_blank"
      size="small"
      variant="outlined"
      fluid
      rounded
      class="mt-4"
    />
    <Button
      v-if="checkUserPermissions('organization:update')"
      :label="t('common.edit')"
      icon="iconify tabler--edit"
      size="small"
      severity="secondary"
      fluid
      rounded
      class="mt-3"
      @click="openEditDialog"
    />
  </BaseTile>
</template>
