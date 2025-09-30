// src/redux/api/dashboardApi.js - OPTIMIZED VERSION
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const baseQuery = fetchBaseQuery({
  baseUrl: `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/dashboard/`,
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

export const dashboardApi = createApi({
  reducerPath: 'dashboardApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Dashboard', 'DashboardStats', 'DashboardNotification', 'UserWorkload', 'TeamOverview'],
  
  // OPTIMIZED: Add default cache retention
  keepUnusedDataFor: 300, // 5 minutes
  refetchOnMountOrArgChange: 300, // Only refetch if data is older than 5 minutes
  
  endpoints: (builder) => ({
    // Main dashboard data - aggregate view
    getDashboard: builder.query({
      query: () => '',
      providesTags: ['Dashboard'],
      transformResponse: (response) => response,
      keepUnusedDataFor: 300,
    }),

    // OPTIMIZED: Quick stats with longer cache
    getQuickStats: builder.query({
      query: () => 'quick-stats',
      providesTags: ['DashboardStats'],
      transformResponse: (response) => response,
      keepUnusedDataFor: 180, // 3 minutes - frequently viewed
    }),

    // Task buckets - no polling needed, refetch on user action
    getTaskBuckets: builder.query({
      query: () => 'task-buckets',
      providesTags: ['Dashboard'],
      transformResponse: (response) => response,
      keepUnusedDataFor: 600, // 10 minutes - relatively static
    }),

    // Workload chart - less critical, longer cache
    getWorkloadChart: builder.query({
      query: () => 'workload-chart',
      providesTags: ['Dashboard'],
      transformResponse: (response) => response,
      keepUnusedDataFor: 600, // 10 minutes
    }),

    // Completion trends - analytics data, can be cached longer
    getCompletionTrends: builder.query({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        if (params.from) searchParams.append('from', params.from);
        if (params.to) searchParams.append('to', params.to);
        return `completion-trends?${searchParams.toString()}`;
      },
      providesTags: ['Dashboard'],
      transformResponse: (response) => response,
      keepUnusedDataFor: 900, // 15 minutes - historical data
    }),

    // Activity feed - needs fresher data
    getActivityFeed: builder.query({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        if (params.limit) searchParams.append('limit', params.limit);
        if (params.page) searchParams.append('page', params.page);
        return `activity-feed?${searchParams.toString()}`;
      },
      providesTags: ['Dashboard'],
      transformResponse: (response) => response,
      keepUnusedDataFor: 120, // 2 minutes - recent activity
    }),

    // OPTIMIZED: Performance metrics - simplified query construction
    getPerformanceMetrics: builder.query({
      query: (params = {}) => {
        const period = params?.period || '30d';
        return `performance-metrics?period=${period}`;
      },
      providesTags: ['Dashboard'],
      transformResponse: (response) => response,
      keepUnusedDataFor: 600, // 10 minutes - metrics don't change frequently
    }),

    // Dashboard-specific stats (different from tasksApi)
    getDashboardStats: builder.query({
      query: () => 'dashboard-stats',
      providesTags: ['DashboardStats'],
      transformResponse: (response) => response,
      keepUnusedDataFor: 180, // 3 minutes
    }),

    // User workload with caching per user
    getUserWorkload: builder.query({
      query: (userId) => `user-workload/${userId}`,
      providesTags: (result, error, userId) => [{ type: 'UserWorkload', id: userId }],
      transformResponse: (response) => response,
      keepUnusedDataFor: 300, // 5 minutes per user
    }),

    // Team overview - less frequently changing
    getTeamOverview: builder.query({
      query: () => 'team-overview',
      providesTags: ['TeamOverview'],
      transformResponse: (response) => response,
      keepUnusedDataFor: 600, // 10 minutes
    }),

    // Mutations for notifications
    markDashboardNotificationRead: builder.mutation({
      query: (id) => ({
        url: `notifications/${id}/read`,
        method: 'PATCH'
      }),
      // OPTIMIZED: Only invalidate specific tags
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