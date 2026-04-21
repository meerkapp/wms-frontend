export const CHARACTERISTIC_KEY_REGEX = /^[a-z][a-z0-9_]*$/

export function generateKeyFromLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/^[^a-z]+/, '')
}
