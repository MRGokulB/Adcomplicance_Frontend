// src/redux/api/authApi.js
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { logout, setCredentials } from '../slices/authSlice'

const apiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/`
console.log('Auth API Base URL:', apiUrl)

const baseQuery = fetchBaseQuery({
  baseUrl: apiUrl,
  credentials: 'include', // Important for session cookies
  prepareHeaders: (headers) => {
    // Remove Authorization header - using sessions now
    headers.set('Content-Type', 'application/json')
    return headers
  },
})

const baseQueryWithReauth = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions)
   
  if (result?.error?.status === 401) {
    api.dispatch(logout())
  }
  
  return result
}

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