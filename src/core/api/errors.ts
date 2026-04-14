export interface ApiError {
  status: number
  message: string
}

export function parseApiError(error: unknown): ApiError | null {
  if (!error || typeof error !== 'object') return null
  const err = error as Record<string, any>
  const status = err.status ?? err.response?.status ?? err.data?.statusCode
  const message = err.data?.message ?? err.message ?? ''
  if (!status) return null
  return { status: Number(status), message: String(message) }
}
