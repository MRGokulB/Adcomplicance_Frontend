import React from 'react'
import { useSelector } from 'react-redux'
import { selectUserRole } from '../redux/slices/authSlice'
import { hasPermission, hasAnyPermission, USER_ROLES, PERMISSIONS } from '../utils/roles'

// Wrapper component for conditional rendering based on permissions
const PermissionWrapper = ({ 
  children, 
  requiredRoles = [],
  requiredPermissions = [],
  requireAllPermissions = false,
  fallback = null,
  inverse = false // Show when user DOESN'T have permission
}) => {
  const userRole = useSelector(selectUserRole)

  // Check role access
  const hasRoleAccess = () => {
    if (!requiredRoles.length) return true
    return requiredRoles.includes(userRole)
  }

  // Check permission access
  const hasPermissionAccess = () => {
    if (!requiredPermissions.length) return true
    
    if (requireAllPermissions) {
      return requiredPermissions.every(permission => hasPermission(userRole, permission))
    } else {
      return hasAnyPermission(userRole, requiredPermissions)
    }
  }

  const hasAccess = hasRoleAccess() && hasPermissionAccess()
  
  // Apply inverse logic if needed
  const shouldShow = inverse ? !hasAccess : hasAccess

  return shouldShow ? children : fallback
}

// Existing specific permission wrappers
export const CanCreateTask = ({ children, fallback = null }) => (
  <PermissionWrapper 
    requiredPermissions={[PERMISSIONS.TASK_CREATE]} 
    fallback={fallback}
  >
    {children}
  </PermissionWrapper>
)

export const CanApproveTask = ({ children, fallback = null }) => (
  <PermissionWrapper 
    requiredPermissions={[PERMISSIONS.TASK_APPROVE]} 
    fallback={fallback}
  >
    {children}
  </PermissionWrapper>
)

export const CanManageUsers = ({ children, fallback = null }) => (
  <PermissionWrapper 
    requiredPermissions={[
      PERMISSIONS.USER_CREATE_ANY,
      PERMISSIONS.USER_CREATE_PRODUCT,
      PERMISSIONS.USER_CREATE_COMPLIANCE
    ]} 
    requireAllPermissions={false}
    fallback={fallback}
  >
    {children}
  </PermissionWrapper>
)

export const CanClassifyTask = ({ children, fallback = null }) => (
  <PermissionWrapper 
    requiredPermissions={[PERMISSIONS.TASK_CLASSIFY]} 
    fallback={fallback}
  >
    {children}
  </PermissionWrapper>
)

export const CanPromoteUser = ({ children, fallback = null }) => (
  <PermissionWrapper 
    requiredPermissions={[PERMISSIONS.USER_PROMOTE]} 
    fallback={fallback}
  >
    {children}
  </PermissionWrapper>
)

export const CanViewTaskBuckets = ({ children, fallback = null }) => (
  <PermissionWrapper 
    requiredPermissions={[PERMISSIONS.TASK_VIEW_BUCKETS]} 
    fallback={fallback}
  >
    {children}
  </PermissionWrapper>
)

// NEW: Additional specific permission wrappers for new backend routes
export const CanReassignTask = ({ children, fallback = null }) => (
  <PermissionWrapper 
    requiredPermissions={[PERMISSIONS.TASK_REASSIGN]} 
    fallback={fallback}
  >
    {children}
  </PermissionWrapper>
)

export const CanValidateFiles = ({ children, fallback = null }) => (
  <PermissionWrapper 
    requiredPermissions={[PERMISSIONS.TASK_VALIDATE_FILES]} 
    fallback={fallback}
  >
    {children}
  </PermissionWrapper>
)

export const CanViewUserWorkload = ({ children, fallback = null }) => (
  <PermissionWrapper 
    requiredPermissions={[PERMISSIONS.TASK_VIEW_USER_WORKLOAD]} 
    fallback={fallback}
  >
    {children}
  </PermissionWrapper>
)

export const CanViewTeamOverview = ({ children, fallback = null }) => (
  <PermissionWrapper 
    requiredPermissions={[PERMISSIONS.TASK_VIEW_TEAM_OVERVIEW]} 
    fallback={fallback}
  >
    {children}
  </PermissionWrapper>
)

