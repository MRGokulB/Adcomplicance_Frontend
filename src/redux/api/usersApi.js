// src/redux/api/usersApi.js
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const baseQuery = fetchBaseQuery({
  baseUrl: `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/users/`,
  credentials: 'include', // Important for session cookies
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
    console.log('Token expired, redirecting to login...');
    api.dispatch({ type: 'auth/logout' });
  }
  
  // Handle 403 CSRF token errors - refresh token and retry
  if (result?.error?.status === 403 && result?.error?.data?.message?.includes('CSRF')) {
    console.log('🔄 CSRF token invalid, fetching new token...');
    
    try {
      const csrfResponse = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/csrf-token`,
        { credentials: 'include' }
      );
      
      if (csrfResponse.ok) {
        const data = await csrfResponse.json();
        window.csrfToken = data.csrfToken;
        console.log('✅ New CSRF token fetched, retrying request...');
        
        // Retry the original request with new token
        result = await baseQuery(args, api, extraOptions);
      }
    } catch (error) {
      console.error('❌ Failed to refresh CSRF token:', error);
    }
  }
  
  return result;
};
 
export const usersApi = createApi({
  reducerPath: 'usersApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['User', 'Absence', 'Profile', 'Promotion'],
  
  // OPTIMIZED: Default cache retention
  keepUnusedDataFor: 300, // 5 minutes default
  refetchOnMountOrArgChange: 300,
  
  endpoints: (builder) => ({
    // OPTIMIZED: Current user profile with longer cache
    getCurrentUserProfile: builder.query({
      query: () => 'profile/me',
      providesTags: [{ type: 'Profile', id: 'CURRENT' }],
      transformResponse: (response) => response,
      keepUnusedDataFor: 600, // 10 minutes - rarely changes
    }),

    // OPTIMIZED: Update profile with optimistic update
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
        // Optimistic update
        const patchResult = dispatch(
          usersApi.util.updateQueryData('getCurrentUserProfile', undefined, (draft) => {
            Object.assign(draft, patch);
          })
        );

        try {
          const { data: updatedUser } = await queryFulfilled;
          // Update auth slice with new user data
          dispatch({ 
            type: 'auth/updateUser', 
            payload: updatedUser 
          });
        } catch {
          patchResult.undo();
        }
      }
    }),

    // OPTIMIZED: Enhanced user listing with specific tags
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
      // OPTIMIZED: Provide specific tags for each user
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
      keepUnusedDataFor: 300, // 5 minutes
    }),

    // OPTIMIZED: Get user by ID with longer cache
    getUserById: builder.query({
      query: (id) => id,
      providesTags: (result, error, id) => [{ type: 'User', id }],
      transformResponse: (response) => response,
      keepUnusedDataFor: 600, // 10 minutes - user details don't change often
    }),

    // OPTIMIZED: Create user with better error handling
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

    // OPTIMIZED: Update user with optimistic update
    // FIXED: Update user with optimistic update for BOTH detail and list
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
    // Optimistic update for getUserById
    const patchDetail = dispatch(
      usersApi.util.updateQueryData('getUserById', id, (draft) => {
        Object.assign(draft, patch);
      })
    );

    // FIXED: Optimistic update for getUsers list
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

// FIXED: Promote user with optimistic update for BOTH detail and list
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
    // Optimistic update for getUserById
    const patchDetail = dispatch(
      usersApi.util.updateQueryData('getUserById', id, (draft) => {
        draft.role = newRole;
        draft.updatedAt = new Date().toISOString();
      })
    );

    // FIXED: Optimistic update for getUsers list
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

    // Reset user password - no optimistic update needed
    resetUserPassword: builder.mutation({
      query: ({ id, newPassword }) => ({
        url: `${id}/reset-password`,
        method: 'POST',
        body: { newPassword }
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'User', id }],
      transformResponse: (response) => response.message
    }),

    // OPTIMIZED: Get promotion eligible users with longer cache
    getPromotionEligibleUsers: builder.query({
      query: () => 'promotion/eligible',
      providesTags: [{ type: 'Promotion', id: 'ELIGIBLE' }],
      transformResponse: (response) => ({
        eligibleUsers: response.eligibleUsers || [],
        summary: response.summary || {}
      }),
      keepUnusedDataFor: 600, // 10 minutes - doesn't change frequently
    }),

    // OPTIMIZED: Enhanced absence management with specific tags
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
      // OPTIMIZED: Provide specific tags for each absence
      providesTags: (result) =>
        result && Array.isArray(result)
          ? [
              ...result.map(({ id }) => ({ type: 'Absence', id })),
              { type: 'Absence', id: 'LIST' }
            ]
          : [{ type: 'Absence', id: 'LIST' }],
      transformResponse: (response) => response,
      keepUnusedDataFor: 300, // 5 minutes
    }),

    // OPTIMIZED: Create absence with optimistic update
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

        // Optimistic addition
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

    // OPTIMIZED: Delete absence with optimistic removal
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