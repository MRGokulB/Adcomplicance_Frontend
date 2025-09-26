import { useState } from 'react';
import { useSelector } from 'react-redux';
import { selectUserRole, selectIsAuthenticated } from '../../redux/slices/authSlice';
import { hasPermission, PERMISSIONS } from '../../utils/roles';
import { 
  useGetAuditLogsQuery,
  useGetAuditStatsQuery,
  useLazyExportAuditDataQuery,
} from '../../redux/api/auditApi';
import { useGetUsersQuery } from '../../redux/api/usersApi';

const AuditLog = () => {
  const userRole = useSelector(selectUserRole);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  console.log('Is authenticated:', isAuthenticated);
  
  const [filters, setFilters] = useState({
    page: 1,
    limit: 50,
    dateFrom: '',
    dateTo: '',
    action: '',
    performedBy: '',
    taskId: '',
  });

  // FIXED: Check permissions using correct backend-aligned roles
  const canViewFullAudit = hasPermission(userRole, PERMISSIONS.AUDIT_READ_ALL);
  const canViewLimitedAudit = hasPermission(userRole, PERMISSIONS.AUDIT_READ_LIMITED);
  const canExportAudit = hasPermission(userRole, PERMISSIONS.AUDIT_EXPORT);

  if (!canViewFullAudit && !canViewLimitedAudit) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h2>
          <p className="text-gray-600">You don't have permission to access audit logs.</p>
        </div>
      </div>
    );
  }

  // API Queries - Using corrected API endpoints
  const { 
    data: auditData, 
    isLoading: isAuditLoading, 
    error: auditError,
    refetch: refetchAudit
  } = useGetAuditLogsQuery(filters, {
    pollingInterval: 60000, // Refresh every minute
    refetchOnMountOrArgChange: true,
  });

  const { 
    data: statsData, 
    isLoading: isStatsLoading 
  } = useGetAuditStatsQuery({
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
  }, {
    pollingInterval: 300000, // Refresh every 5 minutes
  });

  const { data: usersData } = useGetUsersQuery({ limit: 100 });
  const [exportAuditData] = useLazyExportAuditDataQuery();

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
      page: field !== 'page' ? 1 : value // Reset page when other filters change
    }));
  };

  // FIXED: Export handling to work with backend JSON response
  const handleExport = async (format = 'csv') => {
    if (!canExportAudit) return;

    try {
      const exportParams = {
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        performedBy: filters.performedBy,
        action: filters.action,
        // Note: taskId not supported in export endpoint per backend spec
      };
      
      const result = await exportAuditData(exportParams).unwrap();
      
      // Backend returns { message, count, data } - use the data array
      const exportData = result.data || [];
      let fileContent;
      let mimeType;
      let fileExtension;

      if (format === 'csv') {
        if (exportData.length > 0) {
          const headers = Object.keys(exportData[0]).join(',');
          const rows = exportData.map(row => 
            Object.values(row).map(value => 
              typeof value === 'string' && (value.includes(',') || value.includes('"')) 
                ? `"${value.replace(/"/g, '""')}"` 
                : value
            ).join(',')
          );
          fileContent = [headers, ...rows].join('\n');
        } else {
          fileContent = 'No data available';
        }
        mimeType = 'text/csv';
        fileExtension = 'csv';
      } else {
        fileContent = JSON.stringify(exportData, null, 2);
        mimeType = 'application/json';
        fileExtension = 'json';
      }
      
      const blob = new Blob([fileContent], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit_log_${new Date().toISOString().split('T')[0]}.${fileExtension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'PRODUCT_USER':
        return 'badge badge-primary';
      case 'COMPLIANCE_USER':
        return 'badge badge-warning';
      case 'PRODUCT_ADMIN':
        return 'badge badge-success';
      case 'COMPLIANCE_ADMIN':
        return 'badge badge-info';
      case 'SENIOR_MANAGER':
        return 'badge badge-secondary';
      case 'ADMIN':
        return 'badge badge-error';
      case 'SYSTEM':
        return 'badge badge-neutral';
      default:
        return 'badge badge-secondary';
    }
  };

  const getActionIcon = (action) => {
    switch (action) {
      case 'TASK_CREATED':
        return <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>;
      case 'TASK_APPROVED':
        return <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>;
      case 'TASK_REJECTED':
        return <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>;
      case 'VERSION_UPLOADED':
        return <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>;
      case 'COMMENT_ADDED':
        return <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>;
      case 'USER_LOGIN':
        return <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>;
      default:
        return <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
    }
  };

  const handleTaskClick = (taskUin) => {
    if (taskUin) {
      window.open(`/tasks/${taskUin}`, '_blank');
    }
  };

  // Get filter options from API data
  const getFilterOptions = () => {
    const users = usersData?.users?.map(user => ({
      value: user.id,
      label: user.fullName
    })) || [];

    const actionTypes = [
      'TASK_CREATED', 'TASK_UPDATED', 'TASK_APPROVED', 'TASK_REJECTED', 
      'TASK_PUBLISHED', 'VERSION_UPLOADED', 'COMMENT_ADDED', 
      'USER_LOGIN', 'USER_LOGOUT', 'EXCHANGE_APPROVAL_UPDATED'
    ];

    return { users, actionTypes };
  };

  const { users, actionTypes } = getFilterOptions();
  const auditLogs = auditData?.auditLogs || [];
  const pagination = auditData?.pagination || {};

  if (auditError) {
    return (
      <div className="container-lg">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Failed to load audit logs. Please try again.</p>
          <button 
            onClick={refetchAudit}
            className="mt-2 btn btn-primary btn-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container-lg section-md">
      {/* Header */}
      <div className="flex-between items-center mb-6">
        <div>
          <h1 className="text-heading-1">Audit Log Viewer</h1>
          <p className="text-body text-gray-600 mt-1">
            Track every meaningful action for compliance, accountability, and traceability
          </p>
        </div>
        
        {canExportAudit && (
          <div className="flex gap-2">
            <button 
              onClick={() => handleExport('csv')}
              className="btn btn-outline"
              disabled={!auditLogs.length}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export CSV
            </button>
            <button 
              onClick={() => handleExport('json')}
              className="btn btn-secondary"
              disabled={!auditLogs.length}
            >
              Export JSON
            </button>
          </div>
        )}
      </div>

      {/* Statistics Cards - CORRECTED backend response structure */}
      {statsData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="card">
            <div className="card-body">
              <div className="text-2xl font-bold text-gray-900">
                {isStatsLoading ? '...' : (statsData.summary?.totalLogs || 0)}
              </div>
              <div className="text-sm text-gray-600">Total Actions</div>
            </div>
          </div>
          <div className="card">
            <div className="card-body">
              <div className="text-2xl font-bold text-blue-600">
                {isStatsLoading ? '...' : (statsData.summary?.uniqueUsers || 0)}
              </div>
              <div className="text-sm text-gray-600">Active Users</div>
            </div>
          </div>
          <div className="card">
            <div className="card-body">
              <div className="text-2xl font-bold text-green-600">
                {isStatsLoading ? '...' : (statsData.summary?.tasksAffected || 0)}
              </div>
              <div className="text-sm text-gray-600">Tasks Processed</div>
            </div>
          </div>
          <div className="card">
            <div className="card-body">
              <div className="text-2xl font-bold text-yellow-600">
                {isStatsLoading ? '...' : (statsData.actionDistribution?.length || 0)}
              </div>
              <div className="text-sm text-gray-600">Action Types</div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card mb-6">
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="exchange-form-label">Date From</label>
              <input
                type="date"
                className="exchange-date-input"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              />
            </div>

            <div>
              <label className="exchange-form-label">Date To</label>
              <input
                type="date"
                className="exchange-date-input"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div>
              <label className="exchange-form-label">Performed By</label>
              <select
                className="exchange-form-select"
                value={filters.performedBy}
                onChange={(e) => handleFilterChange('performedBy', e.target.value)}
              >
                <option value="">All Users</option>
                {users.map(user => (
                  <option key={user.value} value={user.value}>{user.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="exchange-form-label">Action Type</label>
              <select
                className="exchange-form-select"
                value={filters.action}
                onChange={(e) => handleFilterChange('action', e.target.value)}
              >
                <option value="">All Actions</option>
                {actionTypes.map(type => (
                  <option key={type} value={type}>{type.replace('_', ' ')}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="exchange-form-label">Task ID</label>
              <input
                type="text"
                className="input"
                placeholder="Filter by task ID..."
                value={filters.taskId}
                onChange={(e) => handleFilterChange('taskId', e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isAuditLoading && (
        <div className="card">
          <div className="card-body text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading audit logs...</p>
          </div>
        </div>
      )}

      {/* Audit Log Table */}
      {!isAuditLoading && (
        <div className="card">
          <div className="table-container">
            <table className="table table-modern">
              <thead className="table-header">
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>Performed By</th>
                  <th>Role</th>
                  <th>Task</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <span className="text-sm text-gray-700">
                        {formatTimestamp(log.timestamp)}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        {getActionIcon(log.action)}
                        <span className="badge badge-primary text-xs">
                          {log.action?.replace('_', ' ') || 'Unknown'}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="font-medium text-gray-900">
                        {log.performedBy?.name || 'System'}
                      </span> 
                    </td>
                    <td>
                      <span className={getRoleBadgeClass(log.performedBy?.role)}>
                        {log.performedBy?.role?.replace('_', ' ') || 'N/A'}
                      </span>
                    </td>
                    <td>
                      {log.task ? (
                        <div>
                          <button
                            className="text-blue-600 hover:text-blue-800 underline text-sm font-medium"
                            onClick={() => handleTaskClick(log.task.uin)}
                          >
                            {log.task.uin}
                          </button>
                           
                        </div>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                    <td>
                      <span className="text-sm text-gray-700">
                        {log.details || 'No details available'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Empty State */}
          {auditLogs.length === 0 && (
            <div className="card-body text-center py-12">
              <div className="table-empty">
                <svg className="table-empty-icon" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
                <h3 className="table-empty-title">No Audit Logs Found</h3>
                <p className="table-empty-description">
                  No audit logs match the current filters. Try adjusting your search criteria.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-gray-700">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.totalCount)} of{' '}
            {pagination.totalCount} results
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => handleFilterChange('page', pagination.page - 1)}
              disabled={!pagination.hasPrev}
              className="btn btn-outline btn-sm"
            >
              Previous
            </button>
            <button
              onClick={() => handleFilterChange('page', pagination.page + 1)}
              disabled={!pagination.hasNext}
              className="btn btn-outline btn-sm"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Export Rights Notice - UPDATED to show correct export permissions */}
      {!canExportAudit && canViewFullAudit && (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span className="text-sm text-yellow-800">
              Export functionality requires COMPLIANCE_ADMIN or ADMIN role.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLog;