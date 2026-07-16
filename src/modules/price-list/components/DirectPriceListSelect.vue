<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { FloatLabel, Message, Select } from 'primevue'
import { useI18n } from 'vue-i18n'
import type { PriceListSummary } from '@meerkapp/wms-contracts'
import { priceListApi } from '@/modules/price-list/api/price-list.api'

const props = defineProps<{
  targetType: 'warehouse' | 'organization'
  targetId?: number
}>()
const priceListId = defineModel<number | null | undefined>({ required: true })

const { t } = useI18n()
const priceLists = ref<PriceListSummary[]>([])
const loading = ref(true)
const loadFailed = ref(false)
let active = true

const options = computed(() =>
  priceLists.value.map((priceList) => ({
    id: priceList.id,
    label: priceList.name,
  })),
)

onMounted(async () => {
  try {
    const assignmentRequest =
      props.targetId === undefined
        ? Promise.resolve({ priceListId: null })
        : props.targetType === 'warehouse'
          ? priceListApi.getWarehouseAssignment(props.targetId)
          : priceListApi.getOrganizationAssignment(props.targetId)
    const [lists, assignment] = await Promise.all([priceListApi.getAll(), assignmentRequest])
    if (!active) return
    priceLists.value = lists
    priceListId.value = assignment?.priceListId ?? null
  } catch {
    if (active) loadFailed.value = true
  } finally {
    if (active) loading.value = false
  }
})

onBeforeUnmount(() => {
  active = false
})
</script>

<template>
  <div class="space-y-5 border-t border-surface pt-5">
    <Message v-if="loadFailed" severity="error" size="small">
      {{ t('price.list.directAssignment.loadError') }}
    </Message>
    <Message v-else severity="secondary" size="small">
      {{ t(`price.list.directAssignment.${props.targetType}Hint`) }}
    </Message>
    <FloatLabel variant="on">
      <Select
        :id="`direct_price_list_${props.targetType}`"
        v-model="priceListId"
        :options="options"
        option-label="label"
        option-value="id"
        :loading="loading"
        :disabled="loading || loadFailed"
        show-clear
        fluid
      />
      <label :for="`direct_price_list_${props.targetType}`">
        {{ t('common.optionalField', { label: t('price.list.directAssignment.label') }) }}
      </label>
    </FloatLabel>
  </div>
</template>
