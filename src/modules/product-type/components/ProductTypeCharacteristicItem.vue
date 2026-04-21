<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  Button,
  InputText,
  Checkbox,
  Message,
  InputNumber,
  Panel,
  FloatLabel,
  Tag,
  Divider,
} from 'primevue'
import { useConfirm } from 'primevue/useconfirm'
import { useI18n } from 'vue-i18n'
import type { Characteristic } from '@meerkapp/wms-contracts'

type CharacteristicWithOptionIds = Characteristic & {
  options?: { label: string; value: string; _id?: string }[]
}

const props = defineProps<{
  modelValue: CharacteristicWithOptionIds
  index: number
  isFirst: boolean
  isLast: boolean
  errors: Record<string, string | undefined>
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: CharacteristicWithOptionIds): void
  (e: 'remove'): void
  (e: 'move-up'): void
  (e: 'move-down'): void
}>()

const { t } = useI18n()
const confirm = useConfirm()

function confirmRemove() {
  confirm.require({
    message: t('product.type.form.characteristic.deleteConfirm'),
    header: t('product.type.form.characteristic.deleteTitle'),
    icon: 'iconify tabler--trash',
    rejectProps: { label: t('common.cancel'), severity: 'secondary', variant: 'text' },
    acceptProps: { label: t('common.delete'), severity: 'danger' },
    accept: () => emit('remove'),
  })
}

const typeIconMap: Record<string, string> = {
  number: 'iconify tabler--numbers',
  select: 'iconify tabler--list',
  toggle: 'iconify tabler--toggle-left',
  checkbox: 'iconify tabler--checkbox',
}

const typeIcon = computed(() => typeIconMap[props.modelValue.type] ?? 'iconify tabler--list')

const collapsed = ref(false)

function addOption() {
  const options = [...(props.modelValue.options || [])]
  options.push({ label: '', value: '', _id: crypto.randomUUID() })
  emit('update:modelValue', { ...props.modelValue, options })
}

function removeOption(optIndex: number) {
  const options = [...(props.modelValue.options || [])]
  options.splice(optIndex, 1)
  emit('update:modelValue', { ...props.modelValue, options })
}

function updateOption(optIndex: number, field: 'label' | 'value', value: string | undefined) {
  const options = [...(props.modelValue.options || [])]
  options[optIndex] = { ...options[optIndex], [field]: value ?? '' } as {
    label: string
    value: string
    _id?: string
  }
  emit('update:modelValue', { ...props.modelValue, options })
}

function updateField(field: string, value: unknown) {
  emit('update:modelValue', { ...props.modelValue, [field]: value })
}

function errKey(field: string) {
  return `characteristicsScheme[${props.index}].${field}`
}

function optErrKey(optIndex: number, field: string) {
  return `characteristicsScheme[${props.index}].options[${optIndex}].${field}`
}
</script>

