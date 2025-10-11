import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { refreshCsrfToken } from './csrfRefreshHandler';

const baseQuery = fetchBaseQuery({
  baseUrl: `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/`,
  credentials: 'include',
  prepareHeaders: (headers, { getState }) => {
    const token = getState().auth?.token;
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }

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