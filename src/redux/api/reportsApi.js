// src/redux/api/reportsApi.js - Complete reports API for all report types
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const baseQuery = fetchBaseQuery({
  baseUrl: `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/reports/`,
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

export const reportsApi = createApi({
  reducerPath: 'reportsApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Report', 'ReportData'],
  endpoints: (builder) => ({
    // Internal Tasks Report - Updated to match backend structure
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
      transformResponse: (response) => response
    }),

    // Exchange Tasks Report - Updated to match backend structure
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
      transformResponse: (response) => response
    }),

    // Compliance Users Report - Updated structure
    getComplianceUsersReport: builder.query({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        if (params.dateFrom) searchParams.append('dateFrom', params.dateFrom);
        if (params.dateTo) searchParams.append('dateTo', params.dateTo);
        if (params.userId) searchParams.append('userId', params.userId);
        
        return `compliance-users?${searchParams.toString()}`;
      },
      providesTags: [{ type: 'Report', id: 'COMPLIANCE_USERS' }],
      transformResponse: (response) => response
    }),

    // Product Users Report - Updated structure
    getProductUsersReport: builder.query({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        if (params.dateFrom) searchParams.append('dateFrom', params.dateFrom);
        if (params.dateTo) searchParams.append('dateTo', params.dateTo);
        if (params.userId) searchParams.append('userId', params.userId);
        
        return `product-users?${searchParams.toString()}`;
      },
      providesTags: [{ type: 'Report', id: 'PRODUCT_USERS' }],
      transformResponse: (response) => response
    }),

    // Expiring Soon Report - Updated with urgency levels
    getExpiringSoonReport: builder.query({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        if (params.days) searchParams.append('days', params.days.toString());
        
        return `expiring-soon?${searchParams.toString()}`;
      },
      providesTags: [{ type: 'Report', id: 'EXPIRING_SOON' }],
      transformResponse: (response) => response
    }),

    // Daily Movement Report - Updated with detailed analytics
    getDailyMovementReport: builder.query({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        if (params.date) searchParams.append('date', params.date);
        
        return `daily-movement?${searchParams.toString()}`;
      },
      providesTags: [{ type: 'Report', id: 'DAILY_MOVEMENT' }],
      transformResponse: (response) => response
    }),

    // Rejected Tasks Report - Updated structure
    getRejectedTasksReport: builder.query({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        if (params.dateFrom) searchParams.append('dateFrom', params.dateFrom);
        if (params.dateTo) searchParams.append('dateTo', params.dateTo);
        if (params.closureType) searchParams.append('closureType', params.closureType);
        
        return `rejected-tasks?${searchParams.toString()}`;
      },
      providesTags: [{ type: 'Report', id: 'REJECTED_TASKS' }],
      transformResponse: (response) => response
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
} = reportsApi;