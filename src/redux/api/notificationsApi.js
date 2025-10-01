// src/redux/api/notificationsApi.js - Session-based with CSRF
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const baseQuery = fetchBaseQuery({
  baseUrl: `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/notifications/`,
  credentials: 'include', // Send session cookies
  prepareHeaders: (headers, { getState }) => {
    const token = getState().auth.token;
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    
    // Add CSRF token for non-GET requests
    const csrfToken = window.csrfToken;
    if (csrfToken) {
      headers.set('X-CSRF-Token', csrfToken);
    }
    
    return headers;
  }
});

const baseQueryWithReauth = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions);
  
  if (result?.error?.status === 401) {
    api.dispatch({ type: 'auth/logout' });
  }
  
  // Handle 403 CSRF token errors - refresh token and retry
  if (result?.error?.status === 403 && result?.error?.data?.message?.includes('CSRF')) {
    console.log('CSRF token invalid, fetching new token...');
    
    try {
      const csrfResponse = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/csrf-token`,
        { credentials: 'include' }
      );
      
      if (csrfResponse.ok) {
        const data = await csrfResponse.json();
        window.csrfToken = data.csrfToken;
        console.log('New CSRF token fetched, retrying request...');
        
        // Retry the original request with new token
        result = await baseQuery(args, api, extraOptions);
      }
    } catch (error) {
      console.error('Failed to refresh CSRF token:', error);
    }
  }
  
  return result;
};

export const notificationsApi = createApi({
  reducerPath: 'notificationsApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Notification', 'NotificationCount'],
  
  // OPTIMIZED: Default cache retention
  keepUnusedDataFor: 180, // 3 minutes default
  refetchOnMountOrArgChange: 180,
  
  endpoints: (builder) => ({
    // OPTIMIZED: Get notifications with specific tag invalidation
    getNotifications: builder.query({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        if (params.page) searchParams.append('page', params.page);
        if (params.limit) searchParams.append('limit', params.limit);
        if (params.isRead !== undefined) searchParams.append('isRead', params.isRead);
        return `?${searchParams.toString()}`;
      },
      providesTags: (result) =>
        result?.notifications
          ? [
              ...result.notifications.map(({ id }) => ({ type: 'Notification', id })),
              { type: 'Notification', id: 'LIST' }
            ]
          : [{ type: 'Notification', id: 'LIST' }],
      transformResponse: (response) => response,
      keepUnusedDataFor: 120,
    }),

    getUnreadCount: builder.query({
      query: () => 'unread-count',
      providesTags: ['NotificationCount'],
      transformResponse: (response) => response.unreadCount,
      keepUnusedDataFor: 60,
    }),

    getCounts: builder.query({
      query: () => 'counts',
      providesTags: ['NotificationCount'],
      transformResponse: (response) => response,
      keepUnusedDataFor: 120,
    }),

    markAsRead: builder.mutation({
      query: (id) => ({
        url: `${id}/read`,
        method: 'PATCH'
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Notification', id },
        'NotificationCount'
      ],
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          notificationsApi.util.updateQueryData('getNotifications', undefined, (draft) => {
            const notification = draft.notifications?.find(n => n.id === id);
            if (notification) {
              notification.isRead = true;
            }
          })
        );

        const countPatch = dispatch(
          notificationsApi.util.updateQueryData('getCounts', undefined, (draft) => {
            if (draft.unread > 0) {
              draft.unread -= 1;
            }
          })
        );

        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
          countPatch.undo();
        }
      },
      transformResponse: (response) => response
    }),

    markAsUnread: builder.mutation({
      query: (id) => ({
        url: `${id}/unread`,
        method: 'PATCH'
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Notification', id },
        'NotificationCount'
      ],
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          notificationsApi.util.updateQueryData('getNotifications', undefined, (draft) => {
            const notification = draft.notifications?.find(n => n.id === id);
            if (notification) {
              notification.isRead = false;
            }
          })
        );

        const countPatch = dispatch(
          notificationsApi.util.updateQueryData('getCounts', undefined, (draft) => {
            draft.unread += 1;
          })
        );

        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
          countPatch.undo();
        }
      },
      transformResponse: (response) => response
    }),

    markAllAsRead: builder.mutation({
      query: () => ({
        url: 'mark-all-read',
        method: 'PATCH'
      }),
      invalidatesTags: [
        { type: 'Notification', id: 'LIST' },
        'NotificationCount'
      ],
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          notificationsApi.util.updateQueryData('getNotifications', undefined, (draft) => {
            if (draft.notifications) {
              draft.notifications.forEach(notification => {
                notification.isRead = true;
              });
            }
          })
        );

        const countPatch = dispatch(
          notificationsApi.util.updateQueryData('getCounts', undefined, (draft) => {
            draft.unread = 0;
          })
        );

        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
          countPatch.undo();
        }
      },
      transformResponse: (response) => response
    }),

    deleteNotification: builder.mutation({
      query: (id) => ({
        url: id,
        method: 'DELETE'
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Notification', id },
        { type: 'Notification', id: 'LIST' },
        'NotificationCount'
      ],
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          notificationsApi.util.updateQueryData('getNotifications', undefined, (draft) => {
            if (draft.notifications) {
              draft.notifications = draft.notifications.filter(n => n.id !== id);
              if (draft.pagination?.totalCount) {
                draft.pagination.totalCount -= 1;
              }
            }
          })
        );

        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
      transformResponse: (response) => response
    }),

    deleteAllRead: builder.mutation({
      query: () => ({
        url: 'read/all',
        method: 'DELETE'
      }),
      invalidatesTags: [
        { type: 'Notification', id: 'LIST' },
        'NotificationCount'
      ],
      transformResponse: (response) => response
    }),
  })
});

export const {
  useGetNotificationsQuery,
  useGetUnreadCountQuery,
  useGetCountsQuery,
  useMarkAsReadMutation,
  useMarkAsUnreadMutation,
  useMarkAllAsReadMutation,
  useDeleteNotificationMutation,
  useDeleteAllReadMutation,
} = notificationsApi;