// src/redux/api/uploadApi.js - Fixed version
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const baseQuery = fetchBaseQuery({
  baseUrl: `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/upload/`,
  credentials: 'include',
  prepareHeaders: (headers) => {
    const contentType = headers.get('content-type');
    if (!contentType) {
      headers.set('Content-Type', 'application/json');
    }
    return headers;
  }
});

const baseQueryWithReauth = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions);
  if (result?.error?.status === 401) {
    console.log('Session expired, redirecting to login...');
    api.dispatch({ type: 'auth/logout' });
  }
  return result;
};

export const uploadApi = createApi({
  reducerPath: 'uploadApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Upload', 'File'],
  endpoints: (builder) => ({
    uploadFiles: builder.mutation({
      query: (formData) => ({
        url: 'files',
        method: 'POST',
        body: formData,
        prepareHeaders: (headers) => {
          headers.delete('Content-Type');
          return headers;
        },
      }),
      invalidatesTags: ['Upload'],
      transformResponse: (response) => response
    }),

    uploadFile: builder.mutation({
      query: (formData) => ({
        url: 'file',
        method: 'POST',
        body: formData,
        prepareHeaders: (headers) => {
          headers.delete('Content-Type');
          return headers;
        },
      }),
      invalidatesTags: ['Upload'],
      transformResponse: (response) => response
    }),

    getFileInfo: builder.query({
      query: (s3Key) => `file/${encodeURIComponent(s3Key)}`,
      providesTags: (result, error, s3Key) => [{ type: 'File', id: s3Key }],
      transformResponse: (response) => response,
      keepUnusedDataFor: 300,
    }),

    // FIXED: Removed keepUnusedDataFor that referenced expires parameter
    getSignedUrl: builder.query({
      query: ({ s3Key, expires = 3600 }) => 
        `signed-url/${encodeURIComponent(s3Key)}?expires=${expires}`,
      transformResponse: (response) => response,
      keepUnusedDataFor: 300, // Fixed: 5 minutes cache
    }),

    deleteFile: builder.mutation({
      query: (s3Key) => ({
        url: `file/${encodeURIComponent(s3Key)}`,
        method: 'DELETE'
      }),
      invalidatesTags: (result, error, s3Key) => [
        { type: 'File', id: s3Key },
        'Upload'
      ],
      transformResponse: (response) => response.message
    }),

    listFiles: builder.query({
      query: ({ prefix, limit = 10 }) => 
        `list/${encodeURIComponent(prefix)}?limit=${limit}`,
      providesTags: ['Upload'],
      transformResponse: (response) => response,
      keepUnusedDataFor: 300,
    }),

    getUploadHealth: builder.query({
      query: () => 'health',
      transformResponse: (response) => response,
      keepUnusedDataFor: 60,
    }),

    validateUrls: builder.mutation({
      query: (urls) => ({
        url: 'validate-urls',
        method: 'POST',
        body: { urls }
      }),
      transformResponse: (response) => response
    }),

    validateFile: builder.mutation({
      query: ({ fileName, fileSize, mimeType }) => ({
        url: 'validate-file',
        method: 'POST',
        body: { fileName, fileSize, mimeType }
      }),
      transformResponse: (response) => response
    }),

    getUploadConfig: builder.query({
      query: () => 'config',
      transformResponse: (response) => response,
      keepUnusedDataFor: 3600,
    }),
  })
});

export const {
  useUploadFilesMutation,
  useUploadFileMutation,
  useGetFileInfoQuery,
  useGetSignedUrlQuery,
  useLazyGetSignedUrlQuery,
  useDeleteFileMutation,
  useListFilesQuery,
  useGetUploadHealthQuery,
  useValidateUrlsMutation,
  useValidateFileMutation,
  useGetUploadConfigQuery,
} = uploadApi;