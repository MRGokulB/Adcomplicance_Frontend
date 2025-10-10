// src/redux/api/systemApi.js - Session-based (public endpoints)
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

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
  
  // Handle 401 unauthorized responses
  if (result?.error?.status === 401) {
    api.dispatch({ type: 'auth/logout' });
  }
  
  // Handle 403 CSRF token errors - refresh token and retry
  if (result?.error?.status === 403 && result?.error?.data?.message?.includes('CSRF')) {    
    try {
      const csrfResponse = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/csrf-token`,
        { credentials: 'include' }
      );
      
      if (csrfResponse.ok) {
        const data = await csrfResponse.json();
        
        // FIXED: Update Redux state instead of window variable
        const { setCsrfToken } = await import('../slices/csrfSlice');
        const { getCsrfTokenFromCookie } = await import('../../utils/csrf');
        
        const tokenFromCookie = getCsrfTokenFromCookie();
        api.dispatch(setCsrfToken(tokenFromCookie || data.csrfToken));
        
        console.log('✅ CSRF token refreshed in systemApi');
        
        // Retry the original request with new token
        result = await baseQuery(args, api, extraOptions);
      }
    } catch (error) {
      console.error('❌ Failed to refresh CSRF token:', error);
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