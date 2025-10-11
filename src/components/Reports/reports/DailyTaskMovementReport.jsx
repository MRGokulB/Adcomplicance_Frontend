import { useState } from 'react';
import { useGetDailyMovementReportQuery } from '../../../redux/api/reportsApi';
import ReportFilters from '../common/ReportFilters';
import ReportTable from '../common/ReportTable';
import ExportButtons from '../common/ExportButtons';

const DailyTaskMovementReport = () => {
  const [filters, setFilters] = useState({
    date: new Date().toISOString().split('T')[0]  
  });

  const { 
    data: reportData, 
    isLoading, 
    error, 
    refetch 
  } = useGetDailyMovementReportQuery(filters, {
    pollingInterval: 30000,  
    refetchOnMountOrArgChange: true,
  });

  const columns = [
    { id: 'timestamp', label: 'Time', sortable: true },
    { id: 'action', label: 'Action', sortable: true },
    { id: 'details', label: 'Details', sortable: false },
    { id: 'performedBy', label: 'Performed By', sortable: true },
    { id: 'userRole', label: 'User Role', sortable: true },
    { id: 'uin', label: 'Task UIN', sortable: true },
    { id: 'title', label: 'Task Title', sortable: false },
    { id: 'taskStatus', label: 'Current Status', sortable: true },
    { id: 'taskType', label: 'Task Type', sortable: true }
  ];

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  const transformData = (apiData) => {
    if (!apiData?.movements) return [];
    
    return apiData.movements.map((item, index) => ({
      id: `${item.timestamp}-${index}`,
      timestamp: new Date(item.timestamp).toLocaleTimeString(),
      action: item.action,
      details: item.details,
      performedBy: item.performedBy,
      userRole: item.userRole,
      uin: item.task?.uin || '-',
      title: item.task?.title || '-',
      taskStatus: item.task?.status || '-',
      taskType: item.task?.type || '-'
    }));
  };

  const tableData = transformData(reportData);
  const summary = reportData?.summary || {};

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Failed to load daily movement report. Please try again.</p>
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
        <h2 className="text-heading-3">Daily Task Movement Report</h2>
        <ExportButtons />
      </div>

      <ReportFilters 
        filters={filters}
        onFilterChange={handleFilterChange}
        filterFields={[
          { id: 'date', type: 'date', label: 'Date' }
        ]}
      />

      {summary && (
        <div className="report-summary mb-6">
          <div className="card">
            <div className="report-card-stat">
              <div className="report-card-number">
                {isLoading ? '...' : (summary.totalMovements || 0)}
              </div>
              <div className="report-card-label">Total Movements</div>
              <div className="text-xs text-gray-500 mt-1">
                {summary.date ? new Date(summary.date).toLocaleDateString() : 'Today'}
              </div>
            </div>
          </div>

          <div className="card">
            <div className="report-card-stat">
              <div className="report-card-number text-green-600">
                {isLoading ? '...' : (summary.movementsByAction?.TASK_APPROVED || 0)}
              </div>
              <div className="report-card-label">Tasks Approved</div>
              <div className="report-card-trend positive">Progress</div>
            </div>
          </div>

          <div className="card">
            <div className="report-card-stat">
              <div className="report-card-number text-blue-600">
                {isLoading ? '...' : (summary.movementsByAction?.TASK_CREATED || 0)}
              </div>
              <div className="report-card-label">Tasks Created</div>
              <div className="report-card-trend positive">New Work</div>
            </div>
          </div>

          <div className="card">
            <div className="report-card-stat">
              <div className="report-card-number text-purple-600">
                {isLoading ? '...' : (summary.movementsByAction?.TASK_PUBLISHED || 0)}
              </div>
              <div className="report-card-label">Tasks Published</div>
              <div className="report-card-trend positive">Completed</div>
            </div>
          </div>
        </div>
      )}

      {summary.movementsByAction && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Activity Breakdown</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(summary.movementsByAction).map(([action, count]) => (
              <div key={action} className="text-center">
                <div className="text-lg font-semibold text-gray-900">{count}</div>
                <div className="text-xs text-gray-600">{action.replace('_', ' ')}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {summary.movementsByHour && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-sm font-medium text-blue-700 mb-3">Activity by Hour</h3>
          <div className="grid grid-cols-6 md:grid-cols-12 gap-2">
            {Object.entries(summary.movementsByHour).map(([hour, count]) => (
              <div key={hour} className="text-center">
                <div className="text-sm font-semibold text-blue-900">{count}</div>
                <div className="text-xs text-blue-600">{hour}:00</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {summary.movementsByUser && (
        <div className="mb-6 p-4 bg-green-50 rounded-lg">
          <h3 className="text-sm font-medium text-green-700 mb-3">Most Active Users</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(summary.movementsByUser)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 4)
              .map(([user, count]) => (
                <div key={user} className="text-center">
                  <div className="text-lg font-semibold text-green-900">{count}</div>
                  <div className="text-xs text-green-600">{user}</div>
                </div>
              ))}
          </div>
        </div>
      )}

      {isLoading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading daily movement report...</p>
        </div>
      )}

      {!isLoading && (
        <ReportTable 
          columns={columns}
          data={tableData}
          emptyMessage="No status changes recorded for the selected date."
        />
      )}
    </div>
  );
};

export default DailyTaskMovementReport;