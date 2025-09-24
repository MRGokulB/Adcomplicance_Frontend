// Base API configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

// Common API endpoints
export const API_ENDPOINTS = {
  AUTH: '/api/auth',
  USERS: '/api/users',
  TASKS: '/api/tasks',
  NOTIFICATIONS: '/api/notifications',
  REPORTS: '/api/reports',
  UPLOAD: '/api/upload',
  AUDIT: '/api/audit',
}

// Common headers
export const getAuthHeaders = (token) => ({
  'Content-Type': 'application/json',
  ...(token && { Authorization: `Bearer ${token}` })
})

// HTTP status codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_ERROR: 500,
}