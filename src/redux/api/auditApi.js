// src/redux/api/auditApi.js - FIXED VERSION
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const baseQuery = fetchBaseQuery({
  // FIXED: Correct base URL structure - no trailing slash in base URL, add it in endpoint
  baseUrl: `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`,
  prepareHeaders: (headers, { getState }) => {
    const token = getState().auth.token;
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    return headers;
  }
});

const baseQueryWithReauth = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions);
  if (result?.error?.status === 401) {
    console.log('Token expired, redirecting to login...');
    api.dispatch({ type: 'auth/logout' });
  }
  return result;
};

export const auditApi = createApi({
  reducerPath: 'auditApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Audit', 'AuditStats'],
  endpoints: (builder) => ({
    // Get audit logs with comprehensive filtering
    // FIXED: Correct route path with /audit prefix
    getAuditLogs: builder.query({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        
        // Only add parameters that have values
        if (params.page) searchParams.append('page', params.page);
        if (params.limit) searchParams.append('limit', params.limit);
        if (params.dateFrom) searchParams.append('dateFrom', params.dateFrom);
        if (params.dateTo) searchParams.append('dateTo', params.dateTo);
        if (params.action) searchParams.append('action', params.action);
        if (params.performedBy) searchParams.append('performedBy', params.performedBy);
        if (params.taskId) searchParams.append('taskId', params.taskId);
        
        // FIXED: Correct endpoint construction
        const queryString = searchParams.toString();
        return `/audit${queryString ? `?${queryString}` : ''}`;
      },
      providesTags: (result) =>
        result?.auditLogs
          ? [
              ...result.auditLogs.map(({ id }) => ({ type: 'Audit', id })),
              { type: 'Audit', id: 'LIST' }
            ]
          : [{ type: 'Audit', id: 'LIST' }],
    }),

    // Get audit logs for specific task
    getTaskAuditLogs: builder.query({
      query: ({ taskId, ...params }) => {
        const searchParams = new URLSearchParams();
        if (params.page) searchParams.append('page', params.page);
        if (params.limit) searchParams.append('limit', params.limit);
        
        const queryString = searchParams.toString();
        return `/audit/task/${taskId}${queryString ? `?${queryString}` : ''}`;
      },
      providesTags: (result, error, { taskId }) => [
        { type: 'Audit', id: `TASK_${taskId}` }
      ],
    }),

    // Get audit logs for specific user  
    getUserAuditLogs: builder.query({
      query: ({ userId, ...params }) => {
        const searchParams = new URLSearchParams();
        if (params.page) searchParams.append('page', params.page);
        if (params.limit) searchParams.append('limit', params.limit);
        if (params.dateFrom) searchParams.append('dateFrom', params.dateFrom);
        if (params.dateTo) searchParams.append('dateTo', params.dateTo);
        
        const queryString = searchParams.toString();
        return `/audit/user/${userId}${queryString ? `?${queryString}` : ''}`;
      },
      providesTags: (result, error, { userId }) => [
        { type: 'Audit', id: `USER_${userId}` }
      ],
    }),

    // Get audit statistics
    getAuditStats: builder.query({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        if (params.dateFrom) searchParams.append('dateFrom', params.dateFrom);
        if (params.dateTo) searchParams.append('dateTo', params.dateTo);
        
        const queryString = searchParams.toString();
        return `/audit/stats${queryString ? `?${queryString}` : ''}`;
      },
      providesTags: [{ type: 'AuditStats', id: 'STATS' }],
    }),

    // Export audit data
    exportAuditData: builder.query({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        if (params.dateFrom) searchParams.append('dateFrom', params.dateFrom);
        if (params.dateTo) searchParams.append('dateTo', params.dateTo);
        if (params.action) searchParams.append('action', params.action);
        if (params.performedBy) searchParams.append('performedBy', params.performedBy);
        
        const queryString = searchParams.toString();
        return `/audit/export${queryString ? `?${queryString}` : ''}`;
      },
    }),
  })
});

export const {
  useGetAuditLogsQuery,
  useGetTaskAuditLogsQuery,
  useGetUserAuditLogsQuery,
  useGetAuditStatsQuery,
  useLazyExportAuditDataQuery,
} = auditApi;