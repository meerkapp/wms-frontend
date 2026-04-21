<script lang="ts" setup>
import { computed, ref, watchEffect } from 'vue'
import { Button } from 'primevue'
import { useI18n } from 'vue-i18n'
import { useMutation } from '@pinia/colada'
import { useToast } from 'primevue/usetoast'

import BaseCard from '@/core/components/BaseCard.vue'
import ProductTypeCard from '@/modules/product-type/components/ProductTypeCard.vue'

import { useAuthStore } from '@/modules/auth/stores/auth.store'
import { productTypeApi } from '@/modules/product-type/api/product-type.api'
import { ProductTypes } from '@/modules/signaldb/models/product-types.model'
import type { ProductType, CreateProductTypeDto } from '@meerkapp/wms-contracts'
import { useAppDialog } from '@/core/composables/useAppDialog'
import ProductTypeFormDialog from './ProductTypeFormDialog.vue'

const { t } = useI18n()
const dialog = useAppDialog()
const toast = useToast()
const authStore = useAuthStore()
const { checkUserPermissions } = authStore

const { mutate: create } = useMutation({
  mutation: (dto: CreateProductTypeDto) => productTypeApi.create(dto),
  onError: () => toast.add({ severity: 'error', summary: t('common.error.network'), life: 3000 }),
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

const productTypes = ref<ProductType[]>([])

watchEffect((onCleanup) => {
  const cursor = ProductTypes.find({})
  productTypes.value = cursor.fetch()

  onCleanup(() => {
    cursor.cleanup()
  })
})

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
        :label="t('common.create')"
        rounded
        @click="openCreateDialog"
      />
    </template>
    <template #main>
      <div class="px-3 @container">
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
