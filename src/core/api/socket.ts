import { io } from 'socket.io-client'

// In production VITE_API_URL is /api (relative), so the browser origin is used.
// VITE_SOCKET_URL points directly to the backend during development.
const socketUrl =
  import.meta.env.VITE_SOCKET_URL ||
  (typeof window === 'undefined' ? undefined : window.location.origin)

export const socket = io(socketUrl, {
  autoConnect: false,
})

export function connectSocket(token: string) {
  const currentToken =
    typeof socket.auth === 'object' && socket.auth !== null
      ? (socket.auth as { token?: unknown }).token
      : undefined

  socket.auth = { token }

  // Socket.IO only sends auth during the handshake. Reconnect explicitly when
  // a refreshed access token replaces the token used by the active connection.
  if (socket.active && currentToken !== token) {
    socket.disconnect().connect()
    return
  }

  socket.connect()
}

export function disconnectSocket() {
  socket.disconnect()
}
