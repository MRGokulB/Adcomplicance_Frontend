import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { refreshCsrfToken } from './csrfRefreshHandler';

const baseQuery = fetchBaseQuery({
  baseUrl: `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/users/`,
  credentials: 'include',
  prepareHeaders: (headers, { getState }) => {
    const token = getState().auth.token;
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }

    const csrfToken = getState().csrf?.token;
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
  
  if (result?.error?.status === 403 && result?.error?.data?.message?.includes('CSRF')) {    
    
    const success = await refreshCsrfToken(api);
    
    if (success) {
      result = await baseQuery(args, api, extraOptions);
    }
  }
  
  return result;
};

export const usersApi = createApi({
  reducerPath: 'usersApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['User', 'Absence', 'Profile', 'Promotion'],

  keepUnusedDataFor: 300,  
  refetchOnMountOrArgChange: 300,

  endpoints: (builder) => ({
    getCurrentUserProfile: builder.query({
      query: () => 'profile/me',
      providesTags: [{ type: 'Profile', id: 'CURRENT' }],
      transformResponse: (response) => response,
      keepUnusedDataFor: 600,  
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
      keepUnusedDataFor: 300,  
    }),

    getUserById: builder.query({
      query: (id) => id,
      providesTags: (result, error, id) => [{ type: 'User', id }],
      transformResponse: (response) => response,
      keepUnusedDataFor: 600, 
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
        { type: 'Promotion', id: 'ELIGIBLE' }
      ],
      transformResponse: (response) => ({
        user: response.user,
        changes: response.changes || null
      }),
      async onQueryStarted({ id, ...patch }, { dispatch, queryFulfilled }) {
        const patchDetail = dispatch(
          usersApi.util.updateQueryData('getUserById', id, (draft) => {
            Object.assign(draft, patch);
          })
        );

        const patchList = dispatch(
          usersApi.util.updateQueryData('getUsers', undefined, (draft) => {
            const userIndex = draft.users?.findIndex(u => u.id === id);
            if (userIndex !== -1 && draft.users) {
              Object.assign(draft.users[userIndex], patch);
            }
          })
        );

        try {
          await queryFulfilled;
        } catch {
          patchDetail.undo();
          patchList.undo();
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
        { type: 'Promotion', id: 'ELIGIBLE' }
      ],
      transformResponse: (response) => ({
        user: response.user,
        changes: response.changes
      }),
      async onQueryStarted({ id, newRole }, { dispatch, queryFulfilled }) {
        const patchDetail = dispatch(
          usersApi.util.updateQueryData('getUserById', id, (draft) => {
            draft.role = newRole;
            draft.updatedAt = new Date().toISOString();
          })
        );

        const patchList = dispatch(
          usersApi.util.updateQueryData('getUsers', undefined, (draft) => {
            const userIndex = draft.users?.findIndex(u => u.id === id);
            if (userIndex !== -1 && draft.users) {
              draft.users[userIndex].role = newRole;
              draft.users[userIndex].updatedAt = new Date().toISOString();
            }
          })
        );

        try {
          await queryFulfilled;
        } catch {
          patchDetail.undo();
          patchList.undo();
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
      query: () => 'promotion/eligible',
      providesTags: [{ type: 'Promotion', id: 'ELIGIBLE' }],
      transformResponse: (response) => ({
        eligibleUsers: response.eligibleUsers || [],
        summary: response.summary || {}
      }),
      keepUnusedDataFor: 600,  
    }),

    getAbsences: builder.query({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        if (params.page) searchParams.append('page', params.page);
        if (params.limit) searchParams.append('limit', params.limit);
        if (params.userId) searchParams.append('userId', params.userId);
        if (params.dateFrom) searchParams.append('dateFrom', params.dateFrom);
        if (params.dateTo) searchParams.append('dateTo', params.dateTo);

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
      keepUnusedDataFor: 300,  
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
        // Optimistic removal
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