import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { logout, setCredentials } from '../slices/authSlice'

// Debug: Log the API URL being used
const apiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/`
console.log('Auth API Base URL:', apiUrl)

const baseQuery = fetchBaseQuery({
  baseUrl: apiUrl,
  prepareHeaders: (headers, { getState }) => {
    // Get token from auth state
    const token = getState().auth.token
    if (token) {
      headers.set('authorization', `Bearer ${token}`)
    }
    // Debug: Log headers
    console.log('API Headers:', Object.fromEntries(headers.entries()))
    return headers
  },
})

// Wrapper to handle token expiration and add debugging
const baseQueryWithReauth = async (args, api, extraOptions) => {
  console.log('API Request:', args, 'to', apiUrl)
  let result = await baseQuery(args, api, extraOptions)
  console.log('API Response:', result)
  
  // Handle 401 unauthorized responses
  if (result?.error?.status === 401) {
    console.log('Token expired, logging out...')
    api.dispatch(logout())
  }
  
  return result
}

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Auth', 'User'],
  endpoints: (builder) => ({
    // Login mutation - Updated to match new response structure
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
          // Store credentials in Redux state with rememberMe from request
          dispatch(setCredentials({
            user: data.user,
            token: data.token,
            rememberMe: arg.rememberMe || false
          }))
        } catch (error) {
          console.error('Login failed:', error)
        }
      },
      invalidatesTags: ['Auth'],
    }),

    // Register mutation - Updated to match new response structure
    register: builder.mutation({
      query: (userData) => ({
        url: 'register',
        method: 'POST',
        body: userData,
      }),
      transformResponse: (response) => response.user,
      invalidatesTags: ['Auth'],
    }),

    // Refresh token query - Updated to match new endpoint
    refreshToken: builder.mutation({
      query: () => ({
        url: 'refresh',
        method: 'POST',
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled
          dispatch(setCredentials({
            user: data.user,
            token: data.token
          }))
        } catch (error) {
          console.error('Token refresh failed:', error)
          dispatch(logout())
        }
      },
      invalidatesTags: ['Auth'],
    }),

    // Change password mutation - Updated endpoint
    changePassword: builder.mutation({
      query: (passwordData) => ({
        url: 'change-password',
        method: 'POST',
        body: passwordData,
      }),
      transformResponse: (response) => response.message,
    }),

    // Logout mutation - Updated to match new response
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
          // Always clear local state regardless of API call success
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
  useRefreshTokenMutation, // Changed from Query to Mutation
  useChangePasswordMutation,
  useLogoutUserMutation,
} = authApi