<script lang="ts" setup>
import { computed } from 'vue'
import { Button } from 'primevue'
import { useI18n } from 'vue-i18n'
import { useMutation } from '@pinia/colada'
import { useAppToast } from '@/core/composables/useAppToast'

import BaseCard from '@/core/components/BaseCard.vue'
import AppEmptyState from '@/core/components/AppEmptyState.vue'
import ProductTypeCard from '@/modules/product-type/components/ProductTypeCard.vue'

import { useAuthStore } from '@/modules/auth/stores/auth.store'
import { productTypeApi } from '@/modules/product-type/api/product-type.api'
import type { CreateProductTypeDto } from '@meerkapp/wms-contracts'
import { useAppDialog } from '@/core/composables/useAppDialog'
import ProductTypeFormDialog from './ProductTypeFormDialog.vue'
import { useProductTypes } from '@/modules/sync/composables/read-model.composables'

const { t } = useI18n()
const dialog = useAppDialog()
const toast = useAppToast()
const authStore = useAuthStore()
const { checkUserPermissions } = authStore

const { mutate: create } = useMutation({
  mutation: (dto: CreateProductTypeDto) => productTypeApi.create(dto),
  onError: () => toast.error(t('common.error.network')),
})

function openCreateDialog() {
  dialog.open(
    ProductTypeFormDialog,
    {
      props: {
        header: t('product.type.form.titleCreate'),
        modal: true,
        style: { width: '54rem' },
      },
      onClose: (options) => {
        if (options?.data) create(options.data)
      },
    },
    { type: 'extended', disableContentBackground: true },
  )
}

const productTypes = useProductTypes()

const title = computed(() =>
  productTypes.value.length > 0
    ? `${t('product.type.manager.title')} (${productTypes.value.length})`
    : t('product.type.manager.title'),
)
</script>

<template>
  <BaseCard :title="title">
    <template #header>
      <Button
        v-if="checkUserPermissions('product_type:create')"
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
        v-if="productTypes.length === 0"
        icon="tabler--category"
        :message="t('product.type.manager.empty')"
      />
      <div v-else class="px-3 @container">
        <div class="grid gap-3 grid-cols-1 @md:grid-cols-2">
          <ProductTypeCard
            v-for="productType in productTypes"
            :key="productType.id"
            :productType="productType"
          />
        </div>
      </div>
    </template>
  </BaseCard>
</template>
