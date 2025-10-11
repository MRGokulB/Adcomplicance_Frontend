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