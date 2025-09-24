// redux/api/tasksApi.js - Enhanced with better cache invalidation and real-time updates
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const baseQuery = fetchBaseQuery({
  baseUrl: `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/tasks/`,
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

export const tasksApi = createApi({
  reducerPath: 'tasksApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Task', 'TaskBucket', 'TaskVersion', 'TaskComment', 'ExchangeApproval', 'TaskStats', 'TaskHealth'],

  // Enhanced cache configuration
  keepUnusedDataFor: 60, // Keep cache for 1 minute
  refetchOnMountOrArgChange: 30, // Refetch if data is older than 30 seconds

  endpoints: (builder) => ({
    // Enhanced getTasks with more specific cache invalidation
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
    }),

    // Enhanced createTask with optimistic updates
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
      transformResponse: (response) => {
        return {
          ...response.data,
          message: response.message,
          nextSteps: response.nextSteps,
          warnings: response.warnings
        };
      }
    }),

    // Enhanced getTaskById with better caching
    getTaskById: builder.query({
      query: (id) => id,
      providesTags: (result, error, id) => [{ type: 'Task', id }],
      transformResponse: (response) => response,
      // Keep individual task data fresh
      keepUnusedDataFor: 60,
      // Force refetch on mount for critical task data
      refetchOnMountOrArgChange: true,
    }),

    // Enhanced updateTaskStatus with immediate cache updates
    updateTaskStatus: builder.mutation({
      query: ({ id, status, reason }) => ({
        url: `${id}/status`,
        method: 'PUT',
        body: { status, reason }
      }),
      // Immediate cache invalidation for real-time updates
      invalidatesTags: (result, error, { id }) => {
        const tags = [{ type: 'Task', id }];

        // Only invalidate specific buckets based on the new status
        if (result?.data?.status === 'APPROVED') {
          tags.push({ type: 'TaskBucket', id: 'APPROVED_NOT_PUBLISHED' });
        }
        if (result?.data?.status === 'PUBLISHED') {
          tags.push({ type: 'TaskBucket', id: 'APPROVED_NOT_PUBLISHED' });
          tags.push({ type: 'TaskBucket', id: 'EXPIRING_SOON' });
        }

        // Only invalidate list if status actually changed
        if (result?.data?.previousStatus !== result?.data?.status) {
          tags.push({ type: 'Task', id: 'LIST' });
        }

        return tags;
      },
      // Optimistic cache update
      onQueryStarted: async ({ id, status }, { dispatch, queryFulfilled }) => {
        // Update individual task cache
        const taskPatchResult = dispatch(
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
          // Revert optimistic updates on error
          taskPatchResult.undo();
        }
      },
      transformResponse: (response) => response,
      refetchOnFocus: true,
      refetchOnReconnect: true,
    }),

    // Enhanced classifyTask with cache updates
    classifyTask: builder.mutation({
      query: ({ id, taskType }) => ({
        url: `${id}/classify`,
        method: 'POST',
        body: { taskType }
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Task', id },
        { type: 'Task', id: 'LIST' },
        { type: 'TaskBucket', id: 'LIST' }
      ],
      // Optimistic update for task type
      onQueryStarted: async ({ id, taskType }, { dispatch, queryFulfilled }) => {
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

    // Enhanced uploadVersion with better cache management
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
      transformResponse: (response) => {
        return {
          version: response.data?.version,
          task: response.data?.task,
          message: response.message,
          nextSteps: response.nextSteps
        };
      }
    }),

    // Enhanced addComment with real-time updates
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
      // Optimistic comment addition
      onQueryStarted: async ({ id, content }, { dispatch, queryFulfilled, getState }) => {
        const { auth } = getState();
        const tempComment = {
          id: Date.now(), // Temporary ID
          content,
          createdAt: new Date().toISOString(),
          createdBy: auth.user,
          isOptimistic: true
        };

        const patchResult = dispatch(
          tasksApi.util.updateQueryData('getTaskById', id, (draft) => {
            if (draft) {
              if (!draft.comments) draft.comments = [];
              draft.comments.push(tempComment);
            }
          })
        );

        try {
          const result = await queryFulfilled;
          // Replace optimistic comment with real one
          dispatch(
            tasksApi.util.updateQueryData('getTaskById', id, (draft) => {
              if (draft?.comments) {
                const optimisticIndex = draft.comments.findIndex(c => c.isOptimistic);
                if (optimisticIndex !== -1) {
                  draft.comments[optimisticIndex] = result.data.comment;
                }
              }
            })
          );
        } catch {
          patchResult.undo();
        }
      },
      transformResponse: (response) => response
    }),

    // Enhanced approveTask with cache updates
    approveTask: builder.mutation({
      query: ({ id, approvalDate, expiryDate, approvalProofUrl }) => ({
        url: `${id}/approve`,
        method: 'POST',
        body: { approvalDate, expiryDate, approvalProofUrl }
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Task', id },
        { type: 'TaskBucket', id: 'APPROVED_NOT_PUBLISHED' },
        // Only invalidate list for approved tasks
        { type: 'Task', id: 'LIST' }
      ],
      // Optimistic approval update
      onQueryStarted: async ({ id, approvalDate, expiryDate, approvalProofUrl }, { dispatch, queryFulfilled }) => {
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

    // Enhanced publishTask with cache updates
    publishTask: builder.mutation({
      query: ({ id, publishDate, publishedCopyUrl }) => ({
        url: `${id}/publish`,
        method: 'POST',
        body: { publishDate, publishedCopyUrl }
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Task', id },
        { type: 'TaskBucket', id: 'APPROVED_NOT_PUBLISHED' },
        { type: 'Task', id: 'LIST' }
      ],

      // Optimistic publish update
      onQueryStarted: async ({ id, publishDate, publishedCopyUrl }, { dispatch, queryFulfilled }) => {
        const patchResult = dispatch(
          tasksApi.util.updateQueryData('getTaskById', id, (draft) => {
            if (draft) {
              draft.status = 'PUBLISHED';
              draft.publishDate = publishDate;
              draft.publishedCopyUrl = publishedCopyUrl;
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
      refetchOnFocus: true,
      refetchOnReconnect: true,
    }),

    // Enhanced closeTask with cache updates
    closeTask: builder.mutation({
      query: ({ id, closureType, closureComments }) => ({
        url: `${id}/close`,
        method: 'POST',
        body: { closureType, closureComments }
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Task', id },
        { type: 'Task', id: 'LIST' },
        { type: 'TaskBucket', id: 'LIST' },
        { type: 'TaskStats', id: 'DASHBOARD' }
      ],
      // Optimistic closure update
      onQueryStarted: async ({ id, closureType, closureComments }, { dispatch, queryFulfilled }) => {
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

    // Existing endpoints with enhanced cache management
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

    // Enhanced exchange approval endpoints with better cache management
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

    // Task bucket queries with auto-refresh
    getApprovedNotPublished: builder.query({
      query: () => 'buckets/approved-not-published',
      providesTags: [{ type: 'TaskBucket', id: 'APPROVED_NOT_PUBLISHED' }],
      transformResponse: (response) => response
    }),

    getExpiringSoon: builder.query({
      query: (days = 15) => `buckets/expiring-soon?days=${days}`,
      providesTags: [{ type: 'TaskBucket', id: 'EXPIRING_SOON' }],
      transformResponse: (response) => response,
      refetchOnFocus: true,
      refetchOnReconnect: true,

    }),

    // Dashboard stats with frequent updates
    getDashboardStats: builder.query({
      query: () => 'dashboard-stats',
      providesTags: [{ type: 'TaskStats', id: 'DASHBOARD' }],
      transformResponse: (response) => response
    }),

    // Advanced search with caching
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
      keepUnusedDataFor: 300, // Keep search results for 5 minutes
    }),

    // User and team endpoints
    getUserWorkload: builder.query({
      query: (userId) => `user-workload/${userId}`,
      transformResponse: (response) => response,
      keepUnusedDataFor: 300,
    }),

    getTeamOverview: builder.query({
      query: () => 'team-overview',
      transformResponse: (response) => response
    }),

    getPerformanceMetrics: builder.query({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        if (params.period) searchParams.append('period', params.period);
        return `performance/metrics?${searchParams.toString()}`;
      },
      transformResponse: (response) => response,
      keepUnusedDataFor: 600, // Keep metrics for 10 minutes
    }),

    // System health with frequent polling
    getTaskHealthCheck: builder.query({
      query: () => 'health-check',
      providesTags: [{ type: 'TaskHealth', id: 'CHECK' }],
      transformResponse: (response) => response
    }),

    // Enhanced bulk operations with cache invalidation
    bulkTaskOperations: builder.mutation({
      query: ({ operation, taskIds, ...data }) => ({
        url: 'bulk-operations',
        method: 'POST',
        body: { operation, taskIds, ...data }
      }),
      invalidatesTags: [
        { type: 'Task', id: 'LIST' },
        { type: 'TaskBucket', id: 'LIST' },
        { type: 'TaskStats', id: 'DASHBOARD' }
      ],
      // Optimistic updates for bulk operations
      onQueryStarted: async ({ operation, taskIds, ...data }, { dispatch, queryFulfilled }) => {
        // Only update individual task caches for status updates
        if (operation === 'bulk_status_update' && data.status) {
          const patchResults = taskIds.map(id =>
            dispatch(
              tasksApi.util.updateQueryData('getTaskById', id, (draft) => {
                if (draft) {
                  draft.status = data.status;
                  draft.updatedAt = new Date().toISOString();
                }
              })
            )
          );

          try {
            await queryFulfilled;
          } catch {
            patchResults.forEach(patch => patch.undo());
          }
        }
      },
      transformResponse: (response) => response
    }),

    // Absent user tasks
    getAbsentUserTasks: builder.query({
      query: (userId) => `absent-users/${userId}/tasks`,
      transformResponse: (response) => response
    }),
  })
});

export const {
  // Existing hooks
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

  // Backend endpoint hooks
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
  useGetPerformanceMetricsQuery,
  useGetTaskHealthCheckQuery,
  useGetAbsentUserTasksQuery,
} = tasksApi;

// Utility function to manually invalidate cache
export const invalidateTaskCache = (dispatch, taskId) => {
  dispatch(tasksApi.util.invalidateTags([
    { type: 'Task', id: taskId },
    { type: 'Task', id: 'LIST' }
  ]));
};

// Utility function to manually update task in cache
export const updateTaskInCache = (dispatch, taskId, updates) => {
  dispatch(
    tasksApi.util.updateQueryData('getTaskById', taskId, (draft) => {
      if (draft) {
        Object.assign(draft, updates);
      }
    })
  );
};