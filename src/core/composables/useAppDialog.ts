import { useDialog } from 'primevue/usedialog'
import type { DynamicDialogOptions } from 'primevue/dynamicdialogoptions'

interface StyleOptions {
  type: 'extended'
  disableContentBackground?: boolean
}

export function useAppDialog() {
  const dialog = useDialog()

  function open(component: object, options: DynamicDialogOptions, styleOptions?: StyleOptions) {
    if (styleOptions?.type !== 'extended') {
      return dialog.open(component, { ...options, props: { ...options.props, draggable: false } })
    }

    const contentBg = styleOptions.disableContentBackground
      ? 'bg-transparent'
      : 'bg-surface-50 dark:bg-surface-900'

    return dialog.open(component, {
      ...options,
      props: {
        ...options.props,
        draggable: false,
        pt: {
          root: 'bg-surface-200! dark:bg-surface-800!',
          content: `${contentBg} mx-5 mb-5 rounded-xl p-0!`,
        },
      },
    })
  }

  return { open }
}
