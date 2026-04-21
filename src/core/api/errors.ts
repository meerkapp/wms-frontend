export interface ApiError {
  status: number
  message: string
}

function asRecord(val: unknown): Record<string, unknown> | null {
  return val !== null && typeof val === 'object' ? (val as Record<string, unknown>) : null
}

export function parseApiError(error: unknown): ApiError | null {
  if (!error || typeof error !== 'object') return null
  const err = asRecord(error)!
  const response = asRecord(err.response)
  const data = asRecord(err.data)
  const status = err.status ?? response?.status ?? data?.statusCode
  const message = data?.message ?? err.message ?? ''
  if (!status) return null
  return { status: Number(status), message: String(message) }
}
