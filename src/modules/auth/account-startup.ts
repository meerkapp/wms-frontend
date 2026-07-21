export type AccountStartupDecision =
  | { type: 'login' }
  | { type: 'restore'; accountId: string }
  | { type: 'select' }

export function decideAccountStartup(accountIds: string[]): AccountStartupDecision {
  if (accountIds.length === 0) return { type: 'login' }
  if (accountIds.length === 1) return { type: 'restore', accountId: accountIds[0]! }
  return { type: 'select' }
}
