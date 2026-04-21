export function formatSkuToken(key: string, length?: number | null): string {
  return length ? `{${key}:${length}}` : `{${key}}`
}
