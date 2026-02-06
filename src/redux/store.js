import { configureStore } from '@reduxjs/toolkit'
import { setupListeners } from '@reduxjs/toolkit/query'
import authReducer from './slices/authSlice'
import csrfReducer from './slices/csrfSlice'
import { authApi } from './api/authApi'
import { usersApi } from './api/usersApi'
import { tasksApi } from './api/tasksApi'
import { dashboardApi } from './api/dashboardApi'
import { systemApi } from './api/systemApi'
import { notificationsApi } from './api/notificationsApi'
import { uploadApi } from './api/uploadApi'
import { reportsApi } from './api/reportsApi'
import { auditApi } from './api/auditApi'
import { websocketMiddleware } from './middleware/websocketMiddleware'
import { rtkQueryErrorLogger } from './middleware/errorLogger'

const apiReducers = {
  [authApi.reducerPath]: authApi.reducer,
  [usersApi.reducerPath]: usersApi.reducer,
  [tasksApi.reducerPath]: tasksApi.reducer,
  [dashboardApi.reducerPath]: dashboardApi.reducer,
  [systemApi.reducerPath]: systemApi.reducer,
  [notificationsApi.reducerPath]: notificationsApi.reducer,
  [uploadApi.reducerPath]: uploadApi.reducer,
  [reportsApi.reducerPath]: reportsApi.reducer,
  [auditApi.reducerPath]: auditApi.reducer,
}

const featureReducers = {
  auth: authReducer,
  csrf: csrfReducer,
}

export const store = configureStore({
  reducer: {
    ...apiReducers,
    ...featureReducers,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          'persist/PERSIST',
          'persist/REHYDRATE',
          'tasksApi/subscriptions/updateSubscriptionOptions',
        ],
        ignoredActionPaths: [
          'meta.arg',
          'payload.timestamp',
          'payload.options',
          'payload.options.pollingInterval',
          'meta.baseQueryMeta.request',
          'meta.baseQueryMeta.response',
          'payload.baseQueryMeta.request',
          'payload.baseQueryMeta.response',
        ],
      },
    })
      .concat(authApi.middleware)
      .concat(usersApi.middleware)
      .concat(tasksApi.middleware)
      .concat(dashboardApi.middleware)
      .concat(systemApi.middleware)
      .concat(notificationsApi.middleware)
      .concat(uploadApi.middleware)
      .concat(reportsApi.middleware)
      .concat(auditApi.middleware)
      .concat(websocketMiddleware)
      .concat(rtkQueryErrorLogger),
  devTools: process.env.NODE_ENV !== 'production',
})

setupListeners(store.dispatch)

export default store