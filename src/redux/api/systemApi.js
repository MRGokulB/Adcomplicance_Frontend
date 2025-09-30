// src/redux/api/systemApi.js - Session-based (public endpoints)
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const baseQuery = fetchBaseQuery({
  baseUrl: `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/`,
  credentials: 'include', // Include for consistency, though these are public endpoints
});

export const systemApi = createApi({
  reducerPath: 'systemApi',
  baseQuery,
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