<template>
  <Panel
    v-model:collapsed="collapsed"
    :pt="{
      pcToggleButton: { root: 'hidden!' },
      contentContainer: modelValue.type === 'checkbox' ? 'hidden!' : undefined,
    }"
  >
    <template #icons>
      <div class="flex items-center gap-1 mr-1">
        <Button
          v-if="!isFirst"
          type="button"
          icon="iconify tabler--arrow-up"
          severity="secondary"
          variant="text"
          rounded
          size="small"
          @click.stop="emit('move-up')"
        />
        <Button
          v-if="!isLast"
          type="button"
          icon="iconify tabler--arrow-down"
          severity="secondary"
          variant="text"
          rounded
          size="small"
          @click.stop="emit('move-down')"
        />
        <Button
          v-if="modelValue.type !== 'checkbox'"
          type="button"
          :icon="collapsed ? 'iconify tabler--plus' : 'iconify tabler--minus'"
          severity="secondary"
          variant="text"
          rounded
          size="small"
          @click.stop="collapsed = !collapsed"
        />
      </div>
    </template>
    <template #header>
      <div class="flex items-center gap-2 min-w-0 flex-1 pr-2">
        <i :class="[typeIcon, 'text-muted-color shrink-0']" />
        <span class="font-semibold text-sm truncate">
          {{
            modelValue.label || t('product.type.form.characteristic.header', { index: index + 1 })
          }}
        </span>
        <Tag
          v-if="modelValue.key"
          :value="modelValue.key"
          severity="secondary"
          icon="iconify tabler--key"
          class="font-medium! text-xs!"
        />
      </div>
    </template>
    <div v-if="modelValue.type !== 'checkbox'" class="flex flex-col">
      <!-- Required toggle -->
      <div class="flex justify-between items-center">
        <div class="flex items-center gap-2">
          <Checkbox
            :modelValue="modelValue.required"
            binary
            :id="'req_' + index"
            @update:modelValue="updateField('required', $event)"
          />
          <label :for="'req_' + index" class="text-sm cursor-pointer select-none">{{
            t('product.type.form.characteristic.required')
          }}</label>
        </div>
        <Button
          type="button"
          icon="iconify tabler--trash"
          severity="danger"
          variant="outlined"
          :label="t('common.delete')"
          rounded
          size="small"
          class="mr-1"
          @click.stop="confirmRemove()"
        />
      </div>

      <Divider />

      <div class="flex flex-col gap-4 mt-1">
        <!-- Number specific fields -->
        <template v-if="modelValue.type === 'number'">
          <div class="flex flex-col gap-1">
            <FloatLabel variant="on">
              <InputNumber
                :id="'char_min_' + index"
                :modelValue="modelValue.validation?.min"
                @update:modelValue="
                  updateField('validation', { ...modelValue.validation, min: $event })
                "
                size="small"
                fluid
              />
              <label :for="'char_min_' + index">
                {{
                  t('common.optionalField', { label: t('product.type.form.characteristic.min') })
                }}
              </label>
            </FloatLabel>
          </div>
          <div class="flex flex-col gap-1">
            <FloatLabel variant="on">
              <InputNumber
                :id="'char_max_' + index"
                :modelValue="modelValue.validation?.max"
                @update:modelValue="
                  updateField('validation', { ...modelValue.validation, max: $event })
                "
                size="small"
                fluid
              />
              <label :for="'char_max_' + index">{{
                t('common.optionalField', { label: t('product.type.form.characteristic.max') })
              }}</label>
            </FloatLabel>
          </div>
          <div class="flex flex-col gap-1">
            <FloatLabel variant="on">
              <InputText
                :id="'char_suffix_' + index"
                :modelValue="modelValue.ui?.suffix"
                @update:modelValue="updateField('ui', { ...modelValue.ui, suffix: $event })"
                size="small"
                fluid
              />
              <label :for="'char_suffix_' + index">{{
                t('common.optionalField', { label: t('product.type.form.characteristic.suffix') })
              }}</label>
            </FloatLabel>
          </div>
        </template>

        <!-- Toggle specific fields -->
        <template v-if="modelValue.type === 'toggle'">
          <div class="flex flex-col gap-1">
            <FloatLabel variant="on">
              <InputText
                :id="'char_true_label_' + index"
                :modelValue="modelValue.true_label"
                @update:modelValue="updateField('true_label', $event)"
                size="small"
                fluid
                :invalid="!!errors[errKey('true_label')]"
              />
              <label :for="'char_true_label_' + index">{{
                t('product.type.form.characteristic.trueLabel')
              }}</label>
            </FloatLabel>
            <Message
              v-if="errors[errKey('true_label')]"
              size="small"
              severity="error"
              variant="simple"
              >{{ errors[errKey('true_label')] }}</Message
            >
          </div>
          <div class="flex flex-col gap-1">
            <FloatLabel variant="on">
              <InputText
                :id="'char_false_label_' + index"
                :modelValue="modelValue.false_label"
                @update:modelValue="updateField('false_label', $event)"
                size="small"
                fluid
                :invalid="!!errors[errKey('false_label')]"
              />
              <label :for="'char_false_label_' + index">{{
                t('product.type.form.characteristic.falseLabel')
              }}</label>
            </FloatLabel>
            <Message
              v-if="errors[errKey('false_label')]"
              size="small"
              severity="error"
              variant="simple"
              >{{ errors[errKey('false_label')] }}</Message
            >
          </div>
        </template>

        <!-- Options for select type -->
        <template v-if="modelValue.type === 'select'">
          <Button
            type="button"
            :label="t('product.type.form.characteristic.addOption')"
            icon="iconify tabler--plus"
            outlined
            rounded
            size="small"
            fluid
            @click="addOption"
          />

          <div
            v-for="(option, optIndex) in modelValue.options"
            :key="option._id ?? optIndex"
            class="flex flex-col gap-1"
          >
            <div class="flex gap-2 items-start">
              <div class="flex-1">
                <FloatLabel variant="on">
                  <InputText
                    :id="'char_' + index + '_opt_label_' + optIndex"
                    :modelValue="option.label"
                    @update:modelValue="updateOption(optIndex, 'label', $event)"
                    size="small"
                    fluid
                    :invalid="!!errors[optErrKey(optIndex, 'label')]"
                  />
                  <label :for="'char_' + index + '_opt_label_' + optIndex">{{
                    t('product.type.form.characteristic.optionLabel')
                  }}</label>
                </FloatLabel>
              </div>
              <div class="flex-1">
                <FloatLabel variant="on">
                  <InputText
                    :id="'char_' + index + '_opt_value_' + optIndex"
                    :modelValue="option.value"
                    @update:modelValue="updateOption(optIndex, 'value', $event)"
                    size="small"
                    fluid
                    :invalid="!!errors[optErrKey(optIndex, 'value')]"
                  />
                  <label :for="'char_' + index + '_opt_value_' + optIndex">{{
                    t('product.type.form.characteristic.optionValue')
                  }}</label>
                </FloatLabel>
              </div>
              <Button
                type="button"
                icon="iconify tabler--x"
                severity="secondary"
                variant="text"
                rounded
                size="small"
                class="mt-1"
                @click="removeOption(optIndex)"
              />
            </div>
            <div class="flex flex-col gap-1">
              <Message
                v-if="errors[optErrKey(optIndex, 'label')]"
                size="small"
                severity="error"
                variant="simple"
                >{{ errors[optErrKey(optIndex, 'label')] }}</Message
              >
              <Message
                v-if="errors[optErrKey(optIndex, 'value')]"
                size="small"
                severity="error"
                variant="simple"
                >{{ errors[optErrKey(optIndex, 'value')] }}</Message
              >
            </div>
          </div>

          <Message
            v-if="errors[errKey('options')]"
            size="small"
            severity="error"
            variant="simple"
            >{{ errors[errKey('options')] }}</Message
          >
        </template>
      </div>
    </div>
    <Button
      v-else
      type="button"
      icon="iconify tabler--trash"
      severity="danger"
      variant="outlined"
      :label="t('common.delete')"
      rounded
      fluid
      size="small"
      class="mr-1"
      @click.stop="confirmRemove()"
    />
  </Panel>
</template>
