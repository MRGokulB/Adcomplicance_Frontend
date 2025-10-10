// src/redux/api/dashboardApi.js - Updated with Redux CSRF
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const baseQuery = fetchBaseQuery({
  baseUrl: `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/dashboard/`,
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

        console.log('✅ CSRF token refreshed in dashboardApi');

        // Retry the original request with new token
        result = await baseQuery(args, api, extraOptions);
      }
    } catch (error) {
      console.error('❌ Failed to refresh CSRF token:', error);
    }
  }

  return result;
};

export const dashboardApi = createApi({
  reducerPath: 'dashboardApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Dashboard', 'DashboardStats', 'DashboardNotification', 'UserWorkload', 'TeamOverview'],
  keepUnusedDataFor: 300,
  refetchOnMountOrArgChange: 300,

  endpoints: (builder) => ({
    getDashboard: builder.query({
      query: () => '',
      providesTags: ['Dashboard'],
      transformResponse: (response) => response,
      keepUnusedDataFor: 300,
    }),

    getQuickStats: builder.query({
      query: () => 'quick-stats',
      providesTags: ['DashboardStats'],
      transformResponse: (response) => response,
      keepUnusedDataFor: 180,
    }),

    getTaskBuckets: builder.query({
      query: () => 'task-buckets',
      providesTags: ['Dashboard'],
      transformResponse: (response) => response,
      keepUnusedDataFor: 600,
    }),

    getWorkloadChart: builder.query({
      query: () => 'workload-chart',
      providesTags: ['Dashboard'],
      transformResponse: (response) => response,
      keepUnusedDataFor: 600,
    }),

    getCompletionTrends: builder.query({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        if (params.days) searchParams.append('days', params.days);
        return `completion-trends?${searchParams.toString()}`;
      },
      providesTags: ['Dashboard'],
      transformResponse: (response) => response,
      keepUnusedDataFor: 900,
    }),

    getActivityFeed: builder.query({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        if (params.limit) searchParams.append('limit', params.limit);
        if (params.page) searchParams.append('page', params.page);
        return `activity-feed?${searchParams.toString()}`;
      },
      providesTags: ['Dashboard'],
      transformResponse: (response) => response,
      keepUnusedDataFor: 120,
    }),

    getPerformanceMetrics: builder.query({
      query: (params = {}) => {
        const period = params?.period || '30d';
        return `performance-metrics?period=${period}`;
      },
      providesTags: ['Dashboard'],
      transformResponse: (response) => response,
      keepUnusedDataFor: 600,
    }),

    getDashboardStats: builder.query({
      query: () => 'dashboard-stats',
      providesTags: ['DashboardStats'],
      transformResponse: (response) => response,
      keepUnusedDataFor: 180,
    }),

    getUserWorkload: builder.query({
      query: (userId) => `user-workload/${userId}`,
      providesTags: (result, error, userId) => [{ type: 'UserWorkload', id: userId }],
      transformResponse: (response) => response,
      keepUnusedDataFor: 300,
    }),

    getTeamOverview: builder.query({
      query: () => 'team-overview',
      providesTags: ['TeamOverview'],
      transformResponse: (response) => response,
      keepUnusedDataFor: 600,
    }),

    markDashboardNotificationRead: builder.mutation({
      query: (id) => ({
        url: `notifications/${id}/read`,
        method: 'PATCH'
      }),
      invalidatesTags: (result, error, id) => [
        'Dashboard',
        { type: 'DashboardNotification', id }
      ],
      transformResponse: (response) => response
    }),

    markAllDashboardNotificationsRead: builder.mutation({
      query: () => ({
        url: 'notifications/read-all',
        method: 'PATCH'
      }),
      invalidatesTags: ['Dashboard', 'DashboardNotification'],
      transformResponse: (response) => response
    }),
  })
});

export const {
  useGetDashboardQuery,
  useGetQuickStatsQuery,
  useGetTaskBucketsQuery,
  useGetWorkloadChartQuery,
  useGetCompletionTrendsQuery,
  useGetActivityFeedQuery,
  useGetPerformanceMetricsQuery,
  useGetDashboardStatsQuery,
  useGetUserWorkloadQuery,
  useGetTeamOverviewQuery,
  useMarkDashboardNotificationReadMutation,
  useMarkAllDashboardNotificationsReadMutation,
} = dashboardApi;