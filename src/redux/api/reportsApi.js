import { createApi } from '@reduxjs/toolkit/query/react';
import { createBaseQuery } from './baseApi';

const baseQueryWithReauth = createBaseQuery(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/reports/`);

export const reportsApi = createApi({
  reducerPath: 'reportsApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Report', 'ReportData'],
  keepUnusedDataFor: 600,
  endpoints: (builder) => ({
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

    getExpiringSoonReport: builder.query({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        if (params.days) searchParams.append('days', params.days.toString());

        return `expiring-soon?${searchParams.toString()}`;
      },
      providesTags: [{ type: 'Report', id: 'EXPIRING_SOON' }],
      transformResponse: (response) => response,
      keepUnusedDataFor: 300,
    }),

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
          responseHandler: (response) => response.blob(),
        };
      },
    }),

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