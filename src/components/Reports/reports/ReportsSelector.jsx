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

    // Internal Tasks Report - Available to PRODUCT_USER (filtered), PRODUCT_ADMIN (full), and higher roles
    if (hasPermission(userRole, PERMISSIONS.REPORT_INTERNAL_TASKS)) {
      // Different description for PRODUCT_USER since they see filtered data
      const description = userRole === USER_ROLES.PRODUCT_USER 
        ? 'Internal tasks assigned to you or created by you'
        : 'Comprehensive report of all internal advertising tasks';
        
      reports.push({
        id: 'internal-tasks',
        label: 'MIS - Internal Tasks Report',
        description
      });
    }

    // Exchange Tasks Report - Available to PRODUCT_USER (filtered), PRODUCT_ADMIN (full), and higher roles
    if (hasPermission(userRole, PERMISSIONS.REPORT_EXCHANGE_TASKS)) {
      // Different description for PRODUCT_USER since they see filtered data
      const description = userRole === USER_ROLES.PRODUCT_USER 
        ? 'Exchange tasks assigned to you or created by you'
        : 'Report of tasks requiring exchange approvals';
        
      reports.push({
        id: 'exchange-tasks',
        label: 'MIS - Exchange Tasks Report',
        description
      });
    }

    // User-wise Reports - Available based on specific permissions
    if (hasPermission(userRole, PERMISSIONS.REPORT_COMPLIANCE_USERS) || 
        hasPermission(userRole, PERMISSIONS.REPORT_PRODUCT_USERS)) {
      reports.push({
        id: 'user-wise',
        label: 'User-Wise Report',
        description: 'Performance analytics for compliance and product teams'
      });
    }

    // Expiring Soon Report - Available to compliance and managers
    if (hasPermission(userRole, PERMISSIONS.REPORT_EXPIRING_SOON)) {
      reports.push({
        id: 'expiring-soon',
        label: 'Expiring Tasks Report',
        description: 'Tasks approaching approval expiry dates'
      });
    }

    // Daily Movement Report - Available to managers and admin
    if (hasPermission(userRole, PERMISSIONS.REPORT_DAILY_MOVEMENT)) {
      reports.push({
        id: 'daily-movement',
        label: 'Daily Task Movement',
        description: 'Real-time task status changes and activity'
      });
    }

    // Rejected Tasks Report - Available to most roles for analysis
    if (hasPermission(userRole, PERMISSIONS.REPORT_REJECTED_TASKS)) {
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
  const canAccessComplianceUsers = hasPermission(userRole, PERMISSIONS.REPORT_COMPLIANCE_USERS);
  const canAccessProductUsers = hasPermission(userRole, PERMISSIONS.REPORT_PRODUCT_USERS);

  // Auto-select first available report if current selection is not available
  if (availableReports.length > 0 && !availableReports.find(r => r.id === selectedReportType)) {
    onReportTypeChange(availableReports[0].id);
  }

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
          
          {/* Show message if user has no access to any user-wise reports */}
          {!canAccessComplianceUsers && !canAccessProductUsers && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                You don't have access to any user-wise reports.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Role-specific information banners */}
      {userRole === USER_ROLES.PRODUCT_USER && (selectedReportType === 'internal-tasks' || selectedReportType === 'exchange-tasks') && (
        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex">
            <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> This report shows only tasks that are assigned to you or created by you.
              </p>
            </div>
          </div>
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