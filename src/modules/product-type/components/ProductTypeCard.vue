<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button, Tag } from 'primevue'
import { useMutation } from '@pinia/colada'
import { useToast } from 'primevue/usetoast'
import BaseTile from '@/core/components/BaseTile.vue'
import { useAuthStore } from '@/modules/auth/stores/auth.store'
import { useAppDialog } from '@/core/composables/useAppDialog'
import ProductTypeFormDialog from './ProductTypeFormDialog.vue'
import { productTypeApi } from '../api/product-type.api'
import type { ProductType, UpdateProductTypeDto } from '@meerkapp/wms-contracts'

const props = defineProps<{ productType: ProductType }>()

const authStore = useAuthStore()
const { checkUserPermissions } = authStore

const { t } = useI18n()
const dialog = useAppDialog()
const toast = useToast()

const strategyLabel = computed(() => {
  const map: Record<string, string> = {
    FIFO: t('product.type.form.withdrawalStrategies.fifo.label'),
    LIFO: t('product.type.form.withdrawalStrategies.lifo.label'),
    FEFO: t('product.type.form.withdrawalStrategies.fefo.label'),
    MANUAL: t('product.type.form.withdrawalStrategies.manual.label'),
  }
  return map[props.productType.defaultWriteoffStrategy] ?? props.productType.defaultWriteoffStrategy
})

const skuModeLabel = computed(() => {
  const map: Record<string, string> = {
    GLOBAL: t('product.type.form.skuModes.global'),
    CUSTOM: t('product.type.form.skuModes.custom'),
  }
  return map[props.productType.skuMode] ?? props.productType.skuMode
})

const { mutate: update } = useMutation({
  mutation: (dto: UpdateProductTypeDto) => productTypeApi.update(props.productType.id, dto),
  onError: () => toast.add({ severity: 'error', summary: t('common.error.network'), life: 3000 }),
})

function openEditDialog() {
  dialog.open(
    ProductTypeFormDialog,
    {
      props: {
        header: t('product.type.form.titleEdit'),
        modal: true,
        style: { width: '54rem' },
      },
      data: { productType: props.productType },
      onClose: (options) => {
        if (options?.data) update(options.data)
      },
    },
    { type: 'extended', disableContentBackground: true },
  )
}
</script>

<template>
  <BaseTile>
    <div>
      <div class="leading-none">
        <span class="font-semibold text-sm">{{ productType.name }}</span>
      </div>
      <div class="flex flex-wrap gap-2 mt-4">
        <Tag
          :value="strategyLabel"
          icon="iconify tabler--package-export"
          severity="info"
          class="text-xs! font-medium!"
          v-tooltip.bottom="t('product.type.form.withdrawalStrategy')"
        />
        <Tag
          :value="skuModeLabel"
          icon="iconify tabler--hash"
          severity="info"
          class="text-xs! font-medium!"
          v-tooltip.bottom="t('product.type.form.skuMode')"
        />
      </div>
    </div>
    <Button
      v-if="checkUserPermissions('product_type:update')"
      class="mt-5"
      :label="t('common.edit')"
      icon="iconify tabler--edit"
      severity="secondary"
      size="small"
      rounded
      fluid
      @click="openEditDialog"
    />
  </BaseTile>
</template>
