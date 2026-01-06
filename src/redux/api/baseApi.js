export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export const API_ENDPOINTS = {
  AUTH: '/api/auth',
  USERS: '/api/users',
  TASKS: '/api/tasks',
  NOTIFICATIONS: '/api/notifications',
  REPORTS: '/api/reports',
  UPLOAD: '/api/upload',
  AUDIT: '/api/audit',
  DASHBOARD: '/api/dashboard',
  SYSTEM: '/api/system',
  CSRF: '/api/csrf-token'
}

export const getAuthHeaders = () => ({
  'Content-Type': 'application/json',
})

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_ERROR: 500,
}

import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { refreshCsrfToken } from './csrfRefreshHandler';

export const createBaseQuery = (baseUrl) => {
  const baseQuery = fetchBaseQuery({
    baseUrl,
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
    },
  });

  return async (args, api, extraOptions) => {
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
};