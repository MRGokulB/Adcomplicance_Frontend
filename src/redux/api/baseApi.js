// src/redux/api/baseApi.js
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export const API_ENDPOINTS = {
  AUTH: '/api/auth',
  USERS: '/api/users',
  TASKS: '/api/tasks',
  NOTIFICATIONS: '/api/notifications',
  REPORTS: '/api/reports',
  UPLOAD: '/api/upload',
  AUDIT: '/api/audit',
  CSRF: '/api/csrf-token'
}

// Updated to not include Authorization header (using sessions now)
export const getAuthHeaders = () => ({
  'Content-Type': 'application/json',
})

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_ERROR: 500,
}