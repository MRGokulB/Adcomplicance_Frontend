// src/redux/api/authApi.js
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { logout, setCredentials } from '../slices/authSlice'
import { getCsrfTokenFromCookie } from '../../utils/csrf'

const apiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/`
console.log('Auth API Base URL:', apiUrl)

const baseQuery = fetchBaseQuery({
  baseUrl: apiUrl,
  credentials: 'include', // Important for session cookies
  prepareHeaders: (headers, { getState }) => {
    // Get token from auth state (for JWT-based auth if needed)
    const token = getState().auth.token;
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    
    // Add CSRF token from Redux state or cookie
    const csrfToken = getState().csrf.token || getCsrfTokenFromCookie();
    if (csrfToken) {
      headers.set('X-CSRF-Token', csrfToken);
    }
    
    return headers;
  },
})

const baseQueryWithReauth = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions);
   
  // Handle 401 unauthorized responses
  if (result?.error?.status === 401) {
    api.dispatch(logout());
  }
  
  // Handle 403 CSRF token errors - refresh token and retry
  if (result?.error?.status === 403 && result?.error?.data?.message?.includes('CSRF')) {
    console.log('🔄 CSRF token invalid, fetching new token...');
    
    // Fetch new CSRF token
    try {
      const csrfResponse = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/csrf-token`,
        { credentials: 'include' }
      );
      
      if (csrfResponse.ok) {
        const data = await csrfResponse.json();
        // Token is now in cookie, update Redux state
        const { setCsrfToken } = await import('../slices/csrfSlice');
        const tokenFromCookie = getCsrfTokenFromCookie();
        if (tokenFromCookie) {
          api.dispatch(setCsrfToken(tokenFromCookie));
          console.log('✅ New CSRF token fetched from cookie, retrying request...');
        } else {
          api.dispatch(setCsrfToken(data.csrfToken));
          console.log('✅ New CSRF token fetched from response, retrying request...');
        }
        
        // Retry the original request with new token
        result = await baseQuery(args, api, extraOptions);
      }
    } catch (error) {
      console.error('❌ Failed to refresh CSRF token:', error);
    }
  }
  
  return result;
};

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Auth', 'User'],
  endpoints: (builder) => ({
    login: builder.mutation({
      query: (credentials) => ({
        url: 'login',
        method: 'POST',
        body: credentials,
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          console.log('Login successful:', data)
          dispatch(setCredentials({
            user: data.user,
            rememberMe: arg.rememberMe || false
          }))
        } catch (error) {
          console.error('Login failed:', error)
        }
      },
      invalidatesTags: ['Auth'],
    }),

    register: builder.mutation({
      query: (userData) => ({
        url: 'register',
        method: 'POST',
        body: userData,
      }),
      transformResponse: (response) => response.user,
      invalidatesTags: ['Auth'],
    }),

    getCurrentUser: builder.query({
      query: () => 'me',
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          dispatch(setCredentials({ user: data.user }))
        } catch (error) {
          console.error('Get current user failed:', error)
          dispatch(logout())
        }
      },
      providesTags: ['Auth'],
    }),

    changePassword: builder.mutation({
      query: (passwordData) => ({
        url: 'change-password',
        method: 'POST',
        body: passwordData,
      }),
      transformResponse: (response) => response.message,
    }),

    logoutUser: builder.mutation({
      query: () => ({
        url: 'logout',
        method: 'POST',
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled
        } catch (error) {
          console.error('Logout API call failed:', error)
        } finally {
          dispatch(logout())
        }
      },
      invalidatesTags: ['Auth'],
    }),
  }),
})

export const {
  useLoginMutation,
  useRegisterMutation,
  useGetCurrentUserQuery,
  useChangePasswordMutation,
  useLogoutUserMutation,
} = authApi