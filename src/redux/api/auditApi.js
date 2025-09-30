// src/redux/api/auditApi.js - Session-based with CSRF
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const baseQuery = fetchBaseQuery({
  baseUrl: `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`,
  credentials: 'include', // Send session cookies
  prepareHeaders: (headers) => {
    // No Authorization header needed - using sessions
    headers.set('Content-Type', 'application/json');
    return headers;
  }
});

const baseQueryWithReauth = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions);
  if (result?.error?.status === 401) {
    console.log('Session expired, redirecting to login...');
    api.dispatch({ type: 'auth/logout' });
  }
  return result;
};

export const auditApi = createApi({
  reducerPath: 'auditApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Audit', 'AuditStats'],
  keepUnusedDataFor: 300, // 5 minutes cache for audit logs
  endpoints: (builder) => ({
    // Get audit logs with comprehensive filtering
    getAuditLogs: builder.query({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        
        if (params.page) searchParams.append('page', params.page);
        if (params.limit) searchParams.append('limit', params.limit);
        if (params.dateFrom) searchParams.append('dateFrom', params.dateFrom);
        if (params.dateTo) searchParams.append('dateTo', params.dateTo);
        if (params.action) searchParams.append('action', params.action);
        if (params.performedBy) searchParams.append('performedBy', params.performedBy);
        if (params.taskId) searchParams.append('taskId', params.taskId);
        
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
      transformResponse: (response) => response,
      keepUnusedDataFor: 300,
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
      transformResponse: (response) => response,
      keepUnusedDataFor: 300,
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
      transformResponse: (response) => response,
      keepUnusedDataFor: 300,
    }),

    // Get audit statistics
    getAuditStats: builder.query({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        if (params.dateFrom) searchParams.append('dateFrom', params.dateFrom);
        if (params.dateTo) searchParams.append('dateTo', params.dateTo);
        if (params.groupBy) searchParams.append('groupBy', params.groupBy);
        
        const queryString = searchParams.toString();
        return `/audit/stats${queryString ? `?${queryString}` : ''}`;
      },
      providesTags: [{ type: 'AuditStats', id: 'STATS' }],
      transformResponse: (response) => response,
      keepUnusedDataFor: 600, // 10 minutes for stats
    }),

    // Get recent activity
    getRecentActivity: builder.query({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        if (params.limit) searchParams.append('limit', params.limit);
        if (params.hours) searchParams.append('hours', params.hours);
        
        const queryString = searchParams.toString();
        return `/audit/recent${queryString ? `?${queryString}` : ''}`;
      },
      providesTags: [{ type: 'Audit', id: 'RECENT' }],
      transformResponse: (response) => response,
      keepUnusedDataFor: 60, // 1 minute for recent activity
    }),

    // Export audit data
    exportAuditData: builder.query({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        if (params.dateFrom) searchParams.append('dateFrom', params.dateFrom);
        if (params.dateTo) searchParams.append('dateTo', params.dateTo);
        if (params.action) searchParams.append('action', params.action);
        if (params.performedBy) searchParams.append('performedBy', params.performedBy);
        if (params.format) searchParams.append('format', params.format); // csv, json, xlsx
        
        const queryString = searchParams.toString();
        return `/audit/export${queryString ? `?${queryString}` : ''}`;
      },
      transformResponse: (response) => response,
    }),

    // Get action types (for filtering)
    getActionTypes: builder.query({
      query: () => '/audit/action-types',
      transformResponse: (response) => response,
      keepUnusedDataFor: 3600, // 1 hour - action types rarely change
    }),
  })
});

export const {
  useGetAuditLogsQuery,
  useGetTaskAuditLogsQuery,
  useGetUserAuditLogsQuery,
  useGetAuditStatsQuery,
  useGetRecentActivityQuery,
  useLazyExportAuditDataQuery,
  useGetActionTypesQuery,
} = auditApi;