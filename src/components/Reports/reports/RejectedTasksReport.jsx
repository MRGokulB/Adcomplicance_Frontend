import { useState } from 'react';
import ReportFilters from '../common/ReportFilters';
import ReportTable from '../common/ReportTable';
import ExportButtons from '../common/ExportButtons';

const RejectedTasksReport = () => {
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    rejectedBy: '',
    reason: ''
  });
  
  // Sample data structure
  const columns = [
    { id: 'uin', label: 'UIN', sortable: true },
    { id: 'title', label: 'Title', sortable: true },
    { id: 'createdBy', label: 'Created By', sortable: true },
    { id: 'rejectedDate', label: 'Rejected Date', sortable: true },
    { id: 'rejectedBy', label: 'Rejected By', sortable: true },
    { id: 'reason', label: 'Rejection Reason', sortable: true },
    { id: 'reopened', label: 'Reopened', sortable: true },
    { id: 'currentStatus', label: 'Current Status', sortable: true }
  ];
  
  const data = [
    // Sample data would go here in a real implementation
    {
      id: 1,
      uin: 'TASK-003',
      title: 'New Product Launch',
      createdBy: 'Sarah Creator',
      rejectedDate: '2023-10-10',
      rejectedBy: 'John Reviewer',
      reason: 'Missing compliance information',
      reopened: 'Yes',
      currentStatus: 'Approved'
    },
    // More data would follow
  ];
  
  const filterOptions = {
    rejectedBy: [
      { value: 'all', label: 'All Reviewers' },
      { value: 'john', label: 'John Reviewer' },
      { value: 'mike', label: 'Mike Approver' }
    ],
    reason: [
      { value: 'all', label: 'All Reasons' },
      { value: 'missing', label: 'Missing Information' },
      { value: 'incorrect', label: 'Incorrect Information' },
      { value: 'compliance', label: 'Compliance Issues' }
    ]
  };
  
  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    // In a real implementation, this would trigger data fetching
  };
  
  return (
    <div>
      <div className="flex-between mb-4">
        <h2 className="text-heading-3">Rejected Tasks Tracker</h2>
        <ExportButtons />
      </div>
      
      <ReportFilters 
        filters={filters}
        onFilterChange={handleFilterChange}
        options={filterOptions}
        filterFields={[
          { id: 'dateRange', type: 'dateRange', label: 'Date Range' },
          { id: 'rejectedBy', type: 'select', label: 'Rejected By', options: filterOptions.rejectedBy },
          { id: 'reason', type: 'select', label: 'Reason', options: filterOptions.reason }
        ]}
      />
      
      {/* Summary cards for rejection statistics */}
      <div className="report-summary mb-6">
        <div className="card">
          <div className="report-card-stat">
            <div className="report-card-number">24</div>
            <div className="report-card-label">Total Rejections</div>
          </div>
        </div>
        
        <div className="card">
          <div className="report-card-stat">
            <div className="report-card-number">18</div>
            <div className="report-card-label">Successfully Reopened</div>
            <div className="report-card-trend positive">75%</div>
          </div>
        </div>
        
        <div className="card">
          <div className="report-card-stat">
            <div className="report-card-number">6</div>
            <div className="report-card-label">Not Reopened</div>
            <div className="report-card-trend negative">25%</div>
          </div>
        </div>
        
        <div className="card">
          <div className="report-card-stat">
            <div className="report-card-number">2.3</div>
            <div className="report-card-label">Avg Days to Resolve</div>
          </div>
        </div>
      </div>
      
      <ReportTable 
        columns={columns}
        data={data}
        emptyMessage="No rejected tasks found for the selected filters."
      />
    </div>
  );
};

export default RejectedTasksReport;