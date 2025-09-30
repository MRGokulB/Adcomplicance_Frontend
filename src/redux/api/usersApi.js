// src/redux/api/usersApi.js
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const baseQuery = fetchBaseQuery({
  baseUrl: `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/users/`,
  credentials: 'include', // Important for session cookies
  prepareHeaders: (headers) => {
    // No Authorization header needed - using sessions
    headers.set('Content-Type', 'application/json')
    return headers
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

export const usersApi = createApi({
  reducerPath: 'usersApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['User', 'Absence', 'Profile', 'Promotion'],
  endpoints: (builder) => ({
    getCurrentUserProfile: builder.query({
      query: () => 'profile/me',
      providesTags: [{ type: 'Profile', id: 'CURRENT' }],
      transformResponse: (response) => response
    }),

    updateCurrentUserProfile: builder.mutation({
      query: (userData) => ({
        url: 'profile/me',
        method: 'PUT',
        body: userData
      }),
      invalidatesTags: [{ type: 'Profile', id: 'CURRENT' }, { type: 'User', id: 'LIST' }],
      transformResponse: (response) => response.user,
      async onQueryStarted(patch, { dispatch, queryFulfilled }) {
        try {
          const { data: updatedUser } = await queryFulfilled;
          dispatch({ 
            type: 'auth/updateUser', 
            payload: updatedUser 
          });
        } catch (error) {
          console.error('Profile update failed:', error);
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
      })
    }),

    getUserById: builder.query({
      query: (id) => id,
      providesTags: (result, error, id) => [{ type: 'User', id }],
      transformResponse: (response) => response
    }),

    createUser: builder.mutation({
      query: (userData) => ({
        url: '',
        method: 'POST',
        body: userData
      }),
      invalidatesTags: [{ type: 'User', id: 'LIST' }],
      transformResponse: (response) => response.user,
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
      })
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
      })
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
      })
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
      transformResponse: (response) => response
    }),

    createAbsence: builder.mutation({
      query: (absenceData) => ({
        url: 'absences',
        method: 'POST',
        body: absenceData
      }),
      invalidatesTags: [{ type: 'Absence', id: 'LIST' }],
      transformResponse: (response) => response.absence
    }),

    deleteAbsence: builder.mutation({
      query: (id) => ({
        url: `absences/${id}`,
        method: 'DELETE'
      }),
      invalidatesTags: [{ type: 'Absence', id: 'LIST' }],
      transformResponse: (response) => response.message
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