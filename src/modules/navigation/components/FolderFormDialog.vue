<script setup lang="ts">
import { computed, inject, type Ref } from 'vue'
import { Button, FloatLabel, InputText, Message } from 'primevue'
import type { DynamicDialogInstance } from 'primevue/dynamicdialogoptions'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import { useI18n } from 'vue-i18n'
import FolderSelect from './FolderSelect.vue'
import type { Folder } from '@meerkapp/wms-contracts'

const { t } = useI18n()

const dialogRef = inject<Ref<DynamicDialogInstance>>('dialogRef')
const folder = computed<Folder | undefined>(() => dialogRef?.value.data?.folder)

const validationSchema = computed(() =>
  toTypedSchema(
    z.object({
      name: z
        .string({ required_error: t('navigation.folder.form.validation.nameRequired') })
        .min(1, t('navigation.folder.form.validation.nameRequired')),
      parentId: z.number().nullable().optional(),
    }),
  ),
)

const { handleSubmit, errors, defineField, setFieldValue } = useForm({
  validationSchema,
  initialValues: {
    name: folder.value?.name ?? '',
    parentId: folder.value?.parentId ?? null,
  },
})

const [name, nameAttrs] = defineField('name')
const [parentId] = defineField('parentId')

const onSubmit = handleSubmit((values) => {
  dialogRef?.value.close(values)
})
</script>

<template>
  <form class="space-y-5 p-1" @submit.prevent="onSubmit">
    <div>
      <FloatLabel variant="on">
        <InputText
          id="folder_name"
          v-model="name"
          v-bind="nameAttrs"
          :invalid="!!errors.name"
          fluid
        />
        <label for="folder_name">{{ t('navigation.folder.form.name') }}</label>
      </FloatLabel>
      <Message v-if="errors.name" size="small" severity="error" variant="simple">
        {{ errors.name }}
      </Message>
    </div>
    <FolderSelect
      :folderId="parentId ?? null"
      :label="t('navigation.folder.form.location')"
      :excludeId="folder?.id"
      root
      @update:folderId="setFieldValue('parentId', $event)"
    />
    <Button type="submit" :label="t('common.save')" rounded fluid />
  </form>
</template>
