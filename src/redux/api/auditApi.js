// src/redux/api/auditApi.js - Updated with Redux CSRF
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { refreshCsrfToken } from './csrfRefreshHandler';

const baseQuery = fetchBaseQuery({
  baseUrl: `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`,
  credentials: 'include',
  prepareHeaders: (headers, { getState }) => {
    const token = getState().auth?.token;
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }

    // FIXED: Read CSRF token from Redux state instead of window
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

export const auditApi = createApi({
  reducerPath: 'auditApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Audit', 'AuditStats'],
  keepUnusedDataFor: 300,
  endpoints: (builder) => ({
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
      keepUnusedDataFor: 600,
    }),

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
      keepUnusedDataFor: 60,
    }),

    exportAuditData: builder.query({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        if (params.dateFrom) searchParams.append('dateFrom', params.dateFrom);
        if (params.dateTo) searchParams.append('dateTo', params.dateTo);
        if (params.action) searchParams.append('action', params.action);
        if (params.performedBy) searchParams.append('performedBy', params.performedBy);
        if (params.format) searchParams.append('format', params.format);

        const queryString = searchParams.toString();
        return `/audit/export${queryString ? `?${queryString}` : ''}`;
      },
      transformResponse: (response) => response,
    }),

    getActionTypes: builder.query({
      query: () => '/audit/action-types',
      transformResponse: (response) => response,
      keepUnusedDataFor: 3600,
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