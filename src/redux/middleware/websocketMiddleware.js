import { io } from 'socket.io-client'
import { notificationsApi } from '../api/notificationsApi'
import { notify } from '../../utils/toast'

let socket = null
let reconnectTimer = null
let initialized = false

const connect = (store) => {
  if (socket) return

  const wsUrl = import.meta.env.VITE_WS_URL || (import.meta.env.VITE_API_URL || 'http://localhost:5000')

  socket = io(wsUrl, {
    transports: ['websocket', 'polling'],
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000,
  })

  socket.on('connect', () => {
    console.log('✅ WebSocket connected successfully');
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
  })

  const invalidate = () => {
    store.dispatch(notificationsApi.util.invalidateTags(['Notification']))
  }

  socket.on('notification:new', (data) => {
    console.log('🔔 New notification received via WebSocket:', data);

    // 1. Optimistically add to 'getNotifications' list
    store.dispatch(
      notificationsApi.util.updateQueryData('getNotifications', { page: 1, limit: 20 }, (draft) => {
        if (draft.notifications) {
          draft.notifications.unshift(data);
          draft.notifications.pop(); // Keep list size constant
        }
      })
    );
    // 2. Update stats
    store.dispatch(
      notificationsApi.util.updateQueryData('getCounts', undefined, (draft) => {
        draft.unread += 1;
        draft.total += 1;
      })
    );

    // 3. Show Toast!
    console.log('🍞 Showing toast for:', data.message || 'New Notification');
    notify.info(data.message || 'New Notification');

    // 4. Invalidate only if we couldn't optimistic update (fallback)
    invalidate();
  })

  socket.on('notification:update', (data) => {
    store.dispatch(
      notificationsApi.util.updateQueryData('getNotifications', { page: 1, limit: 20 }, (draft) => {
        const index = draft.notifications?.findIndex(n => n.id === data.id);
        if (index !== -1) {
          draft.notifications[index] = { ...draft.notifications[index], ...data };
        }
      })
    );
  })

  socket.on('notification:unreadCount', (data) => {
    store.dispatch(
      notificationsApi.util.updateQueryData('getUnreadCount', undefined, () => data.count)
    );
  })

  socket.on('disconnect', (reason) => {
  })

  socket.on('connect_error', (error) => {
    console.error('WebSocket connection error:', error.message)

    if (error.message === 'Authentication required' || error.message === 'Invalid token') {
      console.warn('Session expired - WebSocket authentication failed')
    }

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
  if (!initialized) {
    initialized = true
    const isAuthenticated = store.getState()?.auth?.isAuthenticated
    if (isAuthenticated) {
      setTimeout(() => connect(store), 1000)
    }
  }

  if (action.type === 'auth/setCredentials') {
    setTimeout(() => connect(store), 500)
  }

  if (action.type === 'auth/logout') {
    disconnect()
  }

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