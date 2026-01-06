import { createApi } from '@reduxjs/toolkit/query/react'
import { logout, setCredentials } from '../slices/authSlice'
import { createBaseQuery } from './baseApi'

const apiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/`

const baseQueryWithReauth = createBaseQuery(apiUrl);

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
          // Suppress 401 errors as they are expected when session is invalid/expired
          if (error?.error?.status !== 401) {
            console.error('Get current user failed:', error);
          }
          dispatch(logout());
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
      invalidatesTags: [], // Don't trigger refetch of user details since we are logging out
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