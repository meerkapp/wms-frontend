<script setup lang="ts">
import { computed, inject, ref, type Ref } from 'vue'
import { Button } from 'primevue'
import type { DynamicDialogInstance } from 'primevue/dynamicdialogoptions'
import { useI18n } from 'vue-i18n'
import type {
  ProductType,
  CreateProductTypeDto,
  UpdateProductTypeDto,
} from '@meerkapp/wms-contracts'
import ProductTypeForm from './ProductTypeForm.vue'

const { t } = useI18n()
const dialogRef = inject<Ref<DynamicDialogInstance>>('dialogRef')

const productType = computed<ProductType | undefined>(() => dialogRef?.value.data?.productType)

const formRef = ref<InstanceType<typeof ProductTypeForm> | null>(null)

function onSave() {
  formRef.value?.submit()
}

function onSubmit(values: CreateProductTypeDto | UpdateProductTypeDto) {
  dialogRef?.value.close(values)
}
</script>

<template>
  <div class="flex flex-col h-full">
    <div class="flex-1 overflow-y-auto p-1">
      <ProductTypeForm ref="formRef" :product-type="productType" @submit="onSubmit" />
    </div>

    <!-- Footer -->
    <div class="flex justify-end gap-2">
      <Button
        type="button"
        :label="t('common.cancel')"
        severity="secondary"
        variant="text"
        rounded
        @click="dialogRef?.close()"
      />
      <Button type="button" :label="t('common.save')" rounded @click="onSave" />
    </div>
  </div>
</template>
