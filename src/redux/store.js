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

// Combine all API reducers
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

// Combine all feature reducers
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
          // Ignore RTK Query subscription option updates that may contain functions
          'tasksApi/subscriptions/updateSubscriptionOptions',
        ],
        // Correct option name is ignoredActionPaths
        ignoredActionPaths: [
          'meta.arg',
          'payload.timestamp',
          // Allow function-valued pollingInterval passed by RTK Query
          'payload.options',
          'payload.options.pollingInterval',
          // Ignore RTK Query's non-serializable fetch Request/Response objects added to action meta
          'meta.baseQueryMeta.request',
          'meta.baseQueryMeta.response',
          // Some RTKQ errors may place baseQueryMeta under payload
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
      .concat(websocketMiddleware),
  devTools: process.env.NODE_ENV !== 'production',
})

// Enable automatic refetching of queries on network reconnect
setupListeners(store.dispatch)

export default store