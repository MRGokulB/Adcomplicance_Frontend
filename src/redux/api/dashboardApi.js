// src/redux/api/dashboardApi.js - Updated for new backend routes
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
  endpoints: (builder) => ({
    // Main dashboard data - Updated to match new backend structure
    getDashboard: builder.query({
      query: () => '',
      providesTags: ['Dashboard'],
      transformResponse: (response) => response
    }),

    // Quick stats for metrics cards - Updated structure
    getQuickStats: builder.query({
      query: () => 'quick-stats',
      providesTags: ['DashboardStats'],
      transformResponse: (response) => response
    }),

    // Task buckets for dashboard sections - Updated with new structure
    getTaskBuckets: builder.query({
      query: () => 'task-buckets',
      providesTags: ['Dashboard'],
      transformResponse: (response) => response
    }),

    // Workload chart data - Updated endpoint
    getWorkloadChart: builder.query({
      query: () => 'workload-chart',
      providesTags: ['Dashboard'],
      transformResponse: (response) => response
    }),

    // Completion trends with optional date range - Updated
    getCompletionTrends: builder.query({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        if (params.from) searchParams.append('from', params.from);
        if (params.to) searchParams.append('to', params.to);
        return `completion-trends?${searchParams.toString()}`;
      },
      providesTags: ['Dashboard'],
      transformResponse: (response) => response
    }),

    // Activity feed with pagination - Updated
    getActivityFeed: builder.query({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        if (params.limit) searchParams.append('limit', params.limit);
        if (params.page) searchParams.append('page', params.page);
        return `activity-feed?${searchParams.toString()}`;
      },
      providesTags: ['Dashboard'],
      transformResponse: (response) => response
    }),

    // Performance metrics - Updated
    getPerformanceMetrics: builder.query({
      query: (period = '30d') => {
        const searchParams = new URLSearchParams();
        if (period) searchParams.append('period', period);
        return `performance-metrics?${searchParams.toString()}`;
      },
      providesTags: ['Dashboard'],
      transformResponse: (response) => response
    }),

    // NEW: Dashboard stats - From backend /api/tasks/dashboard-stats
    getDashboardStats: builder.query({
      query: () => 'dashboard-stats',
      providesTags: ['DashboardStats'],
      transformResponse: (response) => response // Returns { overview, byStatus, alerts, userRole, generatedAt }
    }),

    // NEW: User workload analytics - From backend /api/tasks/user-workload/:userId  
    getUserWorkload: builder.query({
      query: (userId) => `user-workload/${userId}`,
      providesTags: (result, error, userId) => [{ type: 'UserWorkload', id: userId }],
      transformResponse: (response) => response // Returns { user, workload, summary }
    }),

    // NEW: Team overview analytics - From backend /api/tasks/team-overview
    getTeamOverview: builder.query({
      query: () => 'team-overview',
      providesTags: ['TeamOverview'],
      transformResponse: (response) => response // Returns { team, summary, filters, generatedAt }
    }),

    // Mark dashboard notification as read
    markDashboardNotificationRead: builder.mutation({
      query: (id) => ({
        url: `notifications/${id}/read`,
        method: 'PATCH'
      }),
      invalidatesTags: ['Dashboard', 'DashboardNotification'],
      transformResponse: (response) => response
    }),

    // Mark all dashboard notifications as read
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
  useGetDashboardStatsQuery, // NEW
  useGetUserWorkloadQuery, // NEW  
  useGetTeamOverviewQuery, // NEW
  useMarkDashboardNotificationReadMutation,
  useMarkAllDashboardNotificationsReadMutation,
} = dashboardApi;