<script lang="ts" setup>
import { storeToRefs } from 'pinia'
import { InputText } from 'primevue'
import { useI18n } from 'vue-i18n'
import { useNavigationStore } from '@modules/navigation/stores/navigation.store'

const value = defineModel<string>('value', { default: '' })

const navigationStore = useNavigationStore()
const { selectedItem: selectedNavigationItem } = storeToRefs(navigationStore)
const { t } = useI18n()
</script>

<template>
  <InputText
    v-model="value"
    :placeholder="
      selectedNavigationItem?.type === 'product_favorites'
        ? t('product.table.search.favorites')
        : selectedNavigationItem?.type === 'product_archive'
          ? t('product.table.search.archive')
          : t('product.table.search.collection')
    "
    :disabled="
      selectedNavigationItem?.type !== 'product_collection' &&
      selectedNavigationItem?.type !== 'product_favorites' &&
      selectedNavigationItem?.type !== 'product_archive'
    "
  />
</template>
