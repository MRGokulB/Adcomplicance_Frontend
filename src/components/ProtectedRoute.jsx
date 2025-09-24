import React, { useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { Navigate, useLocation } from 'react-router-dom'
import { 
  selectIsAuthenticated, 
  selectAuthLoading, 
  selectUserRole,
  checkAuthExpiry,
  initializeAuth
} from '../redux/slices/authSlice'

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

  // Initialize auth on component mount
  useEffect(() => {
    dispatch(initializeAuth())
  }, [dispatch])

  // Check for auth expiry periodically
  useEffect(() => {
    const interval = setInterval(() => {
      dispatch(checkAuthExpiry())
    }, 60000) // Check every minute

    return () => clearInterval(interval)
  }, [dispatch])

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to={fallbackPath} state={{ from: location }} replace />
  }

  // Check role-based access
  if (requiredRole && userRole !== requiredRole) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    )
  }

  // Check permission-based access
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