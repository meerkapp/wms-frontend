<script setup lang="ts">
import { computed } from 'vue'
import { Button, Message, Skeleton } from 'primevue'
import { useI18n } from 'vue-i18n'
import { useMutation, useQuery } from '@pinia/colada'
import { useAppToast } from '@/core/composables/useAppToast'
import type { FetchError } from 'ofetch'
import type {
  CreatePriceListDto,
  PriceListSummary,
  UpdatePriceListDto,
} from '@meerkapp/wms-contracts'
import BaseCard from '@/core/components/BaseCard.vue'
import AppEmptyState from '@/core/components/AppEmptyState.vue'
import { useAppDialog } from '@/core/composables/useAppDialog'
import { useAuthStore } from '@/modules/auth/stores/auth.store'
import { priceListApi } from '@/modules/price-list/api/price-list.api'
import PriceListCard from './PriceListCard.vue'
import PriceListFormDialog from './PriceListFormDialog.vue'

const { t } = useI18n()
const dialog = useAppDialog()
const toast = useAppToast()
const { checkUserPermissions } = useAuthStore()

const {
  data: priceListData,
  status,
  refetch: refetchPriceLists,
} = useQuery({
  key: ['price-lists'],
  query: priceListApi.getAll,
})

const priceLists = computed(() => priceListData.value ?? [])
const title = computed(() =>
  priceLists.value.length > 0
    ? `${t('price.list.manager.title')} (${priceLists.value.length})`
    : t('price.list.manager.title'),
)

function showMutationError(error: unknown) {
  const fetchError = error as FetchError<{ message?: string }>
  const message = fetchError.data?.message ?? ''
  const isCurrencyConflict = message.includes('currency')
  const isAssignmentConflict = fetchError.response?.status === 409 && !isCurrencyConflict
  toast.error(
    isCurrencyConflict
      ? t('price.list.error.currencyLocked')
      : isAssignmentConflict
        ? t('price.list.error.targetConflict')
        : t('common.error.network'),
  )
}

function retryLoad() {
  void refetchPriceLists()
}

const { mutate: create } = useMutation({
  mutation: priceListApi.create,
  onSuccess: () => void refetchPriceLists(),
  onError: showMutationError,
})

const { mutate: update } = useMutation({
  mutation: ({ id, dto }: { id: number; dto: UpdatePriceListDto }) => priceListApi.update(id, dto),
  onSuccess: () => void refetchPriceLists(),
  onError: showMutationError,
})

function openCreateDialog() {
  dialog.open(PriceListFormDialog, {
    props: {
      header: t('price.list.form.titleCreate'),
      modal: true,
      style: { width: '32rem' },
    },
    data: { priceLists: priceLists.value },
    onClose: (options) => {
      if (options?.data) create(options.data as CreatePriceListDto)
    },
  })
}

function openEditDialog(priceList: PriceListSummary) {
  dialog.open(PriceListFormDialog, {
    props: {
      header: t('price.list.form.titleEdit'),
      modal: true,
      style: { width: '32rem' },
    },
    data: { priceList, priceLists: priceLists.value },
    onClose: (options) => {
      if (options?.data) {
        update({ id: priceList.id, dto: options.data as UpdatePriceListDto })
      }
    },
  })
}
</script>

<template>
  <BaseCard :title="title">
    <template #header>
      <Button
        v-if="checkUserPermissions('price_list:create')"
        size="small"
        icon="iconify tabler--plus"
        severity="secondary"
        rounded
        v-tooltip.bottom="t('common.create')"
        @click="openCreateDialog"
      />
    </template>

    <template #main>
      <div v-if="status === 'pending'" class="px-3 @container">
        <div class="grid grid-cols-1 gap-3 @md:grid-cols-2">
          <Skeleton v-for="index in 2" :key="index" height="8rem" border-radius="0.5rem" />
        </div>
      </div>

      <div
        v-else-if="status === 'error'"
        class="flex h-full flex-col items-center justify-center gap-4 px-6 text-center"
      >
        <Message severity="error">{{ t('price.list.manager.loadError') }}</Message>
        <Button
          :label="t('price.list.manager.retry')"
          icon="iconify tabler--refresh"
          severity="secondary"
          size="small"
          rounded
          @click="retryLoad"
        />
      </div>

      <AppEmptyState
        v-else-if="priceLists.length === 0"
        icon="tabler--file-dollar"
        :message="t('price.list.manager.empty')"
      />

      <div v-else class="px-3 @container">
        <div class="grid grid-cols-1 gap-3 @md:grid-cols-2">
          <PriceListCard
            v-for="priceList in priceLists"
            :key="priceList.id"
            :price-list="priceList"
            @edit="openEditDialog"
          />
        </div>
      </div>
    </template>
  </BaseCard>
</template>
