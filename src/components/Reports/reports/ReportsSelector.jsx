import PropTypes from 'prop-types';

const ReportSelector = ({ 
  selectedReportType, 
  onReportTypeChange,
  userReportType,
  onUserReportTypeChange
}) => {
  return (
    <div className="report-selector">
      <div className="report-selector-tabs">
        <button 
          className={`report-selector-tab ${selectedReportType === 'internal-tasks' ? 'report-selector-tab-active' : 'report-selector-tab-inactive'}`}
          onClick={() => onReportTypeChange('internal-tasks')}
        >
          MIS - Internal Tasks Report
        </button>
        
        <button 
          className={`report-selector-tab ${selectedReportType === 'exchange-tasks' ? 'report-selector-tab-active' : 'report-selector-tab-inactive'}`}
          onClick={() => onReportTypeChange('exchange-tasks')}
        >
          MIS - Exchange Tasks Report
        </button>
        
        <button 
          className={`report-selector-tab ${selectedReportType === 'user-wise' ? 'report-selector-tab-active' : 'report-selector-tab-inactive'}`}
          onClick={() => onReportTypeChange('user-wise')}
        >
          User-Wise Report
        </button>
      </div>
      
      {selectedReportType === 'user-wise' && (
        <div className="flex gap-3 mb-2">
          <button
            className={`btn ${userReportType === 'compliance' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => onUserReportTypeChange('compliance')}
          >
            Compliance Users
          </button>
          <button
            className={`btn ${userReportType === 'product' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => onUserReportTypeChange('product')}
          >
            Product Users
          </button>
        </div>
      )}
    </div>
  );
};

ReportSelector.propTypes = {
  selectedReportType: PropTypes.string.isRequired,
  onReportTypeChange: PropTypes.func.isRequired,
  userReportType: PropTypes.string.isRequired,
  onUserReportTypeChange: PropTypes.func.isRequired
};

export default ReportSelector;