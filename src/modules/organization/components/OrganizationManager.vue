<script lang="ts" setup>
import { computed, ref, watchEffect } from 'vue'
import { Button } from 'primevue'
import { useDialog } from 'primevue/usedialog'
import { useI18n } from 'vue-i18n'
import { useMutation } from '@pinia/colada'
import { useToast } from 'primevue/usetoast'

import BaseCard from '@/core/components/BaseCard.vue'
import OrganizationCard from './OrganizationCard.vue'
import OrganizationFormDialog from './OrganizationFormDialog.vue'
import { useAuthStore } from '@/modules/auth/stores/auth.store'
import { organizationApi } from '@/modules/organization/api/organization.api'
import { Organizations } from '@/modules/signaldb/models/organizations.model'
import type { Organization } from '@meerkapp/wms-contracts'

const { t } = useI18n()
const dialog = useDialog()
const toast = useToast()
const authStore = useAuthStore()
const { checkUserPermissions } = authStore

const { mutate: create } = useMutation({
  mutation: organizationApi.create,
  onError: () => toast.add({ severity: 'error', summary: t('common.error.network'), life: 3000 }),
})

const organizations = ref<Organization[]>([])

watchEffect((onCleanup) => {
  const cursor = Organizations.find({})
  organizations.value = cursor.fetch()

  onCleanup(() => {
    cursor.cleanup()
  })
})

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
      style: { width: '24rem' },
    },
    onClose: (options) => {
      if (options?.data) create(options.data)
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
        :label="t('common.create')"
        rounded
        @click="openCreateDialog"
      />
    </template>
    <template #main>
      <div class="px-3 @container">
        <div class="grid gap-3 grid-cols-1 @md:grid-cols-2">
          <OrganizationCard v-for="org in organizations" :key="org.id" :organization="org" />
        </div>
      </div>
    </template>
  </BaseCard>
</template>
