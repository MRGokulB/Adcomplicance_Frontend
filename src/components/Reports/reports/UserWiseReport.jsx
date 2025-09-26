import PropTypes from 'prop-types';
import { useState } from 'react';
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

  // Conditional API calls based on report type
  const { 
    data: complianceData, 
    isLoading: isComplianceLoading, 
    error: complianceError,
    refetch: refetchCompliance
  } = useGetComplianceUsersReportQuery(filters, {
    skip: type !== 'compliance',
    pollingInterval: 60000,
    refetchOnMountOrArgChange: true,
  });

  const { 
    data: productData, 
    isLoading: isProductLoading, 
    error: productError,
    refetch: refetchProduct
  } = useGetProductUsersReportQuery(filters, {
    skip: type !== 'product',
    pollingInterval: 60000,
    refetchOnMountOrArgChange: true,
  });

  // Current data based on selected type
  const currentData = type === 'compliance' ? complianceData : productData;
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
  
  // Get unique users for filter options from current data
  const getUserFilterOptions = () => {
    if (!currentData?.data) return [];
    return currentData.data.map(user => ({
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

  const tableData = transformData(currentData);
  const summary = currentData?.summary || {};

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
        {/* FIXED: Added required props to ExportButtons */}
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