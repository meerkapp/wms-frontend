<script setup lang="ts">
import { computed } from 'vue'
import { Button, FloatLabel, InputText, Message } from 'primevue'
import { useForm, useFieldArray } from 'vee-validate'
import { useI18n } from 'vue-i18n'
import type { ProductType, CreateProductTypeDto, UpdateProductTypeDto, Characteristic } from '@meerkapp/wms-contracts'
import ProductTypeCharacteristicItem from './ProductTypeCharacteristicItem.vue'
import WithdrawalStrategySelect from './WithdrawalStrategySelect.vue'
import SkuModeSelect from './SkuModeSelect.vue'
import BaseCard from '@/core/components/BaseCard.vue'
import { useProductTypeFormSchema } from '../composables/useProductTypeFormSchema'
import { useSkuTemplateInput } from '../composables/useSkuTemplateInput'
import { useCharacteristicsField } from '../composables/useCharacteristicsField'

const { t } = useI18n()

const props = defineProps<{
  productType?: ProductType
}>()

const emit = defineEmits<{
  (e: 'submit', values: CreateProductTypeDto | UpdateProductTypeDto): void
}>()

const { validationSchema } = useProductTypeFormSchema()

const { handleSubmit, errors, defineField, values } = useForm({
  validationSchema,
  initialValues: {
    name: props.productType?.name ?? '',
    defaultWriteoffStrategy: props.productType?.defaultWriteoffStrategy ?? 'FIFO',
    skuMode: props.productType?.skuMode ?? 'GLOBAL',
    skuTemplate: props.productType?.skuTemplate ?? '',
    characteristicsScheme: (props.productType?.characteristicsScheme as Characteristic[]) ?? [],
  },
})

const [name, nameAttrs] = defineField('name')
const [defaultWriteoffStrategy] = defineField('defaultWriteoffStrategy')
const [skuMode] = defineField('skuMode')
const [skuTemplate, skuTemplateAttrs] = defineField('skuTemplate')

const {
  fields: characteristics,
  push: addCharacteristic,
  remove: removeCharacteristic,
  update: updateCharacteristic,
  move: moveCharacteristic,
} = useFieldArray('characteristicsScheme')

const characteristicsForTokens = computed(
  () => (values.characteristicsScheme as Characteristic[]) ?? [],
)

const { skuTemplateInputRef, builtinTokens, requiredCharacteristicTokens, openTokenDialog } =
  useSkuTemplateInput(skuTemplate, characteristicsForTokens)

const { openAddCharacteristicDialog } = useCharacteristicsField(addCharacteristic)

const characteristicsSectionTitle = computed(() => {
  const count = characteristics.value.length
  return count > 0
    ? `${t('product.type.form.sections.characteristics')} (${count})`
    : t('product.type.form.sections.characteristics')
})

const onSubmit = handleSubmit((formValues) => {
  emit('submit', {
    ...formValues,
    skuTemplate: formValues.skuTemplate || null,
  } as CreateProductTypeDto | UpdateProductTypeDto)
})

defineExpose({ submit: onSubmit })
</script>

<template>
  <div class="flex flex-col md:flex-row gap-2 h-full min-h-128 pb-4">
    <div class="md:w-2/5 flex flex-col gap-2 h-fit">
      <BaseCard :title="t('product.type.form.sections.editor')">
        <template #main>
          <div class="space-y-4 px-3 pb-3">
            <div class="flex flex-col gap-1">
              <FloatLabel variant="on">
                <InputText
                  id="pt_name"
                  v-model="name"
                  v-bind="nameAttrs"
                  :invalid="!!errors.name"
                  fluid
                />
                <label for="pt_name">{{ t('product.type.form.name') }}</label>
              </FloatLabel>
              <Message v-if="errors.name" size="small" severity="error" variant="simple">{{
                errors.name
              }}</Message>
            </div>

            <div class="flex flex-col gap-1">
              <FloatLabel variant="on">
                <WithdrawalStrategySelect
                  id="pt_strategy"
                  v-model="defaultWriteoffStrategy"
                  :invalid="!!errors.defaultWriteoffStrategy"
                />
                <label for="pt_strategy">{{ t('product.type.form.withdrawalStrategy') }}</label>
              </FloatLabel>
              <Message
                v-if="errors.defaultWriteoffStrategy"
                size="small"
                severity="error"
                variant="simple"
                >{{ errors.defaultWriteoffStrategy }}</Message
              >
            </div>
          </div>
        </template>
      </BaseCard>

      <BaseCard :title="t('product.type.form.sections.sku')" class="flex-1">
        <template #main>
          <div class="space-y-4 px-3 pb-3">
            <div class="flex flex-col gap-1">
              <FloatLabel variant="on">
                <SkuModeSelect id="pt_skuMode" v-model="skuMode" :invalid="!!errors.skuMode" />
                <label for="pt_skuMode">{{ t('product.type.form.skuMode') }}</label>
              </FloatLabel>
              <Message v-if="errors.skuMode" size="small" severity="error" variant="simple">{{
                errors.skuMode
              }}</Message>
            </div>

            <div v-if="skuMode === 'CUSTOM'" class="flex flex-col gap-3">
              <div class="flex flex-col gap-1">
                <FloatLabel variant="on">
                  <InputText
                    id="pt_skuTemplate"
                    ref="skuTemplateInputRef"
                    v-model="skuTemplate"
                    v-bind="skuTemplateAttrs"
                    :invalid="!!errors.skuTemplate"
                    fluid
                  />
                  <label for="pt_skuTemplate">{{ t('product.type.form.skuTemplate') }}</label>
                </FloatLabel>
                <Message v-if="errors.skuTemplate" size="small" severity="error" variant="simple">{{
                  errors.skuTemplate
                }}</Message>
              </div>

              <Message severity="info" size="small">
                {{ t('product.type.form.skuTemplateInfo') }}
              </Message>

              <div class="flex flex-wrap gap-2">
                <Button
                  v-for="token in builtinTokens"
                  :key="token.key"
                  type="button"
                  size="small"
                  outlined
                  :rounded="token.key !== 'counter'"
                  icon="iconify tabler--code-plus"
                  :label="token.label"
                  @click="openTokenDialog(token.key, token.label)"
                />
                <Button
                  v-for="char in requiredCharacteristicTokens"
                  :key="char.key"
                  type="button"
                  size="small"
                  outlined
                  rounded
                  icon="iconify tabler--code-plus"
                  :label="char.label"
                  @click="openTokenDialog(char.key, char.label)"
                />
              </div>
            </div>
          </div>
        </template>
      </BaseCard>
    </div>

    <div class="md:w-3/5 flex flex-col min-h-0">
      <BaseCard :title="characteristicsSectionTitle" class="flex-1 h-full">
        <template #header>
          <Button
            type="button"
            icon="iconify tabler--plus"
            size="small"
            severity="secondary"
            :label="t('common.add')"
            rounded
            @click="openAddCharacteristicDialog"
          />
        </template>
        <template #main>
          <div class="relative h-full">
            <div class="absolute inset-0 overflow-y-auto px-4 pb-4 scroll-smooth">
              <div class="space-y-3 h-full">
                <ProductTypeCharacteristicItem
                  v-for="(char, index) in characteristics"
                  :key="char.key"
                  :modelValue="(char.value as Characteristic)"
                  @update:modelValue="updateCharacteristic(index, $event)"
                  :index="index"
                  :isFirst="index === 0"
                  :isLast="index === characteristics.length - 1"
                  :errors="errors"
                  @remove="removeCharacteristic(index)"
                  @move-up="moveCharacteristic(index, index - 1)"
                  @move-down="moveCharacteristic(index, index + 1)"
                />

                <div
                  v-if="characteristics.length === 0"
                  class="flex h-full flex-col items-center justify-center text-muted-color"
                >
                  <i class="iconify tabler--list-details text-5xl mb-4 opacity-20"></i>
                  <span class="text-sm font-medium opacity-50">{{
                    t('product.type.form.characteristic.empty')
                  }}</span>
                </div>
              </div>
            </div>
          </div>
        </template>
      </BaseCard>
    </div>
  </div>
</template>
