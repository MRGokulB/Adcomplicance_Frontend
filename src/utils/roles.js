// src/utils/roles.js - Updated for new backend permissions

// User Roles - Exact backend roles
export const USER_ROLES = {
  ADMIN: 'ADMIN',
  SENIOR_MANAGER: 'SENIOR_MANAGER',
  COMPLIANCE_ADMIN: 'COMPLIANCE_ADMIN', 
  COMPLIANCE_USER: 'COMPLIANCE_USER',
  PRODUCT_ADMIN: 'PRODUCT_ADMIN',
  PRODUCT_USER: 'PRODUCT_USER'
}

// Permission Categories - Aligned with backend route permissions
export const PERMISSIONS = {
  // User Management - Updated based on backend routes
  USER_CREATE_ANY: 'user:create:any',
  USER_CREATE_PRODUCT: 'user:create:product',
  USER_CREATE_COMPLIANCE: 'user:create:compliance',
  USER_READ_ALL: 'user:read:all',
  USER_READ_TEAM: 'user:read:team',
  USER_UPDATE_ANY: 'user:update:any',
  USER_UPDATE_TEAM: 'user:update:team',
  USER_DELETE_ANY: 'user:delete:any',
  USER_RESET_PASSWORD: 'user:reset_password',
  USER_PROMOTE: 'user:promote',
  USER_VIEW_PROMOTION_ELIGIBLE: 'user:view_promotion_eligible',

  // Task Management - Updated with backend workflow
  TASK_CREATE: 'task:create',
  TASK_READ_ALL: 'task:read:all',
  TASK_READ_TEAM: 'task:read:team',
  TASK_READ_OWN: 'task:read:own',
  TASK_READ_ASSIGNED: 'task:read:assigned',
  TASK_UPDATE_ALL: 'task:update:all',
  TASK_UPDATE_OWN: 'task:update:own',
  TASK_UPDATE_STATUS: 'task:update:status',
  TASK_ASSIGN: 'task:assign',
  TASK_REASSIGN: 'task:reassign', 
  TASK_APPROVE: 'task:approve',
  TASK_REJECT: 'task:reject',
  TASK_PUBLISH: 'task:publish',
  TASK_CLASSIFY: 'task:classify',
  TASK_CLOSE: 'task:close',
  TASK_FOLLOW_UP: 'task:follow_up',
  TASK_VALIDATE_FILES: 'task:validate_files', 

  // Task Buckets - From backend
  TASK_VIEW_BUCKETS: 'task:view_buckets',
  TASK_VIEW_APPROVED_NOT_PUBLISHED: 'task:view_approved_not_published',
  TASK_VIEW_EXPIRING_SOON: 'task:view_expiring_soon',

  // Task Analytics & Monitoring - NEW permissions from backend routes
  TASK_VIEW_ASSIGNMENT_OPTIONS: 'task:view_assignment_options', // NEW
  TASK_VIEW_USER_WORKLOAD: 'task:view_user_workload', // NEW
  TASK_VIEW_TEAM_OVERVIEW: 'task:view_team_overview', // NEW
  TASK_VIEW_PERFORMANCE_METRICS: 'task:view_performance_metrics', // NEW
  TASK_VIEW_HEALTH_CHECK: 'task:view_health_check', // NEW
  TASK_VIEW_DASHBOARD_STATS: 'task:view_dashboard_stats', // NEW

  // Comments
  COMMENT_CREATE: 'comment:create',
  COMMENT_READ_ALL: 'comment:read:all',
  COMMENT_READ_TASK: 'comment:read:task',

  // Versions
  VERSION_UPLOAD: 'version:upload',
  VERSION_READ_ALL: 'version:read:all',

  // Exchange Approvals
  EXCHANGE_CREATE: 'exchange:create',
  EXCHANGE_UPDATE: 'exchange:update',
  EXCHANGE_DELETE: 'exchange:delete',
  EXCHANGE_READ_ALL: 'exchange:read:all',

  // Reports - Updated with backend restrictions
  REPORT_INTERNAL_TASKS: 'report:internal_tasks',
  REPORT_EXCHANGE_TASKS: 'report:exchange_tasks',
  REPORT_COMPLIANCE_USERS: 'report:compliance_users',
  REPORT_PRODUCT_USERS: 'report:product_users',
  REPORT_EXPIRING_SOON: 'report:expiring_soon',
  REPORT_DAILY_MOVEMENT: 'report:daily_movement',
  REPORT_REJECTED_TASKS: 'report:rejected_tasks',

  // Audit
  AUDIT_READ_ALL: 'audit:read:all',
  AUDIT_READ_LIMITED: 'audit:read:limited',
  AUDIT_EXPORT: 'audit:export',

  // Notifications
  NOTIFICATION_READ: 'notification:read',
  NOTIFICATION_MANAGE: 'notification:manage',

  // Absences
  ABSENCE_CREATE: 'absence:create',
  ABSENCE_READ_ALL: 'absence:read:all',
  ABSENCE_MANAGE: 'absence:manage',

  // Upload
  UPLOAD_FILES: 'upload:files',
  UPLOAD_MANAGE: 'upload:manage',
  UPLOAD_LIST: 'upload:list',

  // Dashboard
  DASHBOARD_VIEW_ALL: 'dashboard:view:all',
  DASHBOARD_VIEW_TEAM: 'dashboard:view:team',
  DASHBOARD_VIEW_OWN: 'dashboard:view:own',
  DASHBOARD_WORKLOAD_CHART: 'dashboard:workload_chart',
  DASHBOARD_PERFORMANCE_METRICS: 'dashboard:performance_metrics',

  // System
  SYSTEM_CONFIG: 'system:config',
  SYSTEM_OVERRIDE: 'system:override',
  SYSTEM_STATUS: 'system:status',

  // Bulk Operations
  BULK_OPERATIONS: 'bulk:operations',
  ADVANCED_SEARCH: 'search:advanced'
}

