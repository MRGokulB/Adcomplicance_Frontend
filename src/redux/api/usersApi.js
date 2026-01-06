import { createApi } from '@reduxjs/toolkit/query/react';
import { createBaseQuery } from './baseApi';

const baseQueryWithReauth = createBaseQuery(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/users/`);

export const usersApi = createApi({
  reducerPath: 'usersApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['User', 'Absence', 'Profile', 'Promotion'],

  keepUnusedDataFor: 10,
  refetchOnMountOrArgChange: true,
  refetchOnReconnect: true,
  refetchOnFocus: true,

  endpoints: (builder) => ({
    getCurrentUserProfile: builder.query({
      query: () => 'profile/me',
      providesTags: [{ type: 'Profile', id: 'CURRENT' }],
      transformResponse: (response) => response,
      keepUnusedDataFor: 30,
    }),

    updateCurrentUserProfile: builder.mutation({
      query: (userData) => ({
        url: 'profile/me',
        method: 'PUT',
        body: userData
      }),
      invalidatesTags: [
        { type: 'Profile', id: 'CURRENT' },
        { type: 'User', id: 'LIST' }
      ],
      transformResponse: (response) => response.user,
      async onQueryStarted(patch, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          usersApi.util.updateQueryData('getCurrentUserProfile', undefined, (draft) => {
            Object.assign(draft, patch);
          })
        );

        try {
          const { data: updatedUser } = await queryFulfilled;
          dispatch({
            type: 'auth/updateUser',
            payload: updatedUser
          });
        } catch {
          patchResult.undo();
        }
      }
    }),

    getUsers: builder.query({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        if (params.page) searchParams.append('page', params.page);
        if (params.limit) searchParams.append('limit', params.limit);
        if (params.search && params.search.trim()) searchParams.append('search', params.search.trim());
        if (params.role && params.role.trim()) searchParams.append('role', params.role.trim());
        if (params.isActive !== undefined && params.isActive !== '') searchParams.append('isActive', params.isActive);
        if (params.team && params.team.trim()) searchParams.append('team', params.team.trim());

        searchParams.append('_t', Date.now().toString());

        return `?${searchParams.toString()}`;
      },
      providesTags: (result) =>
        result?.users
          ? [
            ...result.users.map(({ id }) => ({ type: 'User', id })),
            { type: 'User', id: 'LIST' }
          ]
          : [{ type: 'User', id: 'LIST' }],
      transformResponse: (response) => ({
        users: response.users || [],
        pagination: response.pagination || {}
      }),
      keepUnusedDataFor: 10,
    }),

    getUserById: builder.query({
      query: (id) => `${id}?_t=${Date.now()}`,
      providesTags: (result, error, id) => [{ type: 'User', id }],
      transformResponse: (response) => response,
      keepUnusedDataFor: 30,
    }),

    createUser: builder.mutation({
      query: (userData) => ({
        url: '',
        method: 'POST',
        body: userData
      }),
      invalidatesTags: [{ type: 'User', id: 'LIST' }],
      transformResponse: (response) => response.user,
      transformErrorResponse: (response) => ({
        status: response.status,
        message: response.data?.message || 'Failed to create user',
        errors: response.data?.errors || {}
      })
    }),

    updateUser: builder.mutation({
      query: ({ id, ...userData }) => ({
        url: id,
        method: 'PUT',
        body: userData
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'User', id },
        { type: 'User', id: 'LIST' },
        { type: 'Promotion', id: 'ELIGIBLE' },
        { type: 'Profile', id: 'CURRENT' }
      ],
      transformResponse: (response) => ({
        user: response.user,
        changes: response.changes || null
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled, getState }) {
        const state = getState();
        const currentFilters = state.usersApi?.queries?.['getUsers(undefined)']?.originalArgs || {};

        const patchResult = dispatch(
          usersApi.util.updateQueryData('getUsers', currentFilters, (draft) => {
            const user = draft.users.find(u => u.id === id);
            if (user) {
              Object.assign(user, patch);
            }
          })
        );

        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      }
    }),

    promoteUser: builder.mutation({
      query: ({ id, newRole, reason }) => ({
        url: `${id}/promote`,
        method: 'POST',
        body: { newRole, reason }
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'User', id },
        { type: 'User', id: 'LIST' },
        { type: 'Promotion', id: 'ELIGIBLE' },
        { type: 'Profile', id: 'CURRENT' }
      ],
      transformResponse: (response) => ({
        user: response.user,
        changes: response.changes
      }),
      async onQueryStarted({ id, newRole }, { dispatch, queryFulfilled, getState }) {
        const state = getState();
        const currentFilters = state.usersApi?.queries?.['getUsers(undefined)']?.originalArgs || {};

        const patchResult = dispatch(
          usersApi.util.updateQueryData('getUsers', currentFilters, (draft) => {
            const user = draft.users.find(u => u.id === id);
            if (user) {
              user.role = newRole;
            }
          })
        );

        try {
          await queryFulfilled;
          dispatch(usersApi.util.invalidateTags([{ type: 'User', id: 'LIST' }]));
        } catch {
          patchResult.undo();
        }
      }
    }),

    resetUserPassword: builder.mutation({
      query: ({ id, newPassword }) => ({
        url: `${id}/reset-password`,
        method: 'POST',
        body: { newPassword }
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'User', id }],
      transformResponse: (response) => response.message
    }),

    getPromotionEligibleUsers: builder.query({
      query: () => `promotion/eligible?_t=${Date.now()}`,
      providesTags: [{ type: 'Promotion', id: 'ELIGIBLE' }],
      transformResponse: (response) => ({
        eligibleUsers: response.eligibleUsers || [],
        summary: response.summary || {}
      }),
      keepUnusedDataFor: 30,
    }),

    getAbsences: builder.query({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        if (params.page) searchParams.append('page', params.page);
        if (params.limit) searchParams.append('limit', params.limit);
        if (params.userId) searchParams.append('userId', params.userId);
        if (params.dateFrom) searchParams.append('dateFrom', params.dateFrom);
        if (params.dateTo) searchParams.append('dateTo', params.dateTo);
        searchParams.append('_t', Date.now().toString());

        return `absences?${searchParams.toString()}`;
      },
      providesTags: (result) =>
        result && Array.isArray(result)
          ? [
            ...result.map(({ id }) => ({ type: 'Absence', id })),
            { type: 'Absence', id: 'LIST' }
          ]
          : [{ type: 'Absence', id: 'LIST' }],
      transformResponse: (response) => response,
      keepUnusedDataFor: 30,
    }),

    createAbsence: builder.mutation({
      query: (absenceData) => ({
        url: 'absences',
        method: 'POST',
        body: absenceData
      }),
      invalidatesTags: [{ type: 'Absence', id: 'LIST' }],
      transformResponse: (response) => response.absence,
      async onQueryStarted(newAbsence, { dispatch, queryFulfilled, getState }) {
        const { auth } = getState();
        const tempAbsence = {
          id: Date.now(),
          ...newAbsence,
          createdAt: new Date().toISOString(),
          createdBy: auth.user,
          isOptimistic: true
        };

        const patchResult = dispatch(
          usersApi.util.updateQueryData('getAbsences', undefined, (draft) => {
            if (Array.isArray(draft)) {
              draft.unshift(tempAbsence);
            }
          })
        );

        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      }
    }),

    deleteAbsence: builder.mutation({
      query: (id) => ({
        url: `absences/${id}`,
        method: 'DELETE'
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Absence', id },
        { type: 'Absence', id: 'LIST' }
      ],
      transformResponse: (response) => response.message,
      async onQueryStarted(id, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          usersApi.util.updateQueryData('getAbsences', undefined, (draft) => {
            if (Array.isArray(draft)) {
              const index = draft.findIndex(absence => absence.id === id);
              if (index !== -1) {
                draft.splice(index, 1);
              }
            }
          })
        );

        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      }
    }),
  })
});

export const {
  useGetCurrentUserProfileQuery,
  useUpdateCurrentUserProfileMutation,
  useGetUsersQuery,
  useGetUserByIdQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  usePromoteUserMutation,
  useResetUserPasswordMutation,
  useGetPromotionEligibleUsersQuery,
  useGetAbsencesQuery,
  useCreateAbsenceMutation,
  useDeleteAbsenceMutation,
} = usersApi;