export const appVersion = __APP_VERSION__

export function isServerVersionCompatible(serverVersion: string) {
  return serverVersion === appVersion
}
