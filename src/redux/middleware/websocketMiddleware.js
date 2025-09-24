import { io } from 'socket.io-client'
import { notificationsApi } from '../api/notificationsApi'

let socket = null
let reconnectTimer = null
let initialized = false

const connect = (store, token) => {
  if (!token || socket) return
  const wsUrl = import.meta.env.VITE_WS_URL || (import.meta.env.VITE_API_URL || 'http://localhost:5000')
  socket = io(wsUrl, {
    transports: ['websocket'],
    auth: { token },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
  })

  socket.on('connect', () => {
    // console.log('WS connected', socket.id)
  })

  const invalidate = () => {
    store.dispatch(notificationsApi.util.invalidateTags(['Notification']))
  }

  socket.on('notification:new', () => invalidate())
  socket.on('notification:update', () => invalidate())
  socket.on('notification:unreadCount', () => {
    // We can optimistically update cache if needed; simplest is to invalidate
    invalidate()
  })

  socket.on('disconnect', () => {
    // Attempt reconnection handled by socket.io
  })

  socket.on('connect_error', () => {
    // throttle reconnection attempts if needed
    if (reconnectTimer) return
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
    }, 3000)
  })
}

const disconnect = () => {
  if (socket) {
    socket.removeAllListeners()
    socket.disconnect()
    socket = null
  }
}

export const websocketMiddleware = (store) => (next) => (action) => {
  // On first middleware run, try to connect if token already present (e.g., after refresh)
  if (!initialized) {
    initialized = true
    const token = store.getState()?.auth?.token
    if (token) {
      connect(store, token)
    }
  }

  if (action.type === 'auth/setCredentials') {
    const token = action.payload?.token
    connect(store, token)
  }
  if (action.type === 'auth/logout') {
    disconnect()
  }

  if (action.type === 'websocket/connect') {
    connect(store, action.payload)
  }
  if (action.type === 'websocket/disconnect') {
    disconnect()
  }

  const result = next(action)

  // After state rehydration, connect using the rehydrated token
  if (action.type === 'persist/REHYDRATE') {
    const token = store.getState()?.auth?.token || action.payload?.auth?.token
    if (token) {
      connect(store, token)
    }
  }

  return result
}

export const connectWebSocket = (token) => ({
  type: 'websocket/connect',
  payload: token,
})

export const disconnectWebSocket = () => ({
  type: 'websocket/disconnect',
})

export const websocketMessage = (data) => ({
  type: 'websocket/message',
  payload: data,
})