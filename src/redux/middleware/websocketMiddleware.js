// src/redux/middleware/websocketMiddleware.js
import { io } from 'socket.io-client'
import { notificationsApi } from '../api/notificationsApi'

let socket = null
let reconnectTimer = null
let initialized = false

const connect = (store) => {
  if (socket) return
  
  const wsUrl = import.meta.env.VITE_WS_URL || (import.meta.env.VITE_API_URL || 'http://localhost:5000')
  
  socket = io(wsUrl, {
    transports: ['websocket', 'polling'],
    withCredentials: true, // Send session cookies
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000,
  })

  socket.on('connect', () => {
    console.log('WebSocket connected:', socket.id)
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
  })

  const invalidate = () => {
    store.dispatch(notificationsApi.util.invalidateTags(['Notification']))
  }

  socket.on('notification:new', (data) => {
    console.log('New notification received:', data)
    invalidate()
  })
  
  socket.on('notification:update', (data) => {
    console.log('Notification updated:', data)
    invalidate()
  })
  
  socket.on('notification:unreadCount', (data) => {
    console.log('Unread count updated:', data)
    invalidate()
  })

  socket.on('disconnect', (reason) => {
    console.log('WebSocket disconnected:', reason)
    // Auto-reconnect is handled by socket.io
  })

  socket.on('connect_error', (error) => {
    console.error('WebSocket connection error:', error.message)
    
    // If authentication error, the session might have expired
    if (error.message === 'Authentication required' || error.message === 'Invalid token') {
      console.warn('Session expired - WebSocket authentication failed')
      // Optionally dispatch logout
      // store.dispatch({ type: 'auth/logout' })
    }
    
    // Throttle reconnection attempts
    if (!reconnectTimer) {
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null
      }, 3000)
    }
  })

  socket.on('error', (error) => {
    console.error('WebSocket error:', error)
  })
}

const disconnect = () => {
  if (socket) {
    console.log('Disconnecting WebSocket...')
    socket.removeAllListeners()
    socket.disconnect()
    socket = null
  }
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
}

export const websocketMiddleware = (store) => (next) => (action) => {
  // Initialize connection on first run if authenticated
  if (!initialized) {
    initialized = true
    const isAuthenticated = store.getState()?.auth?.isAuthenticated
    if (isAuthenticated) {
      setTimeout(() => connect(store), 1000) // Delay to ensure session is established
    }
  }

  // Connect on login
  if (action.type === 'auth/setCredentials') {
    setTimeout(() => connect(store), 500) // Small delay after login
  }

  // Disconnect on logout
  if (action.type === 'auth/logout') {
    disconnect()
  }

  // Manual connection/disconnection
  if (action.type === 'websocket/connect') {
    connect(store)
  }
  if (action.type === 'websocket/disconnect') {
    disconnect()
  }

  return next(action)
}

export const connectWebSocket = () => ({
  type: 'websocket/connect',
})

export const disconnectWebSocket = () => ({
  type: 'websocket/disconnect',
})

export const websocketMessage = (data) => ({
  type: 'websocket/message',
  payload: data,
})