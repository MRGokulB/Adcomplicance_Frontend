// src/redux/api/systemApi.js - Session-based (public endpoints)
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { refreshCsrfToken } from './csrfRefreshHandler';

const baseQuery = fetchBaseQuery({
  baseUrl: `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/`,
  credentials: 'include',
  prepareHeaders: (headers, { getState }) => {
    // Add auth token if available
    const token = getState().auth?.token;
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }

    // FIXED: Read CSRF token from Redux state
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
    console.log('🔄 CSRF token invalid in tasksApi, refreshing...');

    const success = await refreshCsrfToken(api);

    if (success) {
      result = await baseQuery(args, api, extraOptions);
    }
  }

  return result;
};

export const systemApi = createApi({
  reducerPath: 'systemApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['SystemStatus'],
  endpoints: (builder) => ({
    // Get system status - public endpoint
    getSystemStatus: builder.query({
      query: () => 'system/status',
      providesTags: ['SystemStatus'],
      transformResponse: (response) => response,
      keepUnusedDataFor: 60, // 1 minute
    }),

    // Get API info - public endpoint (root endpoint)
    getApiInfo: builder.query({
      query: () => '',
      transformResponse: (response) => response,
      keepUnusedDataFor: 3600, // 1 hour - rarely changes
    }),

    // Get simple API status - public endpoint
    getApiStatus: builder.query({
      query: () => 'status',
      transformResponse: (response) => response,
      keepUnusedDataFor: 60,
    }),

    // Health check endpoint
    getHealthCheck: builder.query({
      query: () => 'health',
      transformResponse: (response) => response,
      keepUnusedDataFor: 30, // 30 seconds
    }),
  })
});

export const {
  useGetSystemStatusQuery,
  useGetApiInfoQuery,
  useGetApiStatusQuery,
  useGetHealthCheckQuery,
} = systemApi;