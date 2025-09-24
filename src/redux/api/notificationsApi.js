// src/redux/api/notificationsApi.js - Updated for new backend structure
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const baseQuery = fetchBaseQuery({
  baseUrl: `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/notifications/`,
  prepareHeaders: (headers, { getState }) => {
    const token = getState().auth.token;
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    return headers;
  }
});

const baseQueryWithReauth = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions);
  if (result?.error?.status === 401) {
    api.dispatch({ type: 'auth/logout' });
  }
  return result;
};

export const notificationsApi = createApi({
  reducerPath: 'notificationsApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Notification'],
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
      transformResponse: (response) => response
    }),

    // Get unread count
    getUnreadCount: builder.query({
      query: () => 'unread-count',
      providesTags: ['Notification'],
      transformResponse: (response) => response.unreadCount
    }),

    // Get counts summary (total, unread, read)
    getCounts: builder.query({
      query: () => 'counts',
      providesTags: ['Notification'],
      transformResponse: (response) => response
    }),

    // Mark notification as read
    markAsRead: builder.mutation({
      query: (id) => ({
        url: `${id}/read`,
        method: 'PATCH'
      }),
      invalidatesTags: ['Notification'],
      transformResponse: (response) => response
    }),

    // Mark notification as unread
    markAsUnread: builder.mutation({
      query: (id) => ({
        url: `${id}/unread`,
        method: 'PATCH'
      }),
      invalidatesTags: ['Notification'],
      transformResponse: (response) => response
    }),

    // Mark all as read
    markAllAsRead: builder.mutation({
      query: () => ({
        url: 'mark-all-read',
        method: 'PATCH'
      }),
      invalidatesTags: ['Notification'],
      transformResponse: (response) => response
    }),

    // Delete notification
    deleteNotification: builder.mutation({
      query: (id) => ({
        url: id,
        method: 'DELETE'
      }),
      invalidatesTags: ['Notification'],
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