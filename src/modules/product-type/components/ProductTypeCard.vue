<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button, Tag } from 'primevue'
import { useMutation } from '@pinia/colada'
import { useAppToast } from '@/core/composables/useAppToast'
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
const toast = useAppToast()

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

const characteristicCount = computed(() =>
  Array.isArray(props.productType.characteristicsScheme)
    ? props.productType.characteristicsScheme.length
    : 0,
)

const { mutate: update } = useMutation({
  mutation: (dto: UpdateProductTypeDto) => productTypeApi.update(props.productType.id, dto),
  onError: () => toast.error(t('common.error.network')),
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
    <div class="flex items-center gap-2">
      <i class="iconify tabler--category" />
      <span class="truncate text-sm font-medium">{{ props.productType.name }}</span>
    </div>
    <div class="flex flex-wrap items-center gap-2 pt-4">
      <Tag
        :value="strategyLabel"
        icon="iconify tabler--package-export"
        severity="info"
        v-tooltip.bottom="t('product.type.form.withdrawalStrategy')"
      />
      <Tag
        :value="skuModeLabel"
        icon="iconify tabler--hash"
        severity="info"
        v-tooltip.bottom="t('product.type.form.skuMode')"
      />
      <Tag
        :value="String(characteristicCount)"
        icon="iconify tabler--list-details"
        severity="info"
        v-tooltip.bottom="t('product.type.form.sections.characteristics')"
      />
    </div>
    <Button
      v-if="checkUserPermissions('product_type:update')"
      class="mt-4"
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