export const CanViewPerformanceMetrics = ({ children, fallback = null }) => (
  <PermissionWrapper 
    requiredPermissions={[PERMISSIONS.TASK_VIEW_PERFORMANCE_METRICS]} 
    fallback={fallback}
  >
    {children}
  </PermissionWrapper>
)

export const CanViewHealthCheck = ({ children, fallback = null }) => (
  <PermissionWrapper 
    requiredPermissions={[PERMISSIONS.TASK_VIEW_HEALTH_CHECK]} 
    fallback={fallback}
  >
    {children}
  </PermissionWrapper>
)

export const CanViewDashboardStats = ({ children, fallback = null }) => (
  <PermissionWrapper 
    requiredPermissions={[PERMISSIONS.TASK_VIEW_DASHBOARD_STATS]} 
    fallback={fallback}
  >
    {children}
  </PermissionWrapper>
)

export const CanViewAssignmentOptions = ({ children, fallback = null }) => (
  <PermissionWrapper 
    requiredPermissions={[PERMISSIONS.TASK_VIEW_ASSIGNMENT_OPTIONS]} 
    fallback={fallback}
  >
    {children}
  </PermissionWrapper>
)

export const CanPerformBulkOperations = ({ children, fallback = null }) => (
  <PermissionWrapper 
    requiredPermissions={[PERMISSIONS.BULK_OPERATIONS]} 
    fallback={fallback}
  >
    {children}
  </PermissionWrapper>
)

// Existing role-based wrappers
export const AdminOnly = ({ children, fallback = null }) => (
  <PermissionWrapper 
    requiredRoles={[USER_ROLES.ADMIN]} 
    fallback={fallback}
  >
    {children}
  </PermissionWrapper>
)

export const ComplianceAccess = ({ children, fallback = null }) => (
  <PermissionWrapper 
    requiredRoles={[USER_ROLES.COMPLIANCE_ADMIN, USER_ROLES.COMPLIANCE_USER]} 
    fallback={fallback}
  >
    {children}
  </PermissionWrapper>
)

export const ProductAccess = ({ children, fallback = null }) => (
  <PermissionWrapper 
    requiredRoles={[USER_ROLES.PRODUCT_ADMIN, USER_ROLES.PRODUCT_USER]} 
    fallback={fallback}
  >
    {children}
  </PermissionWrapper>
)

export const ManagerAccess = ({ children, fallback = null }) => (
  <PermissionWrapper 
    requiredRoles={[
      USER_ROLES.ADMIN, 
      USER_ROLES.SENIOR_MANAGER, 
      USER_ROLES.COMPLIANCE_ADMIN, 
      USER_ROLES.PRODUCT_ADMIN
    ]} 
    fallback={fallback}
  >
    {children}
  </PermissionWrapper>
)

export const SeniorManagerAccess = ({ children, fallback = null }) => (
  <PermissionWrapper 
    requiredRoles={[USER_ROLES.ADMIN, USER_ROLES.SENIOR_MANAGER]} 
    fallback={fallback}
  >
    {children}
  </PermissionWrapper>
)

// UPDATED Hook for checking permissions in components with NEW permissions
export const usePermissions = () => {
  const userRole = useSelector(selectUserRole)
  
  return {
    userRole,
    hasPermission: (permission) => hasPermission(userRole, permission),
    hasAnyPermission: (permissions) => hasAnyPermission(userRole, permissions),
    hasRole: (role) => userRole === role,
    hasAnyRole: (roles) => roles.includes(userRole),
    
    // Task permissions - Updated with new ones
    canCreateTask: hasPermission(userRole, PERMISSIONS.TASK_CREATE),
    canApproveTask: hasPermission(userRole, PERMISSIONS.TASK_APPROVE),
    canClassifyTask: hasPermission(userRole, PERMISSIONS.TASK_CLASSIFY),
    canPublishTask: hasPermission(userRole, PERMISSIONS.TASK_PUBLISH),
    canCloseTask: hasPermission(userRole, PERMISSIONS.TASK_CLOSE),
    canReassignTask: hasPermission(userRole, PERMISSIONS.TASK_REASSIGN), // NEW
    canValidateFiles: hasPermission(userRole, PERMISSIONS.TASK_VALIDATE_FILES), // NEW
    canViewAssignmentOptions: hasPermission(userRole, PERMISSIONS.TASK_VIEW_ASSIGNMENT_OPTIONS), // NEW
    canViewTaskBuckets: hasPermission(userRole, PERMISSIONS.TASK_VIEW_BUCKETS),
    canPerformBulkOperations: hasPermission(userRole, PERMISSIONS.BULK_OPERATIONS),

    // Analytics permissions - NEW
    canViewUserWorkload: hasPermission(userRole, PERMISSIONS.TASK_VIEW_USER_WORKLOAD), // NEW
    canViewTeamOverview: hasPermission(userRole, PERMISSIONS.TASK_VIEW_TEAM_OVERVIEW), // NEW
    canViewPerformanceMetrics: hasPermission(userRole, PERMISSIONS.TASK_VIEW_PERFORMANCE_METRICS), // NEW
    canViewHealthCheck: hasPermission(userRole, PERMISSIONS.TASK_VIEW_HEALTH_CHECK), // NEW
    canViewDashboardStats: hasPermission(userRole, PERMISSIONS.TASK_VIEW_DASHBOARD_STATS), // NEW

    // User management permissions
    canManageUsers: hasAnyPermission(userRole, [
      PERMISSIONS.USER_CREATE_ANY,
      PERMISSIONS.USER_CREATE_PRODUCT, 
      PERMISSIONS.USER_CREATE_COMPLIANCE
    ]),
    canPromoteUser: hasPermission(userRole, PERMISSIONS.USER_PROMOTE),

    // Upload permissions
    canUploadFiles: hasPermission(userRole, PERMISSIONS.UPLOAD_FILES),
    canManageUploads: hasPermission(userRole, PERMISSIONS.UPLOAD_MANAGE),

    // Version permissions
    canUploadVersion: hasPermission(userRole, PERMISSIONS.VERSION_UPLOAD),

    // Exchange permissions
    canManageExchangeApprovals: hasAnyPermission(userRole, [
      PERMISSIONS.EXCHANGE_CREATE,
      PERMISSIONS.EXCHANGE_UPDATE,
      PERMISSIONS.EXCHANGE_DELETE
    ]),

    // Report permissions - Updated to use new helper function
    canAccessReports: hasAnyPermission(userRole, [
      PERMISSIONS.REPORT_INTERNAL_TASKS,
      PERMISSIONS.REPORT_EXCHANGE_TASKS,
      PERMISSIONS.REPORT_COMPLIANCE_USERS,
      PERMISSIONS.REPORT_PRODUCT_USERS,
      PERMISSIONS.REPORT_EXPIRING_SOON,
      PERMISSIONS.REPORT_DAILY_MOVEMENT,
      PERMISSIONS.REPORT_REJECTED_TASKS
    ]),

    // Audit permissions
    canViewAudit: hasAnyPermission(userRole, [
      PERMISSIONS.AUDIT_READ_ALL,
      PERMISSIONS.AUDIT_READ_LIMITED
    ]),

    // Dashboard permissions
    canViewAllDashboard: hasPermission(userRole, PERMISSIONS.DASHBOARD_VIEW_ALL),
    canViewTeamDashboard: hasPermission(userRole, PERMISSIONS.DASHBOARD_VIEW_TEAM),
    canViewOwnDashboard: hasPermission(userRole, PERMISSIONS.DASHBOARD_VIEW_OWN),

    // System permissions
    canConfigSystem: hasPermission(userRole, PERMISSIONS.SYSTEM_CONFIG),
    canOverrideSystem: hasPermission(userRole, PERMISSIONS.SYSTEM_OVERRIDE),
    canViewSystemStatus: hasPermission(userRole, PERMISSIONS.SYSTEM_STATUS),

    // Advanced search
    canAdvancedSearch: hasPermission(userRole, PERMISSIONS.ADVANCED_SEARCH),

    // Role checks
    isAdmin: userRole === USER_ROLES.ADMIN,
    isSeniorManager: userRole === USER_ROLES.SENIOR_MANAGER,
    isComplianceUser: [USER_ROLES.COMPLIANCE_ADMIN, USER_ROLES.COMPLIANCE_USER].includes(userRole),
    isProductUser: [USER_ROLES.PRODUCT_ADMIN, USER_ROLES.PRODUCT_USER].includes(userRole),
    isManager: [USER_ROLES.ADMIN, USER_ROLES.SENIOR_MANAGER, USER_ROLES.COMPLIANCE_ADMIN, USER_ROLES.PRODUCT_ADMIN].includes(userRole)
  }
}

export default PermissionWrapper