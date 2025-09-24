import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const baseQuery = fetchBaseQuery({
  baseUrl: `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/`,
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
      transformResponse: (response) => response
    }),

    // Get API info - public endpoint
    getApiInfo: builder.query({
      query: () => '',
      transformResponse: (response) => response
    }),

    // Get simple API status - public endpoint
    getApiStatus: builder.query({
      query: () => 'status',
      transformResponse: (response) => response
    }),
  })
});

export const {
  useGetSystemStatusQuery,
  useGetApiInfoQuery,
  useGetApiStatusQuery,
} = systemApi;