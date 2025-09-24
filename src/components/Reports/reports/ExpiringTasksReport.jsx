import { useState } from 'react';
import ReportFilters from '../common/ReportFilters';
import ReportTable from '../common/ReportTable';
import ExportButtons from '../common/ExportButtons';

const ExpiringTasksReport = () => {
  const [filters, setFilters] = useState({
    daysToExpiry: '30',
    exchange: ''
  });
  
  // Sample data structure
  const columns = [
    { id: 'uin', label: 'UIN', sortable: true },
    { id: 'title', label: 'Title', sortable: true },
    { id: 'exchange', label: 'Exchange', sortable: true },
    { id: 'refNo', label: 'Exchange Ref No.', sortable: true },
    { id: 'approvalDate', label: 'Approval Date', sortable: true },
    { id: 'expiryDate', label: 'Expiry Date', sortable: true },
    { id: 'daysRemaining', label: 'Days Remaining', sortable: true },
    { id: 'status', label: 'Renewal Status', sortable: true }
  ];
  
  const data = [
    // Sample data would go here in a real implementation
    {
      id: 1,
      uin: 'TASK-002',
      title: 'Holiday Season Ad Campaign',
      exchange: 'NSE',
      refNo: 'NSE/ADV/2023/123',
      approvalDate: '2023-10-15',
      expiryDate: '2023-12-31',
      daysRemaining: 28,
      status: 'Not Started'
    },
    // More data would follow
  ];
  
  const filterOptions = {
    daysToExpiry: [
      { value: '7', label: '7 Days' },
      { value: '15', label: '15 Days' },
      { value: '30', label: '30 Days' },
      { value: '60', label: '60 Days' }
    ],
    exchange: [
      { value: 'all', label: 'All Exchanges' },
      { value: 'nse', label: 'NSE' },
      { value: 'bse', label: 'BSE' }
    ]
  };
  
  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    // In a real implementation, this would trigger data fetching
  };
  
  return (
    <div>
      <div className="flex-between mb-4">
        <h2 className="text-heading-3">Expiring Soon Report</h2>
        <ExportButtons />
      </div>
      
      <ReportFilters 
        filters={filters}
        onFilterChange={handleFilterChange}
        options={filterOptions}
        filterFields={[
          { id: 'daysToExpiry', type: 'select', label: 'Days to Expiry', options: filterOptions.daysToExpiry },
          { id: 'exchange', type: 'select', label: 'Exchange', options: filterOptions.exchange }
        ]}
      />
      
      {/* Summary cards for quick stats */}
      <div className="report-summary mb-6">
        <div className="card">
          <div className="report-card-stat">
            <div className="report-card-number">12</div>
            <div className="report-card-label">Expiring within 7 days</div>
          </div>
        </div>
        
        <div className="card">
          <div className="report-card-stat">
            <div className="report-card-number">28</div>
            <div className="report-card-label">Expiring within 30 days</div>
          </div>
        </div>
        
        <div className="card">
          <div className="report-card-stat">
            <div className="report-card-number">5</div>
            <div className="report-card-label">Renewals In Progress</div>
          </div>
        </div>
        
        <div className="card">
          <div className="report-card-stat">
            <div className="report-card-number">7</div>
            <div className="report-card-label">Renewal Not Started</div>
          </div>
        </div>
      </div>
      
      <ReportTable 
        columns={columns}
        data={data}
        emptyMessage="No tasks expiring soon for the selected criteria."
      />
    </div>
  );
};

export default ExpiringTasksReport;