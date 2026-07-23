import { useToast } from 'primevue/usetoast'
import type { ToastMessageOptions } from 'primevue/toast'

export const APP_TOAST_GROUP = 'app-toast'
export const APP_TOAST_LIFE_MS = 2200
export const APP_TOAST_ERROR_LIFE_MS = 4000

type AppToastSeverity = NonNullable<ToastMessageOptions['severity']>
type AppToastOptions = Omit<
  ToastMessageOptions,
  'closable' | 'group' | 'severity' | 'summary'
>

function getDefaultLife(severity: AppToastSeverity) {
  return severity === 'error' ? APP_TOAST_ERROR_LIFE_MS : APP_TOAST_LIFE_MS
}

export function useAppToast() {
  const toast = useToast()

  function show(severity: AppToastSeverity, summary: string, options: AppToastOptions = {}) {
    toast.add({
      ...options,
      group: APP_TOAST_GROUP,
      severity,
      summary,
      life: options.life ?? getDefaultLife(severity),
      closable: false,
    })
  }

  return {
    success: (summary: string, options?: AppToastOptions) => show('success', summary, options),
    info: (summary: string, options?: AppToastOptions) => show('info', summary, options),
    warn: (summary: string, options?: AppToastOptions) => show('warn', summary, options),
    error: (summary: string, options?: AppToastOptions) => show('error', summary, options),
  }
}
