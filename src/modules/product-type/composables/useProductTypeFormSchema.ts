import { computed } from 'vue'
import { toTypedSchema } from '@vee-validate/zod'
import { z } from 'zod'
import { useI18n } from 'vue-i18n'
import type { Characteristic } from '@meerkapp/wms-contracts'

const SKU_TEMPLATE_REGEX = /^(\{(brand|counter)(?::\d+)?\}|\{[a-z_]+(?::\d+)?\}|[^{}]+)+$/

export function useProductTypeFormSchema() {
  const { t } = useI18n()

  const characteristicBaseFields = () => ({
    label: z.string().min(1, t('product.type.form.validation.characteristicLabelRequired')),
    key: z.string().min(1, t('product.type.form.validation.characteristicKeyRequired')),
  })

  const validationSchema = computed(() =>
    toTypedSchema(
      z
        .object({
          name: z
            .string({ required_error: t('product.type.form.validation.nameRequired') })
            .min(1, t('product.type.form.validation.nameRequired')),
          defaultWriteoffStrategy: z.enum(['FIFO', 'LIFO', 'FEFO', 'MANUAL'], {
            required_error: t('product.type.form.validation.withdrawalStrategyRequired'),
          }),
          skuMode: z.enum(['CUSTOM', 'GLOBAL'], {
            required_error: t('product.type.form.validation.skuModeRequired'),
          }),
          skuTemplate: z.string().optional().nullable(),
          characteristicsScheme: z.array(
            z.discriminatedUnion('type', [
              z.object({
                ...characteristicBaseFields(),
                type: z.literal('number'),
                required: z.boolean(),
                validation: z
                  .object({
                    min: z.number().optional().nullable().transform((v) => v ?? undefined),
                    max: z.number().optional().nullable().transform((v) => v ?? undefined),
                  })
                  .optional(),
                ui: z
                  .object({
                    suffix: z.string().optional().nullable().transform((v) => v ?? undefined),
                  })
                  .optional(),
              }),
              z.object({
                ...characteristicBaseFields(),
                type: z.literal('select'),
                required: z.boolean(),
                options: z
                  .array(
                    z.object({
                      label: z.string().min(1, t('product.type.form.validation.optionLabelRequired')),
                      value: z.string().min(1, t('product.type.form.validation.optionValueRequired')),
                    }),
                  )
                  .min(1, t('product.type.form.validation.atLeastOneOptionRequired')),
              }),
              z.object({
                ...characteristicBaseFields(),
                type: z.literal('toggle'),
                required: z.boolean(),
                true_label: z.string().min(1, t('product.type.form.validation.toggleTrueLabelRequired')),
                false_label: z.string().min(1, t('product.type.form.validation.toggleFalseLabelRequired')),
              }),
              z.object({
                ...characteristicBaseFields(),
                type: z.literal('checkbox'),
              }),
            ]),
          ),
        })
        .refine((data) => data.skuMode !== 'CUSTOM' || !!data.skuTemplate, {
          message: t('product.type.form.validation.skuTemplateRequired'),
          path: ['skuTemplate'],
        })
        .refine((data) => !data.skuTemplate || SKU_TEMPLATE_REGEX.test(data.skuTemplate), {
          message: t('product.type.form.validation.skuTemplateInvalid'),
          path: ['skuTemplate'],
        })
        .refine(
          (data) => {
            if (data.skuMode !== 'CUSTOM' || !data.skuTemplate || !data.characteristicsScheme)
              return true
            const skuCompatibleKeys = new Set(
              (data.characteristicsScheme as Characteristic[])
                .filter((c) => 'required' in c && c.required && ['number', 'select', 'toggle'].includes(c.type))
                .map((c) => c.key),
            )
            const templateKeys = [...data.skuTemplate.matchAll(/\{([a-z_]+)(?::\d+)?\}/g)]
              .map(([, key]) => key!)
              .filter((key) => !['brand', 'counter'].includes(key))
            return templateKeys.every((key) => skuCompatibleKeys.has(key))
          },
          {
            message: t('product.type.form.validation.skuTemplateCharacteristicsMismatch'),
            path: ['skuTemplate'],
          },
        ),
    ),
  )

  return { validationSchema }
}
