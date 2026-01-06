import { createApi } from '@reduxjs/toolkit/query/react';
import { createBaseQuery } from './baseApi';

const baseQueryWithReauth = createBaseQuery(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/dashboard/`);

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