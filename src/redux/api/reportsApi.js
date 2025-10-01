// src/redux/api/reportsApi.js - Session-based with CSRF
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const baseQuery = fetchBaseQuery({
  baseUrl: `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/reports/`,
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

export const reportsApi = createApi({
  reducerPath: 'reportsApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Report', 'ReportData'],
  keepUnusedDataFor: 600, // 10 minutes cache for reports
  endpoints: (builder) => ({
    // Internal Tasks Report
    getInternalTasksReport: builder.query({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        if (params.dateFrom) searchParams.append('dateFrom', params.dateFrom);
        if (params.dateTo) searchParams.append('dateTo', params.dateTo);
        if (params.status) searchParams.append('status', params.status);
        if (params.createdBy) searchParams.append('createdBy', params.createdBy);
        if (params.assignedTo) searchParams.append('assignedTo', params.assignedTo);
        if (params.page) searchParams.append('page', params.page);
        if (params.limit) searchParams.append('limit', params.limit);
        
        return `internal-tasks?${searchParams.toString()}`;
      },
      providesTags: [{ type: 'Report', id: 'INTERNAL_TASKS' }],
      transformResponse: (response) => response,
      keepUnusedDataFor: 600,
    }),

    // Exchange Tasks Report
    getExchangeTasksReport: builder.query({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        if (params.dateFrom) searchParams.append('dateFrom', params.dateFrom);
        if (params.dateTo) searchParams.append('dateTo', params.dateTo);
        if (params.exchangeName) searchParams.append('exchangeName', params.exchangeName);
        if (params.approvalStatus) searchParams.append('approvalStatus', params.approvalStatus);
        if (params.status) searchParams.append('status', params.status);
        if (params.createdBy) searchParams.append('createdBy', params.createdBy);
        if (params.assignedTo) searchParams.append('assignedTo', params.assignedTo);
        if (params.page) searchParams.append('page', params.page);
        if (params.limit) searchParams.append('limit', params.limit);
        
        return `exchange-tasks?${searchParams.toString()}`;
      },
      providesTags: [{ type: 'Report', id: 'EXCHANGE_TASKS' }],
      transformResponse: (response) => response,
      keepUnusedDataFor: 600,
    }),

    // Compliance Users Report
    getComplianceUsersReport: builder.query({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        if (params.dateFrom) searchParams.append('dateFrom', params.dateFrom);
        if (params.dateTo) searchParams.append('dateTo', params.dateTo);
        if (params.userId) searchParams.append('userId', params.userId);
        
        return `compliance-users?${searchParams.toString()}`;
      },
      providesTags: [{ type: 'Report', id: 'COMPLIANCE_USERS' }],
      transformResponse: (response) => response,
      keepUnusedDataFor: 600,
    }),

    // Product Users Report
    getProductUsersReport: builder.query({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        if (params.dateFrom) searchParams.append('dateFrom', params.dateFrom);
        if (params.dateTo) searchParams.append('dateTo', params.dateTo);
        if (params.userId) searchParams.append('userId', params.userId);
        
        return `product-users?${searchParams.toString()}`;
      },
      providesTags: [{ type: 'Report', id: 'PRODUCT_USERS' }],
      transformResponse: (response) => response,
      keepUnusedDataFor: 600,
    }),

    // Expiring Soon Report
    getExpiringSoonReport: builder.query({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        if (params.days) searchParams.append('days', params.days.toString());
        
        return `expiring-soon?${searchParams.toString()}`;
      },
      providesTags: [{ type: 'Report', id: 'EXPIRING_SOON' }],
      transformResponse: (response) => response,
      keepUnusedDataFor: 300, // 5 minutes - more time-sensitive
    }),

    // Daily Movement Report
    getDailyMovementReport: builder.query({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        if (params.date) searchParams.append('date', params.date);
        
        return `daily-movement?${searchParams.toString()}`;
      },
      providesTags: [{ type: 'Report', id: 'DAILY_MOVEMENT' }],
      transformResponse: (response) => response,
      keepUnusedDataFor: 600,
    }),

    // Rejected Tasks Report
    getRejectedTasksReport: builder.query({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        if (params.dateFrom) searchParams.append('dateFrom', params.dateFrom);
        if (params.dateTo) searchParams.append('dateTo', params.dateTo);
        if (params.closureType) searchParams.append('closureType', params.closureType);
        
        return `rejected-tasks?${searchParams.toString()}`;
      },
      providesTags: [{ type: 'Report', id: 'REJECTED_TASKS' }],
      transformResponse: (response) => response,
      keepUnusedDataFor: 600,
    }),

    // Export report data
    exportReport: builder.mutation({
      query: ({ reportType, format = 'xlsx', ...params }) => {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            searchParams.append(key, value);
          }
        });
        
        return {
          url: `${reportType}/export?format=${format}&${searchParams.toString()}`,
          method: 'GET',
          responseHandler: (response) => response.blob(), // Handle file download
        };
      },
    }),

    // Get report summary
    getReportSummary: builder.query({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        if (params.dateFrom) searchParams.append('dateFrom', params.dateFrom);
        if (params.dateTo) searchParams.append('dateTo', params.dateTo);
        
        return `summary?${searchParams.toString()}`;
      },
      providesTags: [{ type: 'Report', id: 'SUMMARY' }],
      transformResponse: (response) => response,
      keepUnusedDataFor: 300,
    }),
  })
});

export const {
  useGetInternalTasksReportQuery,
  useGetExchangeTasksReportQuery,
  useGetComplianceUsersReportQuery,
  useGetProductUsersReportQuery,
  useGetExpiringSoonReportQuery,
  useGetDailyMovementReportQuery,
  useGetRejectedTasksReportQuery,
  useExportReportMutation,
  useGetReportSummaryQuery,
} = reportsApi;