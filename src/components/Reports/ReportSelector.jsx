import PropTypes from 'prop-types';
import { canAccessReports, hasPermission, PERMISSIONS, USER_ROLES } from '../../utils/roles';

const ReportSelector = ({ 
  selectedReportType, 
  onReportTypeChange,
  userReportType,
  onUserReportTypeChange,
  userRole
}) => {
  
  // Define available reports based on user role and permissions
  const getAvailableReports = () => {
    const reports = [];

    // Internal Tasks Report - Available to most roles
    if (hasPermission(userRole, PERMISSIONS.REPORT_INTERNAL_TASKS) || 
        hasPermission(userRole, PERMISSIONS.REPORT_ALL)) {
      reports.push({
        id: 'internal-tasks',
        label: 'MIS - Internal Tasks Report',
        description: 'Comprehensive report of all internal advertising tasks'
      });
    }

    // Exchange Tasks Report - Available to compliance and admin roles
    if (hasPermission(userRole, PERMISSIONS.REPORT_EXCHANGE_TASKS) || 
        hasPermission(userRole, PERMISSIONS.REPORT_ALL)) {
      reports.push({
        id: 'exchange-tasks',
        label: 'MIS - Exchange Tasks Report',
        description: 'Report of tasks requiring exchange approvals'
      });
    }

    // User-wise Reports - Available based on specific permissions
    if (hasPermission(userRole, PERMISSIONS.REPORT_COMPLIANCE_USERS) || 
        hasPermission(userRole, PERMISSIONS.REPORT_PRODUCT_USERS) ||
        hasPermission(userRole, PERMISSIONS.REPORT_ALL)) {
      reports.push({
        id: 'user-wise',
        label: 'User-Wise Report',
        description: 'Performance analytics for compliance and product teams'
      });
    }

    // Expiring Soon Report - Available to compliance and managers
    if (hasPermission(userRole, PERMISSIONS.REPORT_EXPIRING_SOON) || 
        hasPermission(userRole, PERMISSIONS.REPORT_ALL)) {
      reports.push({
        id: 'expiring-soon',
        label: 'Expiring Tasks Report',
        description: 'Tasks approaching approval expiry dates'
      });
    }

    // Daily Movement Report - Available to managers and admin
    if (hasPermission(userRole, PERMISSIONS.REPORT_DAILY_MOVEMENT) || 
        hasPermission(userRole, PERMISSIONS.REPORT_ALL)) {
      reports.push({
        id: 'daily-movement',
        label: 'Daily Task Movement',
        description: 'Real-time task status changes and activity'
      });
    }

    // Rejected Tasks Report - Available to most roles for analysis
    if (hasPermission(userRole, PERMISSIONS.REPORT_REJECTED_TASKS) || 
        hasPermission(userRole, PERMISSIONS.REPORT_ALL)) {
      reports.push({
        id: 'rejected-tasks',
        label: 'Rejected Tasks Report',
        description: 'Analysis of rejected and closed tasks'
      });
    }

    return reports;
  };

  const availableReports = getAvailableReports();

  // Check if user can access specific user report types
  const canAccessComplianceUsers = hasPermission(userRole, PERMISSIONS.REPORT_COMPLIANCE_USERS) || 
                                   hasPermission(userRole, PERMISSIONS.REPORT_ALL);
  const canAccessProductUsers = hasPermission(userRole, PERMISSIONS.REPORT_PRODUCT_USERS) || 
                                hasPermission(userRole, PERMISSIONS.REPORT_ALL);

  return (
    <div className="report-selector">
      <div className="report-selector-tabs">
        {availableReports.map(report => (
          <button 
            key={report.id}
            className={`report-selector-tab ${
              selectedReportType === report.id 
                ? 'report-selector-tab-active' 
                : 'report-selector-tab-inactive'
            }`}
            onClick={() => onReportTypeChange(report.id)}
            title={report.description}
          >
            {report.label}
          </button>
        ))}
      </div>
      
      {/* User-wise report sub-navigation */}
      {selectedReportType === 'user-wise' && (
        <div className="flex gap-3 mb-2">
          {canAccessComplianceUsers && (
            <button
              className={`btn ${userReportType === 'compliance' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => onUserReportTypeChange('compliance')}
            >
              Compliance Users
            </button>
          )}
          {canAccessProductUsers && (
            <button
              className={`btn ${userReportType === 'product' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => onUserReportTypeChange('product')}
            >
              Product Users
            </button>
          )}
        </div>
      )}

      {/* Report description */}
      {selectedReportType && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            {availableReports.find(r => r.id === selectedReportType)?.description}
          </p>
        </div>
      )}

      {/* No access message */}
      {availableReports.length === 0 && (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800">
            No reports are available for your current role. Contact your administrator for access.
          </p>
        </div>
      )}
    </div>
  );
};

ReportSelector.propTypes = {
  selectedReportType: PropTypes.string.isRequired,
  onReportTypeChange: PropTypes.func.isRequired,
  userReportType: PropTypes.string.isRequired,
  onUserReportTypeChange: PropTypes.func.isRequired,
  userRole: PropTypes.string.isRequired
};

export default ReportSelector;