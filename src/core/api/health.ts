interface HealthcheckResponse {
  status: 'ok'
}

const apiBaseUrl = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '')

export async function requestHealthcheck(signal: AbortSignal) {
  const response = await fetch(`${apiBaseUrl}/healthcheck`, {
    cache: 'no-store',
    signal,
  })
  if (!response.ok) throw new Error(`Healthcheck failed with status ${response.status}`)

  const body = (await response.json()) as Partial<HealthcheckResponse>
  if (body.status !== 'ok') throw new Error('Healthcheck returned an invalid response')
}
