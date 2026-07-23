import { useConfirm } from 'primevue/useconfirm'
import type { ConfirmationOptions } from 'primevue/confirmationoptions'
import type { ButtonProps } from 'primevue/button'
import { useI18n } from 'vue-i18n'

export const APP_CONFIRM_GROUP = 'app-confirm'

interface AppConfirmationOptions extends Omit<
  ConfirmationOptions,
  'group' | 'acceptProps' | 'rejectProps'
> {
  acceptProps?: ButtonProps
  rejectProps?: ButtonProps
  showReject?: boolean
}

export function useAppConfirm() {
  const confirmation = useConfirm()
  const { t } = useI18n()

  function open(options: AppConfirmationOptions) {
    const {
      acceptProps,
      rejectProps,
      rejectClass,
      showReject = true,
      defaultFocus,
      ...confirmationOptions
    } = options

    confirmation.require({
      ...confirmationOptions,
      group: APP_CONFIRM_GROUP,
      blockScroll: confirmationOptions.blockScroll ?? true,
      defaultFocus: defaultFocus ?? (showReject ? 'reject' : 'none'),
      rejectClass: [rejectClass, !showReject ? 'hidden!' : null].filter(Boolean).join(' '),
      rejectProps: {
        label: t('common.cancel'),
        severity: 'secondary',
        variant: 'text',
        rounded: true,
        ...rejectProps,
      },
      acceptProps: {
        rounded: true,
        ...acceptProps,
      },
    })
  }

  return { open }
}
