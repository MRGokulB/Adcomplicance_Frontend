import { useState, useEffect } from 'react';
import { useGetRejectedTasksReportQuery } from '../../../redux/api/reportsApi';
import { useGetUsersQuery } from '../../../redux/api/usersApi';
import ReportFilters from '../common/ReportFilters';
import ReportTable from '../common/ReportTable';
import ExportButtons from '../common/ExportButtons';

const RejectedTasksReport = () => {
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    closureType: '',
    page: 1,
    limit: 50
  });

  const [rawData, setRawData] = useState(null);
  const [filteredData, setFilteredData] = useState(null);

  const apiFilters = {
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    page: filters.page,
    limit: filters.limit
  };

  const { 
    data: reportData, 
    isLoading, 
    error, 
    refetch 
  } = useGetRejectedTasksReportQuery(apiFilters, {
    pollingInterval: 60000,  
    refetchOnMountOrArgChange: true,
  });

  const { data: usersData } = useGetUsersQuery({ limit: 100 });

  useEffect(() => {
    if (!reportData) return;

    setRawData(reportData);

    if (filters.closureType) {
      const filtered = reportData.data.filter(task => task.status === filters.closureType);
      
      const summary = {
        totalRejected: filtered.length,
        avgDaysActive: filtered.length > 0
          ? Math.round(filtered.reduce((sum, t) => sum + (t.daysActive || 0), 0) / filtered.length)
          : 0
      };

      setFilteredData({ summary, data: filtered });
    } else {
      setFilteredData(reportData);
    }
  }, [reportData, filters.closureType]);

  const columns = [
    { id: 'uin', label: 'UIN', sortable: true },
    { id: 'title', label: 'Title', sortable: true },
    { id: 'taskType', label: 'Task Type', sortable: true },
    { id: 'createdBy', label: 'Created By', sortable: true },
    { id: 'rejectedDate', label: 'Rejected Date', sortable: true },
    { id: 'rejectedBy', label: 'Rejected By', sortable: true },
    { id: 'rejectionReason', label: 'Rejection Reason', sortable: false },
    { id: 'closureType', label: 'Closure Type', sortable: true },
    { id: 'reopened', label: 'Reopened', sortable: true },
    { id: 'currentStatus', label: 'Current Status', sortable: true },
    { id: 'daysSinceRejection', label: 'Days Since Rejection', sortable: true }
  ];

  const getUserFilterOptions = () => {
    if (!usersData?.users) return [];
    return usersData.users
      .filter(user => ['COMPLIANCE_USER', 'COMPLIANCE_ADMIN', 'SENIOR_MANAGER'].includes(user.role))
      .map(user => ({
        value: user.id,
        label: user.fullName
      }));
  };

  const filterOptions = {
    closureType: [
      { value: 'CLOSED_INTERNAL', label: 'Closed Internal' },
      { value: 'CLOSED_EXCHANGE', label: 'Closed Exchange' }
    ],
    rejectedBy: getUserFilterOptions()
  };

  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters,
      page: 1  
    }));
  };

  const transformData = (apiData) => {
    if (!apiData?.data) return [];
    
    return apiData.data.map(item => ({
      id: item.uin,
      uin: item.uin,
      title: item.title,
      taskType: item.taskType === 'EXCHANGE' ? 'Exchange' : 'Internal',
      createdBy: item.createdBy,
      rejectedDate: item.closureDate ? new Date(item.closureDate).toLocaleDateString() : '-',
      rejectedBy: item.assignedCompliance || '-',
      rejectionReason: item.closureComments || 'No reason specified',
      closureType: item.status?.replace('_', ' ') || 'Closed',
      reopened: item.reopened ? 'Yes' : 'No',
      currentStatus: item.status?.replace('_', ' ') || '-',
      daysSinceRejection: item.daysActive || 0
    }));
  };

  const tableData = transformData(filteredData);
  const summary = filteredData?.summary || {};

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Failed to load rejected tasks report. Please try again.</p>
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
        <h2 className="text-heading-3">Rejected Tasks Analysis</h2>
        <ExportButtons 
          data={tableData}
          columns={columns}
          filename="rejected-tasks-report"
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
          { id: 'closureType', type: 'select', label: 'Closure Type', options: filterOptions.closureType }
        ]}
      />

      {summary && (
        <div className="report-summary mb-6">
          <div className="card">
            <div className="report-card-stat">
              <div className="report-card-number text-red-600">
                {isLoading ? '...' : (summary.totalRejected || 0)}
              </div>
              <div className="report-card-label">Total Rejected Tasks</div>
            </div>
          </div>

          <div className="card">
            <div className="report-card-stat">
              <div className="report-card-number text-green-600">
                {isLoading ? '...' : (summary.totalReopened || 0)}
              </div>
              <div className="report-card-label">Successfully Reopened</div>
              <div className={`report-card-trend ${summary.reopenRate >= 50 ? 'positive' : 'negative'}`}>
                {isLoading ? '...' : `${summary.reopenRate || 0}%`}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="report-card-stat">
              <div className="report-card-number text-yellow-600">
                {isLoading ? '...' : (summary.pendingReopening || 0)}
              </div>
              <div className="report-card-label">Pending Reopening</div>
              <div className="report-card-trend warning">Needs Attention</div>
            </div>
          </div>

          <div className="card">
            <div className="report-card-stat">
              <div className="report-card-number">
                {isLoading ? '...' : (summary.avgDaysActive || summary.avgDaysToResolve || 0)}
              </div>
              <div className="report-card-label">Avg Days Active</div>
              <div className="text-xs text-gray-500 mt-1">Resolution Time</div>
            </div>
          </div>
        </div>
      )}

      {summary.closureTypeDistribution && (
        <div className="mb-6 p-4 bg-red-50 rounded-lg">
          <h3 className="text-sm font-medium text-red-700 mb-3">Closure Type Distribution</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(summary.closureTypeDistribution).map(([type, count]) => (
              <div key={type} className="text-center">
                <div className="text-lg font-semibold text-red-900">{count}</div>
                <div className="text-xs text-red-600">{type.replace('_', ' ')}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {summary.rejectionReasons && (
        <div className="mb-6 p-4 bg-yellow-50 rounded-lg">
          <h3 className="text-sm font-medium text-yellow-700 mb-3">Top Rejection Reasons</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(summary.rejectionReasons)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 6)
              .map(([reason, count]) => (
                <div key={reason} className="flex justify-between items-center p-2 bg-yellow-100 rounded">
                  <span className="text-sm text-yellow-800 truncate">{reason}</span>
                  <span className="text-sm font-semibold text-yellow-900">{count}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {summary.rejectionsByMonth && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-sm font-medium text-blue-700 mb-3">Rejection Trend (Last 6 Months)</h3>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
            {Object.entries(summary.rejectionsByMonth).map(([month, count]) => (
              <div key={month} className="text-center">
                <div className="text-lg font-semibold text-blue-900">{count}</div>
                <div className="text-xs text-blue-600">{month}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {summary.rejectionsByReviewer && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Rejections by Reviewer</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(summary.rejectionsByReviewer)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 6)
              .map(([reviewer, count]) => (
                <div key={reviewer} className="flex justify-between items-center p-2 bg-white rounded border">
                  <span className="text-sm text-gray-800 truncate">{reviewer}</span>
                  <span className="text-sm font-semibold text-gray-900">{count}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {isLoading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading rejected tasks report...</p>
        </div>
      )}

      {!isLoading && (
        <ReportTable 
          columns={columns}
          data={tableData}
          emptyMessage="No rejected tasks found for the selected filters."
        />
      )}
    </div>
  );
};

export default RejectedTasksReport;