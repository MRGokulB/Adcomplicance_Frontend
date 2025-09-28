import { useState } from 'react';
import { useGetInternalTasksReportQuery } from '../../../redux/api/reportsApi';
import { useGetUsersQuery } from '../../../redux/api/usersApi';
import ReportFilters from '../common/ReportFilters';
import ReportTable from '../common/ReportTable';
import ExportButtons from '../common/ExportButtons';

const InternalTasksReport = () => {
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    createdBy: '',
    status: '',
    assignedTo: '',
    page: 1,
    limit: 50
  });

  // API Queries
  const { 
    data: reportData, 
    isLoading, 
    error, 
    refetch 
  } = useGetInternalTasksReportQuery(filters, {
    pollingInterval: 60000, // Refresh every minute
    refetchOnMountOrArgChange: true,
  });

  // Get users for filter options
  const { data: usersData } = useGetUsersQuery({ limit: 100 });

  const columns = [
    { id: 'uin', label: 'UIN', sortable: true },
    { id: 'title', label: 'Title', sortable: true },
    { id: 'createdBy', label: 'Created By', sortable: true },
    { id: 'status', label: 'Status', sortable: true },
    { id: 'assignedProducts', label: 'Assigned Products', sortable: false },
    { id: 'assignedCompliance', label: 'Assigned Compliance', sortable: false },
    { id: 'createdAt', label: 'Created Date', sortable: true },
    { id: 'approvalDate', label: 'Approval Date', sortable: true },
    { id: 'publishDate', label: 'Publish Date', sortable: true },
    { id: 'daysToApproval', label: 'Days to Approval', sortable: true },
    { id: 'daysToPublish', label: 'Days to Publish', sortable: true },
    { id: 'versionCount', label: 'Versions', sortable: true },
    { id: 'commentCount', label: 'Comments', sortable: true }
  ];

  // Transform users data for filter options
  const getUserFilterOptions = () => {
    if (!usersData?.users) return [];
    return usersData.users.map(user => ({
      value: user.id,
      label: user.fullName
    }));
  };

  const filterOptions = {
    createdBy: getUserFilterOptions(),
    status: [
      { value: 'OPEN', label: 'Open' },
      { value: 'PRODUCT_REVIEW', label: 'Product Review' },
      { value: 'COMPLIANCE_REVIEW', label: 'Compliance Review' },
      { value: 'APPROVED', label: 'Approved' },
      { value: 'PUBLISHED', label: 'Published' },
      { value: 'CLOSED_INTERNAL', label: 'Closed Internal' }
    ],
    assignedTo: getUserFilterOptions()
  };

  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
      page: 1 // Reset to first page when filters change
    }));
  };

  // Transform API data for table display
  const transformData = (apiData) => {
    if (!apiData?.data) return [];
    
    return apiData.data.map(item => ({
      id: item.uin,
      uin: item.uin,
      title: item.title,
      createdBy: item.createdBy,
      status: item.status,
      assignedProducts: item.assignedProducts || '',
      assignedCompliance: item.assignedCompliance || '',
      createdAt: new Date(item.createdAt).toLocaleDateString(),
      approvalDate: item.approvalDate ? new Date(item.approvalDate).toLocaleDateString() : '-',
      publishDate: item.publishDate ? new Date(item.publishDate).toLocaleDateString() : '-',
      daysToApproval: item.daysToApproval || '-',
      daysToPublish: item.daysToPublish || '-',
      versionCount: item.versionCount || 0,
      commentCount: item.commentCount || 0
    }));
  };

  const tableData = transformData(reportData);
  const summary = reportData?.summary || {};

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Failed to load internal tasks report. Please try again.</p>
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
        <h2 className="text-heading-3">Internal Tasks Report</h2>
        {/* FIXED: Pass the required props to ExportButtons */}
        <ExportButtons 
          data={tableData}
          columns={columns}
          filename="internal-tasks-report"
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
          { id: 'createdBy', type: 'select', label: 'Created By', options: filterOptions.createdBy },
          { id: 'status', type: 'select', label: 'Status', options: filterOptions.status },
          { id: 'assignedTo', type: 'select', label: 'Assigned To', options: filterOptions.assignedTo }
        ]}
      />

      {/* Summary Cards with real data */}
      {summary && (
        <div className="report-summary mb-6">
          <div className="card">
            <div className="report-card-stat">
              <div className="report-card-number">
                {isLoading ? '...' : (summary.totalTasks || 0)}
              </div>
              <div className="report-card-label">Total Tasks</div>
            </div>
          </div>

          <div className="card">
            <div className="report-card-stat">
              <div className="report-card-number">
                {isLoading ? '...' : (summary.avgDaysToApproval || 0)}
              </div>
              <div className="report-card-label">Avg Days to Approval</div>
            </div>
          </div>

          <div className="card">
            <div className="report-card-stat">
              <div className="report-card-number">
                {isLoading ? '...' : (summary.avgDaysToPublish || 0)}
              </div>
              <div className="report-card-label">Avg Days to Publish</div>
            </div>
          </div>

          <div className="card">
            <div className="report-card-stat">
              <div className="report-card-number text-yellow-600">
                {isLoading ? '...' : (summary.expiringSoon || 0)}
              </div>
              <div className="report-card-label">Expiring Soon</div>
              <div className="report-card-trend warning">Action Required</div>
            </div>
          </div>
        </div>
      )}

      {/* Status Distribution Chart (if available in summary) 
      {summary.tasksByStatus && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Status Distribution</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(summary.tasksByStatus).map(([status, count]) => (
              <div key={status} className="text-center">
                <div className="text-lg font-semibold text-gray-900">{count}</div>
                <div className="text-xs text-gray-600">{status}</div>
              </div>
            ))}
          </div>
        </div>
      )}*/}

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading internal tasks report...</p>
        </div>
      )}
 


      {/* Report Table */}
      {!isLoading && (
        <ReportTable
          columns={columns}
          data={tableData}
          emptyMessage="No internal tasks found for the selected filters."
        />
      )}
    </div>
  );
};

export default InternalTasksReport;