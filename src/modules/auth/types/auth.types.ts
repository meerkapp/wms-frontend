export interface JwtPayload {
  sub: string
  email: string
  firstName: string | null
  lastName: string | null
  stockId: number | null
  isActive: boolean
  permissions: string[]
}

export interface AuthTokens {
  access_token: string
  // refresh_token is set as httpOnly cookie by the backend
}

export interface SetupStatusResponse {
  setupRequired: boolean
}
