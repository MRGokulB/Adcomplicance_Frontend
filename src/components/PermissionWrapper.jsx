import React from 'react'
import { useSelector } from 'react-redux'
import { selectUserRole } from '../redux/slices/authSlice'
import { hasPermission, hasAnyPermission, USER_ROLES, PERMISSIONS } from '../utils/roles'

const PermissionWrapper = ({ 
  children, 
  requiredRoles = [],
  requiredPermissions = [],
  requireAllPermissions = false,
  fallback = null,
  inverse = false  
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
  
  const shouldShow = inverse ? !hasAccess : hasAccess

  return shouldShow ? children : fallback
}

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

export const CanCloseTask = ({ children, fallback = null }) => (
  <PermissionWrapper 
    requiredPermissions={[PERMISSIONS.TASK_CLOSE]} 
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

export const usePermissions = () => {
  const userRole = useSelector(selectUserRole)
  
  return {
    userRole,
    hasPermission: (permission) => hasPermission(userRole, permission),
    hasAnyPermission: (permissions) => hasAnyPermission(userRole, permissions),
    hasRole: (role) => userRole === role,
    hasAnyRole: (roles) => roles.includes(userRole),
    
    canCreateTask: hasPermission(userRole, PERMISSIONS.TASK_CREATE),
    canApproveTask: hasPermission(userRole, PERMISSIONS.TASK_APPROVE),
    canClassifyTask: hasPermission(userRole, PERMISSIONS.TASK_CLASSIFY),
    canPublishTask: hasPermission(userRole, PERMISSIONS.TASK_PUBLISH),
    canCloseTask: hasPermission(userRole, PERMISSIONS.TASK_CLOSE),
    canReassignTask: hasPermission(userRole, PERMISSIONS.TASK_REASSIGN),  
    canValidateFiles: hasPermission(userRole, PERMISSIONS.TASK_VALIDATE_FILES),  
    canViewAssignmentOptions: hasPermission(userRole, PERMISSIONS.TASK_VIEW_ASSIGNMENT_OPTIONS),  
    canViewTaskBuckets: hasPermission(userRole, PERMISSIONS.TASK_VIEW_BUCKETS),
    canPerformBulkOperations: hasPermission(userRole, PERMISSIONS.BULK_OPERATIONS),

    canViewUserWorkload: hasPermission(userRole, PERMISSIONS.TASK_VIEW_USER_WORKLOAD),  
    canViewTeamOverview: hasPermission(userRole, PERMISSIONS.TASK_VIEW_TEAM_OVERVIEW),  
    canViewPerformanceMetrics: hasPermission(userRole, PERMISSIONS.TASK_VIEW_PERFORMANCE_METRICS),  
    canViewHealthCheck: hasPermission(userRole, PERMISSIONS.TASK_VIEW_HEALTH_CHECK),  
    canViewDashboardStats: hasPermission(userRole, PERMISSIONS.TASK_VIEW_DASHBOARD_STATS),  

    canManageUsers: hasAnyPermission(userRole, [
      PERMISSIONS.USER_CREATE_ANY,
      PERMISSIONS.USER_CREATE_PRODUCT, 
      PERMISSIONS.USER_CREATE_COMPLIANCE
    ]),
    canPromoteUser: hasPermission(userRole, PERMISSIONS.USER_PROMOTE),

    canUploadFiles: hasPermission(userRole, PERMISSIONS.UPLOAD_FILES),
    canManageUploads: hasPermission(userRole, PERMISSIONS.UPLOAD_MANAGE),

    canUploadVersion: hasPermission(userRole, PERMISSIONS.VERSION_UPLOAD),

    canManageExchangeApprovals: hasAnyPermission(userRole, [
      PERMISSIONS.EXCHANGE_CREATE,
      PERMISSIONS.EXCHANGE_UPDATE,
      PERMISSIONS.EXCHANGE_DELETE
    ]),

    canAccessReports: hasAnyPermission(userRole, [
      PERMISSIONS.REPORT_INTERNAL_TASKS,
      PERMISSIONS.REPORT_EXCHANGE_TASKS,
      PERMISSIONS.REPORT_COMPLIANCE_USERS,
      PERMISSIONS.REPORT_PRODUCT_USERS,
      PERMISSIONS.REPORT_EXPIRING_SOON,
      PERMISSIONS.REPORT_DAILY_MOVEMENT,
      PERMISSIONS.REPORT_REJECTED_TASKS
    ]),

    canViewAudit: hasAnyPermission(userRole, [
      PERMISSIONS.AUDIT_READ_ALL,
      PERMISSIONS.AUDIT_READ_LIMITED
    ]),

    canViewAllDashboard: hasPermission(userRole, PERMISSIONS.DASHBOARD_VIEW_ALL),
    canViewTeamDashboard: hasPermission(userRole, PERMISSIONS.DASHBOARD_VIEW_TEAM),
    canViewOwnDashboard: hasPermission(userRole, PERMISSIONS.DASHBOARD_VIEW_OWN),

    canConfigSystem: hasPermission(userRole, PERMISSIONS.SYSTEM_CONFIG),
    canOverrideSystem: hasPermission(userRole, PERMISSIONS.SYSTEM_OVERRIDE),
    canViewSystemStatus: hasPermission(userRole, PERMISSIONS.SYSTEM_STATUS),

    canAdvancedSearch: hasPermission(userRole, PERMISSIONS.ADVANCED_SEARCH),

    isAdmin: userRole === USER_ROLES.ADMIN,
    isSeniorManager: userRole === USER_ROLES.SENIOR_MANAGER,
    isComplianceUser: [USER_ROLES.COMPLIANCE_ADMIN, USER_ROLES.COMPLIANCE_USER].includes(userRole),
    isProductUser: [USER_ROLES.PRODUCT_ADMIN, USER_ROLES.PRODUCT_USER].includes(userRole),
    isManager: [USER_ROLES.ADMIN, USER_ROLES.SENIOR_MANAGER, USER_ROLES.COMPLIANCE_ADMIN, USER_ROLES.PRODUCT_ADMIN].includes(userRole)
  }
}

export default PermissionWrapper