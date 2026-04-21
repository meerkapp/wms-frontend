import { computed, nextTick, ref, type ComputedRef, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Characteristic } from '@meerkapp/wms-contracts'
import { useAppDialog } from '@/core/composables/useAppDialog'
import TokenInsertDialog from '../components/TokenInsertDialog.vue'
import { formatSkuToken } from '../utils/sku'

export function useSkuTemplateInput(
  skuTemplate: Ref<string | null | undefined>,
  characteristics: ComputedRef<Characteristic[]>,
) {
  const { t } = useI18n()
  const dialog = useAppDialog()

  const skuTemplateInputRef = ref<{ $el: HTMLInputElement } | null>(null)

  const builtinTokens = computed(() => [
    { key: 'counter', label: t('product.type.form.skuTokens.counter') },
    { key: 'brand', label: t('product.type.form.skuTokens.brand') },
  ])

  const requiredCharacteristicTokens = computed(() =>
    characteristics.value
      .filter((c) => 'required' in c && c.required && c.key && ['number', 'select', 'toggle'].includes(c.type))
      .map((c) => ({ key: c.key, label: c.label || c.key })),
  )

  function insertToken(token: string) {
    const input = skuTemplateInputRef.value?.$el
    const current = skuTemplate.value || ''
    if (!input) {
      skuTemplate.value = current + token
      return
    }
    const start = input.selectionStart ?? current.length
    const end = input.selectionEnd ?? start
    skuTemplate.value = current.slice(0, start) + token + current.slice(end)
    nextTick(() => {
      input.focus()
      input.setSelectionRange(start + token.length, start + token.length)
    })
  }

  function openTokenDialog(tokenKey: string, tokenLabel: string) {
    if (tokenKey === 'counter') {
      insertToken(formatSkuToken(tokenKey))
      return
    }
    dialog.open(TokenInsertDialog, {
      props: {
        header: t('product.type.form.skuTokenDialog.title', { label: tokenLabel }),
        modal: true,
        style: { width: '22rem' },
      },
      data: { tokenKey, tokenLabel },
      onClose: (options) => {
        if (options?.data?.token) insertToken(options.data.token)
      },
    })
  }

  return {
    skuTemplateInputRef,
    builtinTokens,
    requiredCharacteristicTokens,
    openTokenDialog,
  }
}
