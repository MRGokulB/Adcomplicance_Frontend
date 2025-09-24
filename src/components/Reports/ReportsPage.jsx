import { useState } from 'react';
import { useSelector } from 'react-redux';
import { selectUserRole } from '../../redux/slices/authSlice';
import { canAccessReports } from '../../utils/roles';
import ReportSelector from './ReportSelector';
import InternalTasksReport from './reports/InternalTasksReport';
import ExchangeTasksReport from './reports/ExchangeTasksReport';
import UserWiseReport from './reports/UserWiseReport';
import ExpiringTasksReport from './reports/ExpiringTasksReport';
import DailyTaskMovementReport from './reports/DailyTaskMovementReport';
import RejectedTasksReport from './reports/RejectedTasksReport';

const ReportsPage = () => {
  const [selectedReportType, setSelectedReportType] = useState('internal-tasks');
  const [userReportType, setUserReportType] = useState('compliance');
  const userRole = useSelector(selectUserRole);

  // Check if user has access to reports
  if (!canAccessReports(userRole)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h2>
          <p className="text-gray-600 mb-6">
            You don't have permission to access reports.
          </p>
        </div>
      </div>
    );
  }

  const renderReport = () => {
    switch (selectedReportType) {
      case 'internal-tasks':
        return <InternalTasksReport />;
      case 'exchange-tasks':
        return <ExchangeTasksReport />;
      case 'user-wise':
        return <UserWiseReport type={userReportType} onTypeChange={setUserReportType} />;
      case 'expiring-soon':
        return <ExpiringTasksReport />;
      case 'daily-movement':
        return <DailyTaskMovementReport />;
      case 'rejected-tasks':
        return <RejectedTasksReport />;
      default:
        return <InternalTasksReport />;
    }
  };

  return (
    <div className="report-container">
      <h1 className="text-heading-2 mb-6">Reports (MIS)</h1>
      
      <ReportSelector 
        selectedReportType={selectedReportType} 
        onReportTypeChange={setSelectedReportType}
        userReportType={userReportType}
        onUserReportTypeChange={setUserReportType}
        userRole={userRole}
      />
      
      {renderReport()}
    </div>
  );
};

export default ReportsPage;