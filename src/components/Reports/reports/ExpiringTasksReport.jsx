import { useState } from 'react';
import { useGetExpiringSoonReportQuery } from '../../../redux/api/reportsApi';
import ReportFilters from '../common/ReportFilters';
import ReportTable from '../common/ReportTable';
import ExportButtons from '../common/ExportButtons';

const ExpiringTasksReport = () => {
  const [filters, setFilters] = useState({
    days: 30 // Default to 30 days
  });

  // API Query with real-time data
  const { 
    data: reportData, 
    isLoading, 
    error, 
    refetch 
  } = useGetExpiringSoonReportQuery(filters, {
    pollingInterval: 300000, // Refresh every 5 minutes (more frequent for time-sensitive data)
    refetchOnMountOrArgChange: true,
  });

  const columns = [
    { id: 'uin', label: 'UIN', sortable: true },
    { id: 'title', label: 'Title', sortable: true },
    { id: 'taskType', label: 'Task Type', sortable: true },
    { id: 'exchangeName', label: 'Exchange', sortable: true },
    { id: 'referenceNumber', label: 'Exchange Ref No.', sortable: true },
    { id: 'approvalDate', label: 'Approval Date', sortable: true },
    { id: 'expiryDate', label: 'Expiry Date', sortable: true },
    { id: 'daysRemaining', label: 'Days Remaining', sortable: true },
    { id: 'urgencyLevel', label: 'Urgency Level', sortable: true },
    { id: 'renewalStatus', label: 'Renewal Status', sortable: true },
    { id: 'assignedTo', label: 'Assigned To', sortable: true }
  ];

  const filterOptions = {
    days: [
      { value: 7, label: '7 Days' },
      { value: 15, label: '15 Days' },
      { value: 30, label: '30 Days' },
      { value: 60, label: '60 Days' },
      { value: 90, label: '90 Days' }
    ]
  };

  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({
      ...prev,
      ...newFilters
    }));
  };

  // Transform API data for table display
  const transformData = (apiData) => {
    if (!apiData?.data) return [];
    
    return apiData.data.map(item => ({
      id: item.uin,
      uin: item.uin,
      title: item.title,
      taskType: item.taskType === 'EXCHANGE' ? 'Exchange' : 'Internal',
      exchangeName: item.exchangeName || '-',
      referenceNumber: item.referenceNumber || '-',
      approvalDate: item.approvalDate ? new Date(item.approvalDate).toLocaleDateString() : '-',
      expiryDate: item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : '-',
      daysRemaining: item.daysRemaining || 0,
      urgencyLevel: getUrgencyLevel(item.daysRemaining),
      renewalStatus: item.renewalStatus || 'Not Started',
      assignedTo: item.assignedTo || '-'
    }));
  };

  // Helper function to determine urgency level
  const getUrgencyLevel = (daysRemaining) => {
    if (daysRemaining <= 7) return 'Critical';
    if (daysRemaining <= 15) return 'High';
    if (daysRemaining <= 30) return 'Medium';
    return 'Low';
  };

  const tableData = transformData(reportData);
  const summary = reportData?.summary || {};

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Failed to load expiring tasks report. Please try again.</p>
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
        <h2 className="text-heading-3">Expiring Tasks Report</h2>
        <ExportButtons 
          data={tableData}
          columns={columns}
          filename="expiring-tasks-report"
          isLoading={isLoading}
        />
      </div>

      <ReportFilters 
        filters={filters}
        onFilterChange={handleFilterChange}
        options={filterOptions}
        filterFields={[
          { id: 'days', type: 'select', label: 'Days to Expiry', options: filterOptions.days }
        ]}
      />

      {/* Summary Cards with real API data */}
      {summary && (
        <div className="report-summary mb-6">
          <div className="card">
            <div className="report-card-stat">
              <div className="report-card-number text-red-600">
                {isLoading ? '...' : (summary.urgencyLevels?.critical || 0)}
              </div>
              <div className="report-card-label">Critical (≤7 days)</div>
              <div className="report-card-trend negative">Immediate Action</div>
            </div>
          </div>

          <div className="card">
            <div className="report-card-stat">
              <div className="report-card-number text-yellow-600">
                {isLoading ? '...' : (summary.urgencyLevels?.high || 0)}
              </div>
              <div className="report-card-label">High (≤15 days)</div>
              <div className="report-card-trend warning">Action Required</div>
            </div>
          </div>

          <div className="card">
            <div className="report-card-stat">
              <div className="report-card-number">
                {isLoading ? '...' : (summary.totalExpiring || 0)}
              </div>
              <div className="report-card-label">Total Expiring</div>
              <div className="text-xs text-gray-500 mt-1">
                Within {filters.days} days
              </div>
            </div>
          </div>

          <div className="card">
            <div className="report-card-stat">
              <div className="report-card-number text-green-600">
                {isLoading ? '...' : (summary.renewalStatusDistribution?.['In Progress'] || 0)}
              </div>
              <div className="report-card-label">Renewals In Progress</div>
              <div className="report-card-trend positive">Active</div>
            </div>
          </div>
        </div>
      )}

      {/* Urgency Level Distribution */}
      {summary.urgencyLevels && (
        <div className="mb-6 p-4 bg-red-50 rounded-lg">
          <h3 className="text-sm font-medium text-red-700 mb-3">Urgency Level Distribution</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(summary.urgencyLevels).map(([level, count]) => (
              <div key={level} className="text-center">
                <div className={`text-lg font-semibold ${
                  level === 'critical' ? 'text-red-900' :
                  level === 'high' ? 'text-yellow-900' :
                  level === 'medium' ? 'text-blue-900' : 'text-green-900'
                }`}>
                  {count}
                </div>
                <div className="text-xs text-gray-600 capitalize">{level}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Exchange-wise Breakdown */}
      {summary.exchangeDistribution && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-sm font-medium text-blue-700 mb-3">Exchange-wise Expiring Tasks</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(summary.exchangeDistribution).map(([exchange, count]) => (
              <div key={exchange} className="text-center">
                <div className="text-lg font-semibold text-blue-900">{count}</div>
                <div className="text-xs text-blue-600">{exchange}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Renewal Status Overview */}
      {summary.renewalStatusDistribution && (
        <div className="mb-6 p-4 bg-yellow-50 rounded-lg">
          <h3 className="text-sm font-medium text-yellow-700 mb-3">Renewal Status Overview</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(summary.renewalStatusDistribution).map(([status, count]) => (
              <div key={status} className="text-center">
                <div className="text-lg font-semibold text-yellow-900">{count}</div>
                <div className="text-xs text-yellow-600">{status}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading expiring tasks report...</p>
        </div>
      )}

      {/* Report Table */}
      {!isLoading && (
        <ReportTable 
          columns={columns}
          data={tableData}
          emptyMessage="No tasks expiring within the selected timeframe."
        />
      )}
    </div>
  );
};

export default ExpiringTasksReport;