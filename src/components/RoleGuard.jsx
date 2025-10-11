import React from 'react'
import { useSelector } from 'react-redux'
import { Navigate } from 'react-router-dom'
import { selectUserRole } from '../redux/slices/authSlice'
import { hasPermission, hasAnyPermission, USER_ROLES } from '../utils/roles'

const RoleGuard = ({ 
  children, 
  requiredRoles = [],
  requiredPermissions = [],
  requireAllPermissions = false,
  fallbackPath = '/dashboard',
  showAccessDenied = true 
}) => {
  const userRole = useSelector(selectUserRole)

  const hasRoleAccess = () => {
    if (!requiredRoles.length) return true
    return requiredRoles.includes(userRole)
  }

  const hasPermissionAccess = () => {
    if (!requiredPermissions.length) return true
    
    if (requireAllPermissions) {
      return requiredPermissions.every(permission => hasPermission(userRole, permission))
    } else {
      return hasAnyPermission(userRole, requiredPermissions)
    }
  }

  const hasAccess = hasRoleAccess() && hasPermissionAccess()

  if (!hasAccess) {
    if (showAccessDenied) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h2>
            <p className="text-gray-600 mb-6">
              You don't have the necessary permissions to access this page.
            </p>
            <div className="space-y-2 text-sm text-gray-500">
              <p><strong>Your Role:</strong> {userRole || 'Unknown'}</p>
              {requiredRoles.length > 0 && (
                <p><strong>Required Roles:</strong> {requiredRoles.join(', ')}</p>
              )}
            </div>
            <button
              onClick={() => window.history.back()}
              className="mt-6 btn btn-primary"
            >
              Go Back
            </button>
          </div>
        </div>
      )
    } else {
      return <Navigate to={fallbackPath} replace />
    }
  }

  return children
}

export const withRoleGuard = (Component, guardProps) => {
  return (props) => (
    <RoleGuard {...guardProps}>
      <Component {...props} />
    </RoleGuard>
  )
}

export const AdminOnly = ({ children, ...props }) => (
  <RoleGuard 
    requiredRoles={[USER_ROLES.ADMIN]} 
    {...props}
  >
    {children}
  </RoleGuard>
)

export const ComplianceOnly = ({ children, ...props }) => (
  <RoleGuard 
    requiredRoles={[USER_ROLES.COMPLIANCE_ADMIN, USER_ROLES.COMPLIANCE_USER]} 
    {...props}
  >
    {children}
  </RoleGuard>
)

export const ProductOnly = ({ children, ...props }) => (
  <RoleGuard 
    requiredRoles={[USER_ROLES.PRODUCT_ADMIN, USER_ROLES.PRODUCT_USER]} 
    {...props}
  >
    {children}
  </RoleGuard>
)

export const ManagerLevel = ({ children, ...props }) => (
  <RoleGuard 
    requiredRoles={[
      USER_ROLES.ADMIN, 
      USER_ROLES.SENIOR_MANAGER, 
      USER_ROLES.COMPLIANCE_ADMIN, 
      USER_ROLES.PRODUCT_ADMIN
    ]} 
    {...props}
  >
    {children}
  </RoleGuard>
)

export const SeniorAccess = ({ children, ...props }) => (
  <RoleGuard 
    requiredRoles={[USER_ROLES.ADMIN, USER_ROLES.SENIOR_MANAGER]} 
    {...props}
  >
    {children}
  </RoleGuard>
)

export default RoleGuard