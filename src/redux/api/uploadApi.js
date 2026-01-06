import { createApi } from '@reduxjs/toolkit/query/react';
import { createBaseQuery } from './baseApi';

const baseQueryWithReauth = createBaseQuery(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/upload/`);

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

    getSignedUrl: builder.query({
      query: ({ s3Key, expires = 3600 }) =>
        `signed-url/${encodeURIComponent(s3Key)}?expires=${expires}`,
      transformResponse: (response) => response,
      keepUnusedDataFor: 300,
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