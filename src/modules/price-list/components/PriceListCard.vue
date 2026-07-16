<script setup lang="ts">
import { Button, Tag } from 'primevue'
import { useI18n } from 'vue-i18n'
import type { PriceListSummary } from '@meerkapp/wms-contracts'
import BaseTile from '@/core/components/BaseTile.vue'
import { useAuthStore } from '@/modules/auth/stores/auth.store'

const props = defineProps<{ priceList: PriceListSummary }>()
const emit = defineEmits<{ edit: [priceList: PriceListSummary] }>()

const { t } = useI18n()
const { checkUserPermissions } = useAuthStore()
</script>

<template>
  <BaseTile>
    <div class="flex items-center gap-2">
      <i class="iconify tabler--file-dollar" />
      <span class="truncate text-sm font-medium">{{ props.priceList.name }}</span>
    </div>
    <div v-if="props.priceList.isDefault" class="pt-4">
      <Tag
        :value="t('price.list.card.default')"
        icon="iconify tabler--star-filled"
        class="text-xs! font-medium!"
      />
    </div>
    <div
      class="flex flex-wrap items-center gap-2"
      :class="props.priceList.isDefault ? 'pt-2' : 'pt-4'"
    >
      <Tag
        :value="props.priceList.currency"
        icon="iconify tabler--coins"
        severity="info"
        v-tooltip.bottom="t('price.list.card.currency')"
      />
      <Tag
        :value="String(props.priceList.assignmentCount)"
        icon="iconify tabler--affiliate"
        severity="info"
        v-tooltip.bottom="t('price.list.card.assignments')"
      />
      <Tag
        :value="String(props.priceList.priceCount)"
        icon="iconify tabler--tag"
        severity="info"
        v-tooltip.bottom="t('price.list.card.prices')"
      />
    </div>

    <Button
      v-if="checkUserPermissions('price_list:update')"
      class="mt-4"
      :label="t('common.edit')"
      icon="iconify tabler--edit"
      severity="secondary"
      size="small"
      rounded
      fluid
      @click="emit('edit', props.priceList)"
    />
  </BaseTile>
</template>
