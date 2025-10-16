import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { refreshCsrfToken } from './csrfRefreshHandler';

const baseQuery = fetchBaseQuery({
  baseUrl: `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/tasks/`,
  credentials: 'include',
  prepareHeaders: (headers, { getState }) => {
    const token = getState().auth.token;
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }

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
    const success = await refreshCsrfToken(api);
    
    if (success) {
      result = await baseQuery(args, api, extraOptions);
    }
  }
  
  return result;
};

export const tasksApi = createApi({
  reducerPath: 'tasksApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Task', 'TaskBucket', 'TaskVersion', 'TaskComment', 'ExchangeApproval', 'TaskStats', 'TaskHealth'],

  keepUnusedDataFor: 300,
  refetchOnMountOrArgChange: 300,

  endpoints: (builder) => ({
    getTasks: builder.query({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();

        if (params.page) searchParams.append('page', params.page);
        if (params.limit) searchParams.append('limit', params.limit);
        if (params.status) searchParams.append('status', params.status);
        if (params.search) searchParams.append('search', params.search);
        if (params.taskType) searchParams.append('taskType', params.taskType);
        if (params.priority) searchParams.append('priority', params.priority);
        if (params.createdBy) searchParams.append('createdBy', params.createdBy);
        if (params.assignedTo) searchParams.append('assignedTo', params.assignedTo);
        if (params.exchange) searchParams.append('exchange', params.exchange);
        if (params.dateFrom) searchParams.append('dateFrom', params.dateFrom);
        if (params.dateTo) searchParams.append('dateTo', params.dateTo);
        if (params.refNo) searchParams.append('refNo', params.refNo);
        if (params.searchQuery) searchParams.append('searchQuery', params.searchQuery);

        return `?${searchParams.toString()}`;
      },
      providesTags: (result) =>
        result?.tasks
          ? [
            ...result.tasks.map(({ id }) => ({ type: 'Task', id })),
            { type: 'Task', id: 'LIST' }
          ]
          : [{ type: 'Task', id: 'LIST' }],
      transformResponse: (response) => response,
      serializeQueryArgs: ({ endpointName, queryArgs }) => {
        const { page, limit, ...filters } = queryArgs;
        const filterKey = Object.keys(filters)
          .sort()
          .map(key => `${key}:${filters[key]}`)
          .join('|');
        return `${endpointName}-${filterKey}`;
      },
      merge: (currentCache, newItems) => {
        return newItems;
      },
      forceRefetch({ currentArg, previousArg }) {
        return JSON.stringify(currentArg) !== JSON.stringify(previousArg);
      },
    }),

    createTask: builder.mutation({
      query: (taskData) => ({
        url: '',
        method: 'POST',
        body: taskData
      }),
      invalidatesTags: [
        { type: 'Task', id: 'LIST' },
        { type: 'TaskBucket', id: 'LIST' },
        { type: 'TaskStats', id: 'DASHBOARD' }
      ],
      transformResponse: (response) => ({
        ...response.data,
        message: response.message,
        nextSteps: response.nextSteps,
        warnings: response.warnings
      })
    }),

    updateTaskName: builder.mutation({
      query: ({ id, title }) => ({
        url: `${id}/name`,
        method: 'PUT',
        body: { title }
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Task', id },
        { type: 'Task', id: 'LIST' }
      ],
      transformResponse: (response) => response
    }),

    getTaskById: builder.query({
      query: (id) => id,
      providesTags: (result, error, id) => [{ type: 'Task', id }],
      transformResponse: (response) => response,
      keepUnusedDataFor: 300,
    }),

    updateTaskStatus: builder.mutation({
      query: ({ id, status, reason }) => ({
        url: `${id}/status`,
        method: 'PUT',
        body: { status, reason }
      }),
      invalidatesTags: (result, error, { id }) => {
        const tags = [
          { type: 'Task', id },
          { type: 'Task', id: 'LIST' }
        ];

        if (result?.data?.status === 'APPROVED') {
          tags.push({ type: 'TaskBucket', id: 'APPROVED_NOT_PUBLISHED' });
        }
        if (result?.data?.status === 'PUBLISHED') {
          tags.push({ type: 'TaskBucket', id: 'APPROVED_NOT_PUBLISHED' });
          tags.push({ type: 'TaskBucket', id: 'EXPIRING_SOON' });
        }

        return tags;
      },
      async onQueryStarted({ id, status }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          tasksApi.util.updateQueryData('getTaskById', id, (draft) => {
            if (draft) {
              draft.status = status;
              draft.updatedAt = new Date().toISOString();
            }
          })
        );

        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
      transformResponse: (response) => response,
    }),

    classifyTask: builder.mutation({
      query: ({ id, taskType }) => ({
        url: `${id}/classify`,
        method: 'POST',
        body: { taskType }
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Task', id },
        { type: 'Task', id: 'LIST' }
      ],
      async onQueryStarted({ id, taskType }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          tasksApi.util.updateQueryData('getTaskById', id, (draft) => {
            if (draft) {
              draft.taskType = taskType;
              draft.updatedAt = new Date().toISOString();
            }
          })
        );

        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
      transformResponse: (response) => response
    }),

    uploadVersion: builder.mutation({
      query: ({ id, files, remarks }) => ({
        url: `${id}/versions`,
        method: 'POST',
        body: { files, remarks }
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Task', id },
        { type: 'TaskVersion', id: 'LIST' }
      ],
      transformResponse: (response) => ({
        version: response.data?.version,
        task: response.data?.task,
        message: response.message,
        nextSteps: response.nextSteps
      })
    }),

    addComment: builder.mutation({
      query: ({ id, content, isGlobal = false, versionId, attachments, requiresVersionUpdate = false }) => ({
        url: `${id}/comments`,
        method: 'POST',
        body: { content, isGlobal, versionId, attachments, requiresVersionUpdate }
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Task', id },
        { type: 'TaskComment', id: 'LIST' }
      ],
      async onQueryStarted({ id, content }, { dispatch, queryFulfilled, getState }) {
        const { auth } = getState();
        const tempComment = {
          id: Date.now(),
          content,
          createdAt: new Date().toISOString(),
          author: auth.user,
          isOptimistic: true
        };

        const patchResult = dispatch(
          tasksApi.util.updateQueryData('getTaskById', id, (draft) => {
            if (draft && draft.comments) {
              draft.comments.push(tempComment);
            }
          })
        );

        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
      transformResponse: (response) => response
    }),

    approveTask: builder.mutation({
      query: ({ id, approvalDate, expiryDate, approvalProofUrl }) => ({
        url: `${id}/approve`,
        method: 'POST',
        body: { approvalDate, expiryDate, approvalProofUrl }
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Task', id },
        { type: 'TaskBucket', id: 'APPROVED_NOT_PUBLISHED' },
        { type: 'Task', id: 'LIST' }
      ],
      async onQueryStarted({ id, approvalDate, expiryDate, approvalProofUrl }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          tasksApi.util.updateQueryData('getTaskById', id, (draft) => {
            if (draft) {
              draft.status = 'APPROVED';
              draft.approvalDate = approvalDate;
              draft.expiryDate = expiryDate;
              draft.approvalProofUrl = approvalProofUrl;
              draft.updatedAt = new Date().toISOString();
            }
          })
        );

        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
      transformResponse: (response) => response
    }),

    publishTask: builder.mutation({
  query: ({ id, publishDate, publishedCopyUrl, publishedFiles }) => ({
    url: `${id}/publish`,
    method: 'POST',
    body: { publishDate, publishedCopyUrl, publishedFiles }
  }),
  invalidatesTags: (result, error, { id }) => [
    { type: 'Task', id },
    { type: 'TaskBucket', id: 'APPROVED_NOT_PUBLISHED' },
    { type: 'Task', id: 'LIST' }
  ],
  async onQueryStarted({ id, publishDate, publishedCopyUrl, publishedFiles }, { dispatch, queryFulfilled }) {
    const patchResult = dispatch(
      tasksApi.util.updateQueryData('getTaskById', id, (draft) => {
        if (draft) {
          draft.status = 'PUBLISHED';
          draft.publishDate = publishDate;
          draft.publishedCopyUrl = publishedCopyUrl;
          draft.publishedFiles = publishedFiles;
          draft.updatedAt = new Date().toISOString();
        }
      })
    );
    try {
      await queryFulfilled;
    } catch {
      patchResult.undo();
    }
  },
  transformResponse: (response) => response,
}),

    closeTask: builder.mutation({
      query: ({ id, closureType, closureComments }) => ({
        url: `${id}/close`,
        method: 'POST',
        body: { closureType, closureComments }
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Task', id },
        { type: 'Task', id: 'LIST' },
        { type: 'TaskStats', id: 'DASHBOARD' }
      ],
      async onQueryStarted({ id, closureType, closureComments }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          tasksApi.util.updateQueryData('getTaskById', id, (draft) => {
            if (draft) {
              draft.status = closureType;
              draft.closureComments = closureComments;
              draft.updatedAt = new Date().toISOString();
            }
          })
        );

        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
      transformResponse: (response) => response
    }),

    followUpTask: builder.mutation({
      query: ({ id, message, urgency }) => ({
        url: `${id}/follow-up`,
        method: 'POST',
        body: { message, urgency }
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Task', id }],
      transformResponse: (response) => response
    }),

    reassignTask: builder.mutation({
      query: ({ id, assignType, userId, reason }) => ({
        url: `${id}/reassign`,
        method: 'POST',
        body: { assignType, userId, reason }
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Task', id },
        { type: 'Task', id: 'LIST' }
      ],
      transformResponse: (response) => response
    }),

    getAssignmentOptions: builder.query({
      query: ({ id, type }) => {
        const searchParams = new URLSearchParams();
        if (type) searchParams.append('type', type);
        return `${id}/assignment-options?${searchParams.toString()}`;
      },
      transformResponse: (response) => response
    }),

    validateFiles: builder.mutation({
      query: (files) => ({
        url: 'validate-files',
        method: 'POST',
        body: { files }
      }),
      transformResponse: (response) => response
    }),

    addExchangeApproval: builder.mutation({
      query: ({ id, exchangeName }) => ({
        url: `${id}/exchange-approvals`,
        method: 'POST',
        body: { exchangeName }
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Task', id },
        { type: 'ExchangeApproval', id: 'LIST' }
      ],
      transformResponse: (response) => response
    }),

    updateExchangeApproval: builder.mutation({
      query: ({ taskId, approvalId, ...updateData }) => ({
        url: `${taskId}/exchange-approvals/${approvalId}`,
        method: 'PUT',
        body: updateData
      }),
      invalidatesTags: (result, error, { taskId }) => [
        { type: 'Task', id: taskId },
        { type: 'ExchangeApproval', id: 'LIST' }
      ],
      transformResponse: (response) => response
    }),

    deleteExchangeApproval: builder.mutation({
      query: ({ taskId, approvalId }) => ({
        url: `${taskId}/exchange-approvals/${approvalId}`,
        method: 'DELETE'
      }),
      invalidatesTags: (result, error, { taskId }) => [
        { type: 'Task', id: taskId },
        { type: 'ExchangeApproval', id: 'LIST' }
      ],
      transformResponse: (response) => response
    }),

    getApprovedNotPublished: builder.query({
      query: () => 'buckets/approved-not-published',
      providesTags: [{ type: 'TaskBucket', id: 'APPROVED_NOT_PUBLISHED' }],
      transformResponse: (response) => response,
      keepUnusedDataFor: 300,
    }),

    getExpiringSoon: builder.query({
      query: (params) => {
        const days = typeof params === 'object' ? (params?.days || 15) : (params || 15);
        return `buckets/expiring-soon?days=${days}`;
      },
      providesTags: [{ type: 'TaskBucket', id: 'EXPIRING_SOON' }],
      transformResponse: (response) => response,
      keepUnusedDataFor: 300,
    }),

    getDashboardStats: builder.query({
      query: () => 'dashboard-stats',
      providesTags: [{ type: 'TaskStats', id: 'DASHBOARD' }],
      transformResponse: (response) => response,
      keepUnusedDataFor: 300,
    }),

    advancedTaskSearch: builder.query({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        if (params.q) searchParams.append('q', params.q);
        if (params.type) searchParams.append('type', params.type);
        if (params.page) searchParams.append('page', params.page);
        if (params.limit) searchParams.append('limit', params.limit);

        return `search/advanced?${searchParams.toString()}`;
      },
      providesTags: [{ type: 'Task', id: 'SEARCH' }],
      transformResponse: (response) => response,
      keepUnusedDataFor: 600,
    }),

    getUserWorkload: builder.query({
      query: (userId) => `user-workload/${userId}`,
      transformResponse: (response) => response,
      keepUnusedDataFor: 600,
    }),

    getTeamOverview: builder.query({
      query: () => 'team-overview',
      transformResponse: (response) => response,
      keepUnusedDataFor: 300,
    }),

    getTaskHealthCheck: builder.query({
      query: () => 'system/health-check',
      providesTags: [{ type: 'TaskHealth', id: 'CHECK' }],
      transformResponse: (response) => response,
      keepUnusedDataFor: 600,
    }),

    bulkTaskOperations: builder.mutation({
      query: ({ operation, taskIds, ...data }) => ({
        url: 'bulk-operations',
        method: 'POST',
        body: { operation, taskIds, ...data }
      }),
      invalidatesTags: [
        { type: 'Task', id: 'LIST' },
        { type: 'TaskStats', id: 'DASHBOARD' }
      ],
      transformResponse: (response) => response
    }),

    getAbsentUserTasks: builder.query({
      query: (userId) => `absent-users/${userId}/tasks`,
      transformResponse: (response) => response,
      keepUnusedDataFor: 300,
    }),
  })
});

export const {
  useGetTasksQuery,
  useCreateTaskMutation,
  useGetTaskByIdQuery,
  useUploadVersionMutation,
  useAddCommentMutation,
  useApproveTaskMutation,
  usePublishTaskMutation,
  useCloseTaskMutation,
  useAddExchangeApprovalMutation,
  useUpdateExchangeApprovalMutation,
  useDeleteExchangeApprovalMutation,
  useGetApprovedNotPublishedQuery,
  useGetExpiringSoonQuery,
  useBulkTaskOperationsMutation,
  useUpdateTaskStatusMutation,
  useClassifyTaskMutation,
  useFollowUpTaskMutation,
  useReassignTaskMutation,
  useGetAssignmentOptionsQuery,
  useValidateFilesMutation,
  useGetDashboardStatsQuery,
  useAdvancedTaskSearchQuery,
  useGetUserWorkloadQuery,
  useGetTeamOverviewQuery,
  useGetTaskHealthCheckQuery,
  useGetAbsentUserTasksQuery,
  useUpdateTaskNameMutation,
} = tasksApi;

export const invalidateTaskCache = (dispatch, taskId) => {
  dispatch(tasksApi.util.invalidateTags([
    { type: 'Task', id: taskId },
    { type: 'Task', id: 'LIST' }
  ]));
};

export const updateTaskInCache = (dispatch, taskId, updates) => {
  dispatch(
    tasksApi.util.updateQueryData('getTaskById', taskId, (draft) => {
      if (draft) {
        Object.assign(draft, updates);
      }
    })
  );
};