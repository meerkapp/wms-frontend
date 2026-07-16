export function formatMinorAmount(amount: string, minorUnits: number): string {
  if (minorUnits === 0) return amount

  const padded = amount.padStart(minorUnits + 1, '0')
  const separatorIndex = padded.length - minorUnits
  return `${padded.slice(0, separatorIndex)}.${padded.slice(separatorIndex)}`
}
