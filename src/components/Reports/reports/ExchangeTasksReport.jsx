import { useState } from 'react';
import { useGetExchangeTasksReportQuery } from '../../../redux/api/reportsApi';
import ReportFilters from '../common/ReportFilters';
import ReportTable from '../common/ReportTable';
import ExportButtons from '../common/ExportButtons';
import { useDispatch } from 'react-redux';

const ExchangeTasksReport = () => {
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    exchangeName: '',
    approvalStatus: '',
    status: '',
    createdBy: '',
    assignedTo: '',
    page: 1,
    limit: 50
  });

  const dispatch = useDispatch();
  
  const {
    data: reportData,
    isLoading,
    error,
    refetch
  } = useGetExchangeTasksReportQuery(filters, {
    pollingInterval: 60000,
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true
  });

  const columns = [
    { id: 'uin', label: 'UIN', sortable: true },
    { id: 'title', label: 'Title', sortable: true },
    { id: 'createdBy', label: 'Created By', sortable: true },
    { id: 'taskStatus', label: 'Task Status', sortable: true },
    { id: 'exchangeName', label: 'Exchange', sortable: true },
    { id: 'typeOfContent', label: 'Content Type', sortable: true },
    { id: 'approvalStatus', label: 'Approval Status', sortable: true },
    { id: 'referenceNumber', label: 'Exchange Ref No.', sortable: true },
    { id: 'createdAt', label: 'Created Date', sortable: true },
    { id: 'approvalDate', label: 'Approval Date', sortable: true },
    { id: 'expiryDate', label: 'Expiry Date', sortable: true },
    { id: 'updatedBy', label: 'Updated By', sortable: true },
    { id: 'isExpiringSoon', label: 'Expiring Soon', sortable: true }
  ];

  const filterOptions = {
    exchangeName: [
      { value: 'NSE', label: 'NSE' },
      { value: 'BSE', label: 'BSE' },
      { value: 'MCX', label: 'MCX' },
      { value: 'NCDEX', label: 'NCDEX' }
    ],
    approvalStatus: [
      { value: 'PENDING', label: 'Pending' },
      { value: 'APPROVED', label: 'Approved' },
      { value: 'REJECTED', label: 'Rejected' },
      { value: 'NOT_SENT', label: 'Not Sent' }
    ],
    taskStatus: [
      { value: 'OPEN', label: 'Open' },
      { value: 'PRODUCT_REVIEW', label: 'Product Review' },
      { value: 'COMPLIANCE_REVIEW', label: 'Compliance Review' },
      { value: 'APPROVED', label: 'Approved' },
      { value: 'PUBLISHED', label: 'Published' },
      { value: 'CLOSED_EXCHANGE', label: 'Closed Exchange' },
      { value: 'CLOSED_INTERNAL', label: 'Closed Internal' }
    ]
  };

  const handleFilterChange = (newFilters) => {
    const cleanedFilters = {
      page: 1,
      limit: 50
    };

    Object.entries(newFilters).forEach(([key, value]) => {
      if (value !== '' && value !== null && value !== undefined) {
        cleanedFilters[key] = value;
      }
    });

    setFilters(cleanedFilters);
  };

  const transformData = (apiData) => {
    if (!apiData?.data) return [];

    return apiData.data.map(item => ({
      id: item.uin + '-' + item.exchangeName,  
      uin: item.uin,
      title: item.title,
      createdBy: item.createdBy,
      taskStatus: item.taskStatus,
      exchangeName: item.exchangeName,
      typeOfContent: item.typeOfContent || '-',
      approvalStatus: item.approvalStatus,
      referenceNumber: item.referenceNumber || '-',
      createdAt: new Date(item.createdAt).toLocaleDateString(),
      approvalDate: item.approvalDate ? new Date(item.approvalDate).toLocaleDateString() : '-',
      expiryDate: item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : '-',
      updatedBy: item.updatedBy || '-',
      isExpiringSoon: item.isExpiringSoon ? 'Yes' : 'No'
    }));
  };

  const tableData = transformData(reportData);
  const summary = reportData?.summary || {};

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Failed to load exchange tasks report. Please try again.</p>
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
        <h2 className="text-heading-3">Exchange Tasks Report</h2>
        <ExportButtons
          data={tableData}
          columns={columns}
          filename="exchange-tasks-report"
          isLoading={isLoading}
        />
      </div>

      <ReportFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        options={filterOptions}
        filterFields={[
          { id: 'dateRange', type: 'dateRange', label: 'Date Range' },
          { id: 'exchangeName', type: 'select', label: 'Exchange', options: filterOptions.exchangeName },
          { id: 'approvalStatus', type: 'select', label: 'Approval Status', options: filterOptions.approvalStatus },
          { id: 'status', type: 'select', label: 'Task Status', options: filterOptions.taskStatus }
        ]}
      />

      {summary && (
        <div className="report-summary mb-6">
          <div className="card">
            <div className="report-card-stat">
              <div className="report-card-number">
                {isLoading ? '...' : (summary.totalTasks || 0)}
              </div>
              <div className="report-card-label">Total Exchange Tasks</div>
            </div>
          </div>

          <div className="card">
            <div className="report-card-stat">
              <div className="report-card-number">
                {isLoading ? '...' : (summary.totalExchangeEntries || 0)}
              </div>
              <div className="report-card-label">Total Exchange Entries</div>
            </div>
          </div>

          <div className="card">
            <div className="report-card-stat">
              <div className="report-card-number text-green-600">
                {isLoading ? '...' : (summary.approvalStatusDistribution?.APPROVED || 0)}
              </div>
              <div className="report-card-label">Approved</div>
              <div className="report-card-trend positive">Active</div>
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

      {summary.exchangeDistribution && Object.keys(summary.exchangeDistribution).length > 0 && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Exchange Distribution</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(summary.exchangeDistribution).map(([exchange, count]) => (
              <div key={exchange} className="text-center">
                <div className="text-lg font-semibold text-gray-900">{count}</div>
                <div className="text-xs text-gray-600">{exchange}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isLoading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading exchange tasks report...</p>
        </div>
      )}

      {!isLoading && (
        <ReportTable
          columns={columns}
          data={tableData}
          emptyMessage="No exchange tasks found for the selected filters."
        />
      )}
    </div>
  );
};

export default ExchangeTasksReport;