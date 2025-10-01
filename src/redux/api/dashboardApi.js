// src/redux/api/dashboardApi.js - Session-based with CSRF
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const baseQuery = fetchBaseQuery({
  baseUrl: `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/dashboard/`,
  credentials: 'include', // Send session cookies
  prepareHeaders: (headers, { getState }) => {
    const token = getState().auth.token;
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    
    // Add CSRF token for non-GET requests
    const csrfToken = window.csrfToken;
    if (csrfToken) {
      headers.set('X-CSRF-Token', csrfToken);
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
  
  // Handle 403 CSRF token errors - refresh token and retry
  if (result?.error?.status === 403 && result?.error?.data?.message?.includes('CSRF')) {
    console.log('CSRF token invalid, fetching new token...');
    
    try {
      const csrfResponse = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/csrf-token`,
        { credentials: 'include' }
      );
      
      if (csrfResponse.ok) {
        const data = await csrfResponse.json();
        window.csrfToken = data.csrfToken;
        console.log('New CSRF token fetched, retrying request...');
        
        // Retry the original request with new token
        result = await baseQuery(args, api, extraOptions);
      }
    } catch (error) {
      console.error('Failed to refresh CSRF token:', error);
    }
  }
  
  return result;
};

export const dashboardApi = createApi({
  reducerPath: 'dashboardApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Dashboard', 'DashboardStats', 'DashboardNotification', 'UserWorkload', 'TeamOverview'],
  
  keepUnusedDataFor: 300, // 5 minutes
  refetchOnMountOrArgChange: 300,
  
  endpoints: (builder) => ({
    // Main dashboard data
    getDashboard: builder.query({
      query: () => '',
      providesTags: ['Dashboard'],
      transformResponse: (response) => response,
      keepUnusedDataFor: 300,
    }),

    // Quick stats
    getQuickStats: builder.query({
      query: () => 'quick-stats',
      providesTags: ['DashboardStats'],
      transformResponse: (response) => response,
      keepUnusedDataFor: 180,
    }),

    // Task buckets
    getTaskBuckets: builder.query({
      query: () => 'task-buckets',
      providesTags: ['Dashboard'],
      transformResponse: (response) => response,
      keepUnusedDataFor: 600,
    }),

    // Workload chart
    getWorkloadChart: builder.query({
      query: () => 'workload-chart',
      providesTags: ['Dashboard'],
      transformResponse: (response) => response,
      keepUnusedDataFor: 600,
    }),

    // Completion trends
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

    // Activity feed
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

    // Performance metrics
    getPerformanceMetrics: builder.query({
      query: (params = {}) => {
        const period = params?.period || '30d';
        return `performance-metrics?period=${period}`;
      },
      providesTags: ['Dashboard'],
      transformResponse: (response) => response,
      keepUnusedDataFor: 600,
    }),

    // Dashboard stats
    getDashboardStats: builder.query({
      query: () => 'dashboard-stats',
      providesTags: ['DashboardStats'],
      transformResponse: (response) => response,
      keepUnusedDataFor: 180,
    }),

    // User workload
    getUserWorkload: builder.query({
      query: (userId) => `user-workload/${userId}`,
      providesTags: (result, error, userId) => [{ type: 'UserWorkload', id: userId }],
      transformResponse: (response) => response,
      keepUnusedDataFor: 300,
    }),

    // Team overview
    getTeamOverview: builder.query({
      query: () => 'team-overview',
      providesTags: ['TeamOverview'],
      transformResponse: (response) => response,
      keepUnusedDataFor: 600,
    }),

    // Mark notification as read
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

    // Mark all notifications as read
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