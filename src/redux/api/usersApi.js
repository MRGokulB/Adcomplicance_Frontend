import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const baseQuery = fetchBaseQuery({
  baseUrl: `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/users/`,
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
    console.log('Token expired, redirecting to login...');
    api.dispatch({ type: 'auth/logout' });
  }
  return result;
};

export const usersApi = createApi({
  reducerPath: 'usersApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['User', 'Absence', 'Profile', 'Promotion'],
  endpoints: (builder) => ({
    // Current user profile - Updated to match new response structure
    getCurrentUserProfile: builder.query({
      query: () => 'profile/me',
      providesTags: [{ type: 'Profile', id: 'CURRENT' }],
      transformResponse: (response) => response // Response is already the user object
    }),

    // Update current user profile - Updated
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
          // Update auth slice with new user data
          dispatch({ 
            type: 'auth/updateUser', 
            payload: updatedUser 
          });
        } catch (error) {
          console.error('Profile update failed:', error);
        }
      }
    }),

    // Enhanced user listing - Updated to match new pagination structure
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
      transformResponse: (response) => {
        return {
          users: response.users || [],
          pagination: response.pagination || {}
        };
      }
    }),

    // Get user by ID - Updated to include new fields
    getUserById: builder.query({
      query: (id) => id,
      providesTags: (result, error, id) => [{ type: 'User', id }],
      transformResponse: (response) => response // Response is already the user object with canBePromoted, canBeModified
    }),

    // Create user - Updated error handling
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

    // Update user - Updated to handle role changes
    updateUser: builder.mutation({
      query: ({ id, ...userData }) => ({
        url: id,
        method: 'PUT',
        body: userData
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'User', id },
        { type: 'User', id: 'LIST' },
        { type: 'Promotion', id: 'ELIGIBLE' } // Invalidate promotion list
      ],
      transformResponse: (response) => ({
        user: response.user,
        changes: response.changes || null
      })
    }),

    // NEW: Promote user endpoint
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

    // Reset user password - Updated
    resetUserPassword: builder.mutation({
      query: ({ id, newPassword }) => ({
        url: `${id}/reset-password`,
        method: 'POST',
        body: { newPassword }
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'User', id }],
      transformResponse: (response) => response.message
    }),

    // NEW: Get promotion eligible users
    getPromotionEligibleUsers: builder.query({
      query: () => 'promotion/eligible',
      providesTags: [{ type: 'Promotion', id: 'ELIGIBLE' }],
      transformResponse: (response) => ({
        eligibleUsers: response.eligibleUsers || [],
        summary: response.summary || {}
      })
    }),

    // Enhanced absence management - Updated to match new structure
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
      transformResponse: (response) => response // Response is already an array of absences
    }),

    // Create absence - Updated
    createAbsence: builder.mutation({
      query: (absenceData) => ({
        url: 'absences',
        method: 'POST',
        body: absenceData
      }),
      invalidatesTags: [{ type: 'Absence', id: 'LIST' }],
      transformResponse: (response) => response.absence
    }),

    // Delete absence - Updated to match new URL structure
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
  usePromoteUserMutation, // NEW
  useResetUserPasswordMutation,
  useGetPromotionEligibleUsersQuery, // NEW
  useGetAbsencesQuery,
  useCreateAbsenceMutation,
  useDeleteAbsenceMutation,
} = usersApi;