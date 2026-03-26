import { i18n } from '@/plugins/i18n'

export function getCountryFlag(code: string): string {
  if (!code || code.length !== 2) return '🌐'
  const offset = 0x1f1e6 - 0x41
  return [...code.toUpperCase()]
    .map((c) => String.fromCodePoint(c.codePointAt(0)! + offset))
    .join('')
}

export function getCountryName(code: string, fallback?: string | null): string {
  try {
    const locale = i18n.global.locale.value
    return new Intl.DisplayNames([locale], { type: 'region' }).of(code) ?? fallback ?? code
  } catch {
    return fallback ?? code
  }
}
