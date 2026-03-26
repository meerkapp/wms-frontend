import { io } from 'socket.io-client'

// In production VITE_API_URL is /api (relative), use window.location.origin
// In development VITE_SOCKET_URL points to the backend root
const socketUrl = import.meta.env.VITE_SOCKET_URL || window.location.origin

export const socket = io(socketUrl, {
  autoConnect: false,
})

export function connectSocket(token: string) {
  socket.auth = { token }
  socket.connect()
}
