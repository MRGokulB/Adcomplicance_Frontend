import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { selectUserRole } from '../../../redux/slices/authSlice';
import { hasPermission, PERMISSIONS } from '../../../utils/roles';
import { useGetComplianceUsersReportQuery, useGetProductUsersReportQuery } from '../../../redux/api/reportsApi';
import ReportFilters from '../common/ReportFilters';
import ReportTable from '../common/ReportTable';
import ExportButtons from '../common/ExportButtons';

const UserWiseReport = ({ type, onTypeChange }) => {
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    userId: ''
  });

  // NEW: Store raw unfiltered data
  const [rawData, setRawData] = useState(null);
  const [filteredData, setFilteredData] = useState(null);

  const userRole = useSelector(selectUserRole);

  // Check permissions for current report type
  const canAccessCompliance = hasPermission(userRole, PERMISSIONS.REPORT_COMPLIANCE_USERS);
  const canAccessProduct = hasPermission(userRole, PERMISSIONS.REPORT_PRODUCT_USERS);

  // NEW: Only send date filters to API, not userId
  const apiFilters = {
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo
  };

  // Conditional API calls based on report type AND permissions
  const { 
    data: complianceData, 
    isLoading: isComplianceLoading, 
    error: complianceError,
    refetch: refetchCompliance
  } = useGetComplianceUsersReportQuery(apiFilters, {
    skip: type !== 'compliance' || !canAccessCompliance,
    pollingInterval: 60000,
    refetchOnMountOrArgChange: true,
  });

  const { 
    data: productData, 
    isLoading: isProductLoading, 
    error: productError,
    refetch: refetchProduct
  } = useGetProductUsersReportQuery(apiFilters, {
    skip: type !== 'product' || !canAccessProduct,
    pollingInterval: 60000,
    refetchOnMountOrArgChange: true,
  });

  // NEW: Apply frontend filtering whenever data or userId filter changes
  useEffect(() => {
    const currentData = type === 'compliance' ? complianceData : productData;
    if (!currentData) return;

    setRawData(currentData);

    // Apply userId filter on frontend
    if (filters.userId) {
      const filtered = currentData.data.filter(user => user.userId === filters.userId);
      
      // Recalculate summary for filtered data
      const summary = type === 'compliance' 
        ? {
            totalUsers: filtered.length,
            totalTasksAssigned: filtered.reduce((sum, u) => sum + u.totalAssigned, 0),
            totalPending: filtered.reduce((sum, u) => sum + u.pending, 0),
            totalApproved: filtered.reduce((sum, u) => sum + u.approved, 0),
            avgProductivity: filtered.length > 0 
              ? Math.round(filtered.reduce((sum, u) => sum + u.productivityScore, 0) / filtered.length) 
              : 0
          }
        : {
            totalUsers: filtered.length,
            totalTasksCreated: filtered.reduce((sum, u) => sum + u.tasksCreated, 0),
            totalVersionsUploaded: filtered.reduce((sum, u) => sum + u.versionsUploaded, 0),
            totalCommentsAdded: filtered.reduce((sum, u) => sum + u.commentsAdded, 0),
            totalPublished: filtered.reduce((sum, u) => sum + u.publishedTasks, 0)
          };

      setFilteredData({ summary, data: filtered });
    } else {
      setFilteredData(currentData);
    }
  }, [complianceData, productData, filters.userId, type]);

  // Handle permission-based access control
  if (type === 'compliance' && !canAccessCompliance) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <svg className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-yellow-800">Access Restricted</h3>
              <p className="text-sm text-yellow-700 mt-1">
                You don't have permission to view compliance users reports.
              </p>
              {canAccessProduct && (
                <button
                  onClick={() => onTypeChange('product')}
                  className="mt-2 btn btn-primary btn-sm"
                >
                  Switch to Product Users Report
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'product' && !canAccessProduct) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <svg className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-yellow-800">Access Restricted</h3>
              <p className="text-sm text-yellow-700 mt-1">
                You don't have permission to view product users reports.
              </p>
              {canAccessCompliance && (
                <button
                  onClick={() => onTypeChange('compliance')}
                  className="mt-2 btn btn-primary btn-sm"
                >
                  Switch to Compliance Users Report
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // CHANGED: Use filteredData instead of currentData
  const isLoading = type === 'compliance' ? isComplianceLoading : isProductLoading;
  const error = type === 'compliance' ? complianceError : productError;
  const refetch = type === 'compliance' ? refetchCompliance : refetchProduct;

  // Different columns based on user type
  const complianceColumns = [
    { id: 'fullName', label: 'Name', sortable: true },
    { id: 'username', label: 'Username', sortable: true },
    { id: 'role', label: 'Role', sortable: true },
    { id: 'totalAssigned', label: 'Tasks Assigned', sortable: true },
    { id: 'pending', label: 'Pending Review', sortable: true },
    { id: 'approved', label: 'Approved', sortable: true },
    { id: 'rejected', label: 'Rejected', sortable: true },
    { id: 'avgApprovalTimeDays', label: 'Avg Approval Time (days)', sortable: true },
    { id: 'absenceDays', label: 'Absent Days', sortable: true },
    { id: 'productivityScore', label: 'Productivity Score', sortable: true }
  ];

  const productColumns = [
    { id: 'fullName', label: 'Name', sortable: true },
    { id: 'username', label: 'Username', sortable: true },
    { id: 'role', label: 'Role', sortable: true },
    { id: 'team', label: 'Team', sortable: true },
    { id: 'tasksCreated', label: 'Tasks Created', sortable: true },
    { id: 'tasksAssigned', label: 'Tasks Assigned', sortable: true },
    { id: 'versionsUploaded', label: 'Versions Uploaded', sortable: true },
    { id: 'commentsAdded', label: 'Comments Added', sortable: true },
    { id: 'publishedTasks', label: 'Published Tasks', sortable: true },
    { id: 'reopenedTasks', label: 'Reopened Tasks', sortable: true },
    { id: 'activityScore', label: 'Activity Score', sortable: true }
  ];

  // Get current columns and data for export
  const currentColumns = type === 'compliance' ? complianceColumns : productColumns;
  
  // CHANGED: Get user options from rawData instead of filteredData
  const getUserFilterOptions = () => {
    if (!rawData?.data) return [];
    return rawData.data.map(user => ({
      value: user.userId,
      label: user.fullName
    }));
  };

  const filterOptions = {
    users: getUserFilterOptions()
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  // Transform API data for table display
  const transformData = (apiData) => {
    if (!apiData?.data) return [];
    return apiData.data.map(item => ({
      id: item.userId,
      ...item
    }));
  };

  // CHANGED: Use filteredData instead of currentData
  const tableData = transformData(filteredData);
  const summary = filteredData?.summary || {};

  // Only show API errors for reports the user has permission to access
  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">
            Failed to load {type} users report. Please try again.
          </p>
          <button 
            onClick={refetch}
            className="mt-2 btn btn-primary btn-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex-between mb-4">
        <h2 className="text-heading-3">
          {type === 'compliance' ? 'Compliance Users Report' : 'Product Users Report'}
        </h2>
        <ExportButtons 
          data={tableData}
          columns={currentColumns}
          filename={`${type}-users-report`}
          isLoading={isLoading}
        />
      </div>

      <ReportFilters 
        filters={filters}
        onFilterChange={handleFilterChange}
        options={filterOptions}
        filterFields={[
          { id: 'dateFrom', type: 'date', label: 'Date From' },
          { id: 'dateTo', type: 'date', label: 'Date To' },
          { id: 'userId', type: 'select', label: 'User', options: filterOptions.users }
        ]}
      />

      {/* Summary Cards with real API data */}
      {summary && (
        <div className="report-summary mb-6">
          {type === 'compliance' ? (
            <>
              <div className="card">
                <div className="report-card-stat">
                  <div className="report-card-number">
                    {isLoading ? '...' : (summary.totalUsers || 0)}
                  </div>
                  <div className="report-card-label">Total Compliance Users</div>
                </div>
              </div>

              <div className="card">
                <div className="report-card-stat">
                  <div className="report-card-number">
                    {isLoading ? '...' : (summary.totalTasksAssigned || 0)}
                  </div>
                  <div className="report-card-label">Total Tasks Assigned</div>
                </div>
              </div>

              <div className="card">
                <div className="report-card-stat">
                  <div className="report-card-number text-yellow-600">
                    {isLoading ? '...' : (summary.totalPending || 0)}
                  </div>
                  <div className="report-card-label">Pending Review</div>
                  <div className="report-card-trend warning">Action Required</div>
                </div>
              </div>

              <div className="card">
                <div className="report-card-stat">
                  <div className="report-card-number text-green-600">
                    {isLoading ? '...' : (summary.avgProductivity || 0)}%
                  </div>
                  <div className="report-card-label">Avg Productivity</div>
                  <div className="report-card-trend positive">Team Performance</div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="card">
                <div className="report-card-stat">
                  <div className="report-card-number">
                    {isLoading ? '...' : (summary.totalUsers || 0)}
                  </div>
                  <div className="report-card-label">Total Product Users</div>
                </div>
              </div>

              <div className="card">
                <div className="report-card-stat">
                  <div className="report-card-number">
                    {isLoading ? '...' : (summary.totalTasksCreated || 0)}
                  </div>
                  <div className="report-card-label">Total Tasks Created</div>
                </div>
              </div>

              <div className="card">
                <div className="report-card-stat">
                  <div className="report-card-number">
                    {isLoading ? '...' : (summary.totalVersionsUploaded || 0)}
                  </div>
                  <div className="report-card-label">Total Versions Uploaded</div>
                </div>
              </div>

              <div className="card">
                <div className="report-card-stat">
                  <div className="report-card-number text-green-600">
                    {isLoading ? '...' : (summary.totalPublished || 0)}
                  </div>
                  <div className="report-card-label">Total Published</div>
                  <div className="report-card-trend positive">Completed</div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">
            Loading {type} users report...
          </p>
        </div>
      )}

      {/* Report Table */}
      {!isLoading && (
        <ReportTable 
          columns={currentColumns}
          data={tableData}
          emptyMessage={`No ${type} user data found for the selected filters.`}
        />
      )}
    </div>
  );
};

UserWiseReport.propTypes = {
  type: PropTypes.oneOf(['compliance', 'product']).isRequired,
  onTypeChange: PropTypes.func.isRequired
};

export default UserWiseReport;