// Role to Permissions Mapping - Updated with new permissions
export const ROLE_PERMISSIONS = {
  [USER_ROLES.ADMIN]: [
    // Complete system access
    PERMISSIONS.USER_CREATE_ANY,
    PERMISSIONS.USER_READ_ALL,
    PERMISSIONS.USER_UPDATE_ANY,
    PERMISSIONS.USER_DELETE_ANY,
    PERMISSIONS.USER_RESET_PASSWORD,
    PERMISSIONS.USER_PROMOTE,
    PERMISSIONS.USER_VIEW_PROMOTION_ELIGIBLE,
    PERMISSIONS.TASK_READ_ALL,
    PERMISSIONS.TASK_UPDATE_ALL,
    PERMISSIONS.TASK_ASSIGN,
    PERMISSIONS.TASK_REASSIGN, // NEW
    PERMISSIONS.TASK_APPROVE,
    PERMISSIONS.TASK_REJECT,
    PERMISSIONS.TASK_PUBLISH,
    PERMISSIONS.TASK_CLASSIFY,
    PERMISSIONS.TASK_CLOSE,
    PERMISSIONS.TASK_FOLLOW_UP,
    PERMISSIONS.TASK_VALIDATE_FILES, // NEW
    PERMISSIONS.TASK_VIEW_BUCKETS,
    PERMISSIONS.TASK_VIEW_APPROVED_NOT_PUBLISHED,
    PERMISSIONS.TASK_VIEW_EXPIRING_SOON,
    PERMISSIONS.TASK_VIEW_ASSIGNMENT_OPTIONS, // NEW
    PERMISSIONS.TASK_VIEW_USER_WORKLOAD, // NEW
    PERMISSIONS.TASK_VIEW_TEAM_OVERVIEW, // NEW
    PERMISSIONS.TASK_VIEW_PERFORMANCE_METRICS, // NEW
    PERMISSIONS.TASK_VIEW_HEALTH_CHECK, // NEW
    PERMISSIONS.TASK_VIEW_DASHBOARD_STATS, // NEW
    PERMISSIONS.COMMENT_CREATE,
    PERMISSIONS.COMMENT_READ_ALL,
    PERMISSIONS.VERSION_READ_ALL,
    PERMISSIONS.EXCHANGE_CREATE,
    PERMISSIONS.EXCHANGE_UPDATE,
    PERMISSIONS.EXCHANGE_DELETE,
    PERMISSIONS.EXCHANGE_READ_ALL,
    PERMISSIONS.REPORT_INTERNAL_TASKS,
    PERMISSIONS.REPORT_EXCHANGE_TASKS,
    PERMISSIONS.REPORT_COMPLIANCE_USERS,
    PERMISSIONS.REPORT_PRODUCT_USERS,
    PERMISSIONS.REPORT_EXPIRING_SOON,
    PERMISSIONS.REPORT_DAILY_MOVEMENT,
    PERMISSIONS.REPORT_REJECTED_TASKS,
    PERMISSIONS.AUDIT_READ_ALL,
    PERMISSIONS.AUDIT_EXPORT,
    PERMISSIONS.NOTIFICATION_MANAGE,
    PERMISSIONS.ABSENCE_READ_ALL,
    PERMISSIONS.ABSENCE_MANAGE,
    PERMISSIONS.UPLOAD_FILES,
    PERMISSIONS.UPLOAD_MANAGE,
    PERMISSIONS.UPLOAD_LIST,
    PERMISSIONS.DASHBOARD_VIEW_ALL,
    PERMISSIONS.DASHBOARD_WORKLOAD_CHART,
    PERMISSIONS.DASHBOARD_PERFORMANCE_METRICS,
    PERMISSIONS.SYSTEM_CONFIG,
    PERMISSIONS.SYSTEM_OVERRIDE,
    PERMISSIONS.SYSTEM_STATUS,
    PERMISSIONS.BULK_OPERATIONS,
    PERMISSIONS.ADVANCED_SEARCH
  ],

  [USER_ROLES.SENIOR_MANAGER]: [
    PERMISSIONS.USER_READ_ALL,
    PERMISSIONS.USER_VIEW_PROMOTION_ELIGIBLE,
    PERMISSIONS.TASK_READ_ALL,
    PERMISSIONS.TASK_FOLLOW_UP,
    PERMISSIONS.TASK_CLOSE,
    PERMISSIONS.TASK_VIEW_BUCKETS,
    PERMISSIONS.TASK_VIEW_APPROVED_NOT_PUBLISHED,
    PERMISSIONS.TASK_VIEW_EXPIRING_SOON,
    PERMISSIONS.TASK_VIEW_USER_WORKLOAD, // NEW
    PERMISSIONS.TASK_VIEW_TEAM_OVERVIEW, // NEW
    PERMISSIONS.TASK_VIEW_PERFORMANCE_METRICS, // NEW
    PERMISSIONS.TASK_VIEW_HEALTH_CHECK, // NEW
    PERMISSIONS.TASK_VIEW_DASHBOARD_STATS, // NEW
    PERMISSIONS.COMMENT_CREATE,
    PERMISSIONS.COMMENT_READ_ALL,
    PERMISSIONS.VERSION_READ_ALL,
    PERMISSIONS.EXCHANGE_READ_ALL,
    PERMISSIONS.REPORT_INTERNAL_TASKS,
    PERMISSIONS.REPORT_EXCHANGE_TASKS,
    PERMISSIONS.REPORT_COMPLIANCE_USERS,
    PERMISSIONS.REPORT_PRODUCT_USERS,
    PERMISSIONS.REPORT_EXPIRING_SOON,
    PERMISSIONS.REPORT_DAILY_MOVEMENT,
    PERMISSIONS.REPORT_REJECTED_TASKS,
    PERMISSIONS.AUDIT_READ_ALL,
    PERMISSIONS.NOTIFICATION_READ,
    PERMISSIONS.ABSENCE_READ_ALL,
    PERMISSIONS.UPLOAD_FILES,
    PERMISSIONS.UPLOAD_LIST,
    PERMISSIONS.DASHBOARD_VIEW_ALL,
    PERMISSIONS.DASHBOARD_WORKLOAD_CHART,
    PERMISSIONS.DASHBOARD_PERFORMANCE_METRICS,
    PERMISSIONS.SYSTEM_STATUS,
    PERMISSIONS.BULK_OPERATIONS,
    PERMISSIONS.ADVANCED_SEARCH
  ],

  [USER_ROLES.COMPLIANCE_ADMIN]: [
    PERMISSIONS.USER_CREATE_COMPLIANCE,
    PERMISSIONS.USER_READ_ALL,
    PERMISSIONS.USER_UPDATE_TEAM,
    PERMISSIONS.USER_PROMOTE,
    PERMISSIONS.USER_VIEW_PROMOTION_ELIGIBLE,
    PERMISSIONS.TASK_READ_ALL,
    PERMISSIONS.TASK_UPDATE_STATUS,
    PERMISSIONS.TASK_APPROVE,
    PERMISSIONS.TASK_REJECT,
    PERMISSIONS.TASK_ASSIGN,
    PERMISSIONS.TASK_REASSIGN, // NEW
    PERMISSIONS.TASK_CLASSIFY,
    PERMISSIONS.TASK_CLOSE,
    PERMISSIONS.TASK_FOLLOW_UP,
    PERMISSIONS.TASK_VIEW_BUCKETS,
    PERMISSIONS.TASK_VIEW_APPROVED_NOT_PUBLISHED,
    PERMISSIONS.TASK_VIEW_EXPIRING_SOON,
    PERMISSIONS.TASK_VIEW_ASSIGNMENT_OPTIONS, // NEW
    PERMISSIONS.TASK_VIEW_USER_WORKLOAD, // NEW
    PERMISSIONS.TASK_VIEW_TEAM_OVERVIEW, // NEW
    PERMISSIONS.TASK_VIEW_PERFORMANCE_METRICS, // NEW
    PERMISSIONS.TASK_VIEW_DASHBOARD_STATS, // NEW
    PERMISSIONS.COMMENT_CREATE,
    PERMISSIONS.COMMENT_READ_ALL,
    PERMISSIONS.VERSION_READ_ALL,
    PERMISSIONS.EXCHANGE_CREATE,
    PERMISSIONS.EXCHANGE_UPDATE,
    PERMISSIONS.EXCHANGE_DELETE,
    PERMISSIONS.EXCHANGE_READ_ALL,
    PERMISSIONS.REPORT_INTERNAL_TASKS,
    PERMISSIONS.REPORT_EXCHANGE_TASKS,
    PERMISSIONS.REPORT_COMPLIANCE_USERS,
    PERMISSIONS.REPORT_PRODUCT_USERS,
    PERMISSIONS.REPORT_EXPIRING_SOON,
    PERMISSIONS.REPORT_REJECTED_TASKS,
    PERMISSIONS.AUDIT_READ_ALL,
    PERMISSIONS.AUDIT_EXPORT,
    PERMISSIONS.NOTIFICATION_READ,
    PERMISSIONS.ABSENCE_MANAGE,
    PERMISSIONS.UPLOAD_FILES,
    PERMISSIONS.DASHBOARD_VIEW_ALL,
    PERMISSIONS.DASHBOARD_WORKLOAD_CHART,
    PERMISSIONS.DASHBOARD_PERFORMANCE_METRICS,
    PERMISSIONS.BULK_OPERATIONS,
    PERMISSIONS.ADVANCED_SEARCH
  ],

  [USER_ROLES.COMPLIANCE_USER]: [
    PERMISSIONS.TASK_READ_ASSIGNED,
    PERMISSIONS.TASK_UPDATE_STATUS,
    PERMISSIONS.TASK_APPROVE,
    PERMISSIONS.TASK_REJECT,
    PERMISSIONS.TASK_CLASSIFY,
    PERMISSIONS.TASK_FOLLOW_UP,
    PERMISSIONS.TASK_VIEW_BUCKETS,
    PERMISSIONS.TASK_VIEW_DASHBOARD_STATS, // NEW
    PERMISSIONS.COMMENT_CREATE,
    PERMISSIONS.COMMENT_READ_TASK,
    PERMISSIONS.VERSION_READ_ALL,
    PERMISSIONS.EXCHANGE_CREATE,
    PERMISSIONS.EXCHANGE_UPDATE,
    PERMISSIONS.EXCHANGE_DELETE,
    PERMISSIONS.EXCHANGE_READ_ALL,
    PERMISSIONS.AUDIT_READ_LIMITED,
    PERMISSIONS.NOTIFICATION_READ,
    PERMISSIONS.UPLOAD_FILES,
    PERMISSIONS.DASHBOARD_VIEW_OWN,
    PERMISSIONS.ADVANCED_SEARCH
  ],

  [USER_ROLES.PRODUCT_ADMIN]: [
    PERMISSIONS.USER_CREATE_PRODUCT,
    PERMISSIONS.USER_READ_ALL, // ENHANCED: Product Admin can read all users
    PERMISSIONS.USER_UPDATE_TEAM,
    PERMISSIONS.USER_PROMOTE,
    PERMISSIONS.TASK_CREATE,
    PERMISSIONS.TASK_READ_TEAM,
    PERMISSIONS.TASK_UPDATE_OWN,
    PERMISSIONS.TASK_ASSIGN,
    PERMISSIONS.TASK_CLOSE,
    PERMISSIONS.TASK_REASSIGN, // NEW
    PERMISSIONS.TASK_PUBLISH,
    PERMISSIONS.TASK_VALIDATE_FILES, // NEW
    PERMISSIONS.TASK_VIEW_BUCKETS,
    PERMISSIONS.TASK_VIEW_APPROVED_NOT_PUBLISHED,
    PERMISSIONS.TASK_VIEW_ASSIGNMENT_OPTIONS, // NEW
    PERMISSIONS.TASK_VIEW_USER_WORKLOAD, // NEW
    PERMISSIONS.TASK_VIEW_TEAM_OVERVIEW, // NEW
    PERMISSIONS.TASK_VIEW_DASHBOARD_STATS, // NEW
    PERMISSIONS.COMMENT_CREATE,
    PERMISSIONS.COMMENT_READ_TASK,
    PERMISSIONS.VERSION_UPLOAD,
    PERMISSIONS.VERSION_READ_ALL,
    PERMISSIONS.REPORT_INTERNAL_TASKS,
    PERMISSIONS.REPORT_PRODUCT_USERS,
    PERMISSIONS.NOTIFICATION_READ,
    PERMISSIONS.UPLOAD_FILES,
    PERMISSIONS.DASHBOARD_VIEW_TEAM,
    PERMISSIONS.ADVANCED_SEARCH
  ],

  [USER_ROLES.PRODUCT_USER]: [
    PERMISSIONS.TASK_CREATE,
    PERMISSIONS.TASK_READ_OWN,
    PERMISSIONS.TASK_UPDATE_OWN,
    PERMISSIONS.TASK_PUBLISH,
    PERMISSIONS.TASK_VALIDATE_FILES, // NEW
    PERMISSIONS.TASK_VIEW_APPROVED_NOT_PUBLISHED,
    PERMISSIONS.TASK_VIEW_DASHBOARD_STATS, // NEW
    PERMISSIONS.USER_READ_TEAM, // NEW: Allow reading team users for task assignment
    PERMISSIONS.COMMENT_CREATE,
    PERMISSIONS.COMMENT_READ_TASK,
    PERMISSIONS.VERSION_UPLOAD,
    PERMISSIONS.NOTIFICATION_READ,
    PERMISSIONS.UPLOAD_FILES,
    PERMISSIONS.DASHBOARD_VIEW_OWN,
    PERMISSIONS.ADVANCED_SEARCH
  ]
}

// Helper Functions - Updated with new permissions
export const hasPermission = (userRole, permission) => {
  if (!userRole || !permission) return false
  return ROLE_PERMISSIONS[userRole]?.includes(permission) || false
}

export const hasAnyPermission = (userRole, permissions) => {
  if (!userRole || !permissions?.length) return false
  return permissions.some(permission => hasPermission(userRole, permission))
}

export const hasAllPermissions = (userRole, permissions) => {
  if (!userRole || !permissions?.length) return false
  return permissions.every(permission => hasPermission(userRole, permission))
}

// Backend-aligned helper functions - Updated with new functions
export const canCreateTask = (userRole) => {
  return hasPermission(userRole, PERMISSIONS.TASK_CREATE)
}

export const canClassifyTask = (userRole) => {
  return hasPermission(userRole, PERMISSIONS.TASK_CLASSIFY)
}

export const canApproveTask = (userRole) => {
  return hasPermission(userRole, PERMISSIONS.TASK_APPROVE)
}

export const canPublishTask = (userRole) => {
  return hasPermission(userRole, PERMISSIONS.TASK_PUBLISH)
}

export const canCloseTask = (userRole) => {
  return hasPermission(userRole, PERMISSIONS.TASK_CLOSE)
}

export const canUploadVersion = (userRole) => {
  return hasPermission(userRole, PERMISSIONS.VERSION_UPLOAD)
}

export const canViewTaskBuckets = (userRole) => {
  return hasPermission(userRole, PERMISSIONS.TASK_VIEW_BUCKETS)
}

export const canManageExchangeApprovals = (userRole) => {
  return hasAnyPermission(userRole, [
    PERMISSIONS.EXCHANGE_CREATE,
    PERMISSIONS.EXCHANGE_UPDATE,
    PERMISSIONS.EXCHANGE_DELETE
  ])
}

// NEW helper functions based on backend routes
export const canReassignTask = (userRole) => {
  return hasPermission(userRole, PERMISSIONS.TASK_REASSIGN)
}

export const canViewAssignmentOptions = (userRole) => {
  return hasPermission(userRole, PERMISSIONS.TASK_VIEW_ASSIGNMENT_OPTIONS)
}

export const canValidateFiles = (userRole) => {
  return hasPermission(userRole, PERMISSIONS.TASK_VALIDATE_FILES)
}

export const canViewUserWorkload = (userRole) => {
  return hasPermission(userRole, PERMISSIONS.TASK_VIEW_USER_WORKLOAD)
}

export const canViewTeamOverview = (userRole) => {
  return hasPermission(userRole, PERMISSIONS.TASK_VIEW_TEAM_OVERVIEW)
}

export const canViewPerformanceMetrics = (userRole) => {
  return hasPermission(userRole, PERMISSIONS.TASK_VIEW_PERFORMANCE_METRICS)
}

export const canViewHealthCheck = (userRole) => {
  return hasPermission(userRole, PERMISSIONS.TASK_VIEW_HEALTH_CHECK)
}

export const canViewDashboardStats = (userRole) => {
  return hasPermission(userRole, PERMISSIONS.TASK_VIEW_DASHBOARD_STATS)
}

export const canAccessReports = (userRole, reportType = null) => {
  if (!reportType) {
    return hasAnyPermission(userRole, [
      PERMISSIONS.REPORT_INTERNAL_TASKS,
      PERMISSIONS.REPORT_EXCHANGE_TASKS,
      PERMISSIONS.REPORT_COMPLIANCE_USERS,
      PERMISSIONS.REPORT_PRODUCT_USERS,
      PERMISSIONS.REPORT_EXPIRING_SOON,
      PERMISSIONS.REPORT_DAILY_MOVEMENT,
      PERMISSIONS.REPORT_REJECTED_TASKS
    ])
  }
  
  const reportPermissions = {
    'internal-tasks': PERMISSIONS.REPORT_INTERNAL_TASKS,
    'exchange-tasks': PERMISSIONS.REPORT_EXCHANGE_TASKS,
    'compliance-users': PERMISSIONS.REPORT_COMPLIANCE_USERS,
    'product-users': PERMISSIONS.REPORT_PRODUCT_USERS,
    'expiring-soon': PERMISSIONS.REPORT_EXPIRING_SOON,
    'daily-movement': PERMISSIONS.REPORT_DAILY_MOVEMENT,
    'rejected-tasks': PERMISSIONS.REPORT_REJECTED_TASKS
  }
  
  return hasPermission(userRole, reportPermissions[reportType])
}

export const canManageUsers = (userRole) => {
  return hasAnyPermission(userRole, [
    PERMISSIONS.USER_CREATE_ANY,
    PERMISSIONS.USER_CREATE_PRODUCT,
    PERMISSIONS.USER_CREATE_COMPLIANCE
  ])
}

export const canPromoteUser = (userRole) => {
  return hasPermission(userRole, PERMISSIONS.USER_PROMOTE)
}

export const canViewAudit = (userRole) => {
  return hasPermission(userRole, PERMISSIONS.AUDIT_READ_ALL) ||
         hasPermission(userRole, PERMISSIONS.AUDIT_READ_LIMITED)
}

export const canPerformBulkOperations = (userRole) => {
  return hasPermission(userRole, PERMISSIONS.BULK_OPERATIONS)
}

export const canExportAudit = (userRole) => {
  return hasPermission(userRole, PERMISSIONS.AUDIT_EXPORT)
}

export const canClassifyOrReclassifyTask = (userRole, task = null) => {
  if (!hasPermission(userRole, PERMISSIONS.TASK_CLASSIFY)) {
    return false
  } 
  if (task && task.taskType) {
    return [USER_ROLES.COMPLIANCE_ADMIN, USER_ROLES.ADMIN].includes(userRole)
  }
  return true
}

export const canCloseSpecificTask = (userRole, task = null, currentUserId = null) => {
  if (!hasPermission(userRole, PERMISSIONS.TASK_CLOSE)) {
    return false
  }
  
  // ADMIN, SENIOR_MANAGER, COMPLIANCE_ADMIN can close any task
  if ([USER_ROLES.ADMIN, USER_ROLES.SENIOR_MANAGER, USER_ROLES.COMPLIANCE_ADMIN].includes(userRole)) {
    return true
  }
  
  // PRODUCT_ADMIN can only close tasks they created or are assigned to
  if (userRole === USER_ROLES.PRODUCT_ADMIN && task && currentUserId) {
    return task.createdBy === currentUserId || 
           (task.assignedProductIds && task.assignedProductIds.includes(currentUserId))
  }
  
  return false
}

// Check if user can perform reclassification specifically
export const canReclassifyTask = (userRole) => {
  return [USER_ROLES.COMPLIANCE_ADMIN, USER_ROLES.ADMIN].includes(userRole)
}

// Check what classification actions are available to user
export const getClassificationActions = (userRole, task = null) => {
  if (!hasPermission(userRole, PERMISSIONS.TASK_CLASSIFY)) {
    return { canClassify: false, canReclassify: false }
  }
  
  const canClassify = !task || !task.taskType // Can classify if task has no type
  const canReclassify = task && task.taskType && canReclassifyTask(userRole) // Can reclassify if task has type and user has reclassify permission
  
  return { canClassify, canReclassify }
}

export const getClosureActions = (userRole, task = null, currentUserId = null) => {
  if (!hasPermission(userRole, PERMISSIONS.TASK_CLOSE)) {
    return { canClose: false, reason: 'No close permission' }
  }
 
  if ([USER_ROLES.ADMIN, USER_ROLES.SENIOR_MANAGER, USER_ROLES.COMPLIANCE_ADMIN].includes(userRole)) {
    return { canClose: true, reason: 'Admin access' }
  }
 
  if (userRole === USER_ROLES.PRODUCT_ADMIN) {
    if (!task || !currentUserId) {
      return { canClose: false, reason: 'Task or user information missing' }
    }
    
    const isCreator = task.createdBy === currentUserId
    const isAssigned = task.assignedProductIds && task.assignedProductIds.includes(currentUserId)
    
    if (isCreator || isAssigned) {
      return { canClose: true, reason: isCreator ? 'Task creator' : 'Task assigned' }
    }
    
    return { canClose: false, reason: 'Not creator or assigned to task' }
  }
  
  return { canClose: false, reason: 'Unknown role restriction' }
}

export default {
  USER_ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  canCreateTask,
  canClassifyTask,
  canApproveTask,
  canPublishTask,
  canCloseTask,
  canUploadVersion,
  canViewTaskBuckets,
  canManageExchangeApprovals,
  canReassignTask, // NEW
  canViewAssignmentOptions, // NEW
  canValidateFiles, // NEW
  canViewUserWorkload, // NEW
  canViewTeamOverview, // NEW
  canViewPerformanceMetrics, // NEW
  canViewHealthCheck, // NEW
  canViewDashboardStats, // NEW
  canAccessReports,
  canManageUsers,
  canPromoteUser,
  canViewAudit,
  canExportAudit,
  canPerformBulkOperations,
  canClassifyOrReclassifyTask,
  canCloseSpecificTask,
  canReclassifyTask,
  getClassificationActions,
  getClosureActions
}