// src/components/ProtectedRoute.jsx
import React, { useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { Navigate, useLocation } from 'react-router-dom'
import { 
  selectIsAuthenticated, 
  selectAuthLoading, 
  selectUserRole,
  initializeAuth,
  setSessionInvalid
} from '../redux/slices/authSlice'
import { useGetCurrentUserQuery } from '../redux/api/authApi'

const ProtectedRoute = ({ 
  children, 
  requiredRole = null,
  requiredPermissions = [],
  fallbackPath = '/login' 
}) => {
  const dispatch = useDispatch()
  const location = useLocation()
  
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const isLoading = useSelector(selectAuthLoading)
  const userRole = useSelector(selectUserRole)

  // Verify session with server on mount
  // IMPORTANT: Don't skip this check - we need to verify session even if Redux state is cleared
  const { 
    data: currentUserData, 
    isLoading: isCheckingSession,
    error: sessionError 
  } = useGetCurrentUserQuery(undefined, {
    skip: false, // Always check session on mount (handles page refresh)
  })

  // Initialize auth on component mount
  useEffect(() => {
    dispatch(initializeAuth())
  }, [dispatch])

  // Handle session errors (expired/invalid session)
  useEffect(() => {
    if (sessionError) {
      dispatch(setSessionInvalid())
    }
  }, [sessionError, dispatch])

  // Show loading while checking authentication or session
  if (isCheckingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Verifying session...</p>
        </div>
      </div>
    )
  }

  // Redirect to login if session check failed or user not authenticated
  if (sessionError || (!isAuthenticated && !currentUserData)) {
    return <Navigate to={fallbackPath} state={{ from: location }} replace />
  }

  // Check role-based access
  if (requiredRole && userRole !== requiredRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-8 bg-white rounded-lg shadow-lg">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">
            You don't have permission to access this page.
          </p>
          <p className="text-sm text-gray-500">
            Required role: <span className="font-semibold">{requiredRole}</span>
            <br />
            Your role: <span className="font-semibold">{userRole}</span>
          </p>
          <button
            onClick={() => window.history.back()}
            className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  // Check permission-based access (implement when needed)
  if (requiredPermissions.length > 0) {
    // This would be implemented when we have a more detailed permission system
    console.log('Checking permissions:', requiredPermissions)
  }

  return children
}

export default ProtectedRoute

// Higher-order component for role-based routes
export const withRoleProtection = (Component, requiredRole) => {
  return (props) => (
    <ProtectedRoute requiredRole={requiredRole}>
      <Component {...props} />
    </ProtectedRoute>
  )
}

// Higher-order component for permission-based routes
export const withPermissionProtection = (Component, requiredPermissions) => {
  return (props) => (
    <ProtectedRoute requiredPermissions={requiredPermissions}>
      <Component {...props} />
    </ProtectedRoute>
  )
}
