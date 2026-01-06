import { createApi } from '@reduxjs/toolkit/query/react';
import { createBaseQuery } from './baseApi';

const baseQueryWithReauth = createBaseQuery(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/notifications/`);

export const notificationsApi = createApi({
  reducerPath: 'notificationsApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Notification', 'NotificationCount'],

  keepUnusedDataFor: 10,
  refetchOnMountOrArgChange: true,
  refetchOnReconnect: true,
  refetchOnFocus: true,

  endpoints: (builder) => ({
    getNotifications: builder.query({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        if (params.page) searchParams.append('page', params.page);
        if (params.limit) searchParams.append('limit', params.limit);
        if (params.isRead !== undefined) searchParams.append('isRead', params.isRead);

        searchParams.append('_t', Date.now().toString());

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
      keepUnusedDataFor: 10,
    }),

    getUnreadCount: builder.query({
      query: () => `unread-count?_t=${Date.now()}`,
      providesTags: ['NotificationCount'],
      transformResponse: (response) => response.unreadCount,
      keepUnusedDataFor: 10,
    }),

    getCounts: builder.query({
      query: () => `counts?_t=${Date.now()}`,
      providesTags: ['NotificationCount'],
      transformResponse: (response) => response,
      keepUnusedDataFor: 10,
    }),

    markAsRead: builder.mutation({
      query: (id) => ({
        url: `${id}/read`,
        method: 'PATCH'
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Notification', id },
        { type: 'Notification', id: 'LIST' },
        'NotificationCount'
      ],
      async onQueryStarted(id, { dispatch, queryFulfilled, getState }) {
        const state = getState();

        const patches = [];

        Object.keys(state.notificationsApi?.queries || {}).forEach(queryKey => {
          if (queryKey.startsWith('getNotifications')) {
            const query = state.notificationsApi.queries[queryKey];
            if (query?.data?.notifications) {
              const patchResult = dispatch(
                notificationsApi.util.updateQueryData(
                  'getNotifications',
                  query.originalArgs,
                  (draft) => {
                    const notification = draft.notifications?.find(n => n.id === id);
                    if (notification) {
                      notification.isRead = true;
                    }
                    if (draft.unreadCount > 0) {
                      draft.unreadCount -= 1;
                    }
                  }
                )
              );
              patches.push(patchResult);
            }
          }
        });

        const countPatch = dispatch(
          notificationsApi.util.updateQueryData('getCounts', undefined, (draft) => {
            if (draft.unread > 0) {
              draft.unread -= 1;
            }
          })
        );
        patches.push(countPatch);

        const unreadCountPatch = dispatch(
          notificationsApi.util.updateQueryData('getUnreadCount', undefined, (draft) => {
            return Math.max(0, draft - 1);
          })
        );
        patches.push(unreadCountPatch);

        try {
          await queryFulfilled;
        } catch {
          patches.forEach(patch => patch.undo());
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
        { type: 'Notification', id: 'LIST' },
        'NotificationCount'
      ],
      async onQueryStarted(id, { dispatch, queryFulfilled, getState }) {
        const state = getState();
        const patches = [];

        Object.keys(state.notificationsApi?.queries || {}).forEach(queryKey => {
          if (queryKey.startsWith('getNotifications')) {
            const query = state.notificationsApi.queries[queryKey];
            if (query?.data?.notifications) {
              const patchResult = dispatch(
                notificationsApi.util.updateQueryData(
                  'getNotifications',
                  query.originalArgs,
                  (draft) => {
                    const notification = draft.notifications?.find(n => n.id === id);
                    if (notification) {
                      notification.isRead = false;
                    }
                    if (draft.unreadCount !== undefined) {
                      draft.unreadCount += 1;
                    }
                  }
                )
              );
              patches.push(patchResult);
            }
          }
        });

        const countPatch = dispatch(
          notificationsApi.util.updateQueryData('getCounts', undefined, (draft) => {
            draft.unread += 1;
          })
        );
        patches.push(countPatch);

        const unreadCountPatch = dispatch(
          notificationsApi.util.updateQueryData('getUnreadCount', undefined, (draft) => {
            return draft + 1;
          })
        );
        patches.push(unreadCountPatch);

        try {
          await queryFulfilled;
        } catch {
          patches.forEach(patch => patch.undo());
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
      async onQueryStarted(arg, { dispatch, queryFulfilled, getState }) {
        const state = getState();
        const patches = [];

        Object.keys(state.notificationsApi?.queries || {}).forEach(queryKey => {
          if (queryKey.startsWith('getNotifications')) {
            const query = state.notificationsApi.queries[queryKey];
            if (query?.data?.notifications) {
              const patchResult = dispatch(
                notificationsApi.util.updateQueryData(
                  'getNotifications',
                  query.originalArgs,
                  (draft) => {
                    if (draft.notifications) {
                      draft.notifications.forEach(notification => {
                        notification.isRead = true;
                      });
                      draft.unreadCount = 0;
                    }
                  }
                )
              );
              patches.push(patchResult);
            }
          }
        });

        const countPatch = dispatch(
          notificationsApi.util.updateQueryData('getCounts', undefined, (draft) => {
            draft.unread = 0;
          })
        );
        patches.push(countPatch);

        const unreadCountPatch = dispatch(
          notificationsApi.util.updateQueryData('getUnreadCount', undefined, () => 0)
        );
        patches.push(unreadCountPatch);

        try {
          await queryFulfilled;
        } catch {
          patches.forEach(patch => patch.undo());
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
      async onQueryStarted(id, { dispatch, queryFulfilled, getState }) {
        const state = getState();
        const patches = [];

        let wasUnread = false;

        Object.keys(state.notificationsApi?.queries || {}).forEach(queryKey => {
          if (queryKey.startsWith('getNotifications')) {
            const query = state.notificationsApi.queries[queryKey];
            if (query?.data?.notifications) {
              const patchResult = dispatch(
                notificationsApi.util.updateQueryData(
                  'getNotifications',
                  query.originalArgs,
                  (draft) => {
                    if (draft.notifications) {
                      const notification = draft.notifications.find(n => n.id === id);
                      if (notification && !notification.isRead) {
                        wasUnread = true;
                      }
                      draft.notifications = draft.notifications.filter(n => n.id !== id);
                      if (draft.pagination?.totalCount) {
                        draft.pagination.totalCount -= 1;
                      }
                      if (wasUnread && draft.unreadCount > 0) {
                        draft.unreadCount -= 1;
                      }
                    }
                  }
                )
              );
              patches.push(patchResult);
            }
          }
        });

        if (wasUnread) {
          const countPatch = dispatch(
            notificationsApi.util.updateQueryData('getCounts', undefined, (draft) => {
              if (draft.unread > 0) draft.unread -= 1;
              if (draft.total > 0) draft.total -= 1;
            })
          );
          patches.push(countPatch);

          const unreadCountPatch = dispatch(
            notificationsApi.util.updateQueryData('getUnreadCount', undefined, (draft) => {
              return Math.max(0, draft - 1);
            })
          );
          patches.push(unreadCountPatch);
        }

        try {
          await queryFulfilled;
        } catch {
          patches.forEach(patch => patch.undo());
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