import { createApi } from '@reduxjs/toolkit/query/react';
import { createBaseQuery } from './baseApi';

const baseQueryWithReauth = createBaseQuery(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/`);

export const systemApi = createApi({
  reducerPath: 'systemApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['SystemStatus'],
  endpoints: (builder) => ({
    getSystemStatus: builder.query({
      query: () => 'system/status',
      providesTags: ['SystemStatus'],
      transformResponse: (response) => response,
      keepUnusedDataFor: 60,
    }),

    getApiInfo: builder.query({
      query: () => '',
      transformResponse: (response) => response,
      keepUnusedDataFor: 3600,
    }),

    getApiStatus: builder.query({
      query: () => 'status',
      transformResponse: (response) => response,
      keepUnusedDataFor: 60,
    }),

    getHealthCheck: builder.query({
      query: () => 'health',
      transformResponse: (response) => response,
      keepUnusedDataFor: 30,
    }),
  })
});

export const {
  useGetSystemStatusQuery,
  useGetApiInfoQuery,
  useGetApiStatusQuery,
  useGetHealthCheckQuery,
} = systemApi;