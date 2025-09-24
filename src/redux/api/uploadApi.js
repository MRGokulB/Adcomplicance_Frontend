// redux/api/uploadApi.js - Updated with validation endpoints
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const baseQuery = fetchBaseQuery({
  baseUrl: `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/upload/`,
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

export const uploadApi = createApi({
  reducerPath: 'uploadApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Upload'],
  endpoints: (builder) => ({
    // EXISTING - Upload multiple files
    uploadFiles: builder.mutation({
      query: (formData) => ({
        url: 'files',
        method: 'POST',
        body: formData,
        // Don't set Content-Type for FormData, let browser set it
      }),
      transformResponse: (response) => response
    }),

    // EXISTING - Upload single file
    uploadFile: builder.mutation({
      query: (formData) => ({
        url: 'file',
        method: 'POST',
        body: formData,
      }),
      transformResponse: (response) => response
    }),

    // EXISTING - Get file info
    getFileInfo: builder.query({
      query: (s3Key) => `file/${encodeURIComponent(s3Key)}`,
      transformResponse: (response) => response
    }),

    // EXISTING - Get signed URL
    getSignedUrl: builder.query({
      query: ({ s3Key, expires = 3600 }) => 
        `signed-url/${encodeURIComponent(s3Key)}?expires=${expires}`,
      transformResponse: (response) => response
    }),

    // EXISTING - Delete file
    deleteFile: builder.mutation({
      query: (s3Key) => ({
        url: `file/${encodeURIComponent(s3Key)}`,
        method: 'DELETE'
      }),
      transformResponse: (response) => response.message
    }),

    // EXISTING - List files
    listFiles: builder.query({
      query: ({ prefix, limit = 10 }) => 
        `list/${encodeURIComponent(prefix)}?limit=${limit}`,
      transformResponse: (response) => response
    }),

    // EXISTING - Upload health check
    getUploadHealth: builder.query({
      query: () => 'health',
      transformResponse: (response) => response
    }),

    // NEW - Validate S3 URLs (from backend route)
    validateUrls: builder.mutation({
      query: (urls) => ({
        url: 'validate-urls',
        method: 'POST',
        body: { urls }
      }),
      transformResponse: (response) => response
    }),
  })
});

export const {
  // EXISTING hooks
  useUploadFilesMutation,
  useUploadFileMutation,
  useGetFileInfoQuery,
  useGetSignedUrlQuery,
  useDeleteFileMutation,
  useListFilesQuery,
  useGetUploadHealthQuery,
  
  // NEW hook for URL validation
  useValidateUrlsMutation,
} = uploadApi;