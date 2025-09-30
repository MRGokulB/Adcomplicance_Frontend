// src/redux/api/notificationsApi.js - Session-based with CSRF
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const baseQuery = fetchBaseQuery({
  baseUrl: `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/notifications/`,
  credentials: 'include', // Send session cookies
  prepareHeaders: (headers) => {
    // No Authorization header needed - using sessions
    headers.set('Content-Type', 'application/json');
    return headers;
  }
});

const baseQueryWithReauth = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions);
  if (result?.error?.status === 401) {
    console.log('Session expired, redirecting to login...');
    api.dispatch({ type: 'auth/logout' });
  }
  return result;
};

export const notificationsApi = createApi({
  reducerPath: 'notificationsApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Notification'],
  keepUnusedDataFor: 60, // 1 minute cache for notifications (they should be fresh)
  endpoints: (builder) => ({
    // Get notifications with pagination and filters
    getNotifications: builder.query({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        if (params.page) searchParams.append('page', params.page);
        if (params.limit) searchParams.append('limit', params.limit);
        if (params.isRead !== undefined) searchParams.append('isRead', params.isRead);
        return `?${searchParams.toString()}`;
      },
      providesTags: ['Notification'],
      transformResponse: (response) => response,
      keepUnusedDataFor: 60, // Fresh notification data
    }),

    // Get unread count
    getUnreadCount: builder.query({
      query: () => 'unread-count',
      providesTags: ['Notification'],
      transformResponse: (response) => response.unreadCount,
      keepUnusedDataFor: 30, // 30 seconds - frequently updated
    }),

    // Get counts summary (total, unread, read)
    getCounts: builder.query({
      query: () => 'counts',
      providesTags: ['Notification'],
      transformResponse: (response) => response,
      keepUnusedDataFor: 60,
    }),

    // Mark notification as read
    markAsRead: builder.mutation({
      query: (id) => ({
        url: `${id}/read`,
        method: 'PATCH'
      }),
      invalidatesTags: ['Notification'],
      // Optimistic update
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          notificationsApi.util.updateQueryData('getNotifications', undefined, (draft) => {
            const notification = draft.notifications?.find(n => n.id === id);
            if (notification) {
              notification.isRead = true;
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

    // Mark notification as unread
    markAsUnread: builder.mutation({
      query: (id) => ({
        url: `${id}/unread`,
        method: 'PATCH'
      }),
      invalidatesTags: ['Notification'],
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          notificationsApi.util.updateQueryData('getNotifications', undefined, (draft) => {
            const notification = draft.notifications?.find(n => n.id === id);
            if (notification) {
              notification.isRead = false;
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

    // Mark all as read
    markAllAsRead: builder.mutation({
      query: () => ({
        url: 'mark-all-read',
        method: 'PATCH'
      }),
      invalidatesTags: ['Notification'],
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
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
      transformResponse: (response) => response
    }),

    // Delete notification
    deleteNotification: builder.mutation({
      query: (id) => ({
        url: id,
        method: 'DELETE'
      }),
      invalidatesTags: ['Notification'],
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          notificationsApi.util.updateQueryData('getNotifications', undefined, (draft) => {
            if (draft.notifications) {
              draft.notifications = draft.notifications.filter(n => n.id !== id);
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

    // Delete all read notifications
    deleteAllRead: builder.mutation({
      query: () => ({
        url: 'read/all',
        method: 'DELETE'
      }),
      invalidatesTags: ['Notification'],
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