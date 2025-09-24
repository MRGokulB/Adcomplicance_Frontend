import { useState } from 'react';
import PropTypes from 'prop-types';

const ExportButtons = ({ 
  data = [], 
  filename = 'report', 
  isLoading = false, 
  onExport = null,
  disabled = false,
  columns = []
}) => {
  const [exporting, setExporting] = useState(null);

  // Convert data to CSV format
  const convertToCSV = (data, columns) => {
    if (!data.length) return '';

    // Use provided columns or infer from data
    const headers = columns.length > 0 
      ? columns.map(col => col.label || col.id)
      : Object.keys(data[0]);

    const columnIds = columns.length > 0 
      ? columns.map(col => col.id)
      : Object.keys(data[0]);

    // Create CSV content
    const csvContent = [
      // Header row
      headers.join(','),
      // Data rows
      ...data.map(row => 
        columnIds.map(id => {
          const value = row[id];
          // Handle values that contain commas, quotes, or newlines
          if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value || '';
        }).join(',')
      )
    ].join('\n');

    return csvContent;
  };

  // Convert data to Excel-compatible format
  const convertToExcel = (data, columns) => {
    // This is a simplified Excel export - for full Excel support, you'd use a library like xlsx
    const csvData = convertToCSV(data, columns);
    return csvData;
  };

  // Create and download file
  const downloadFile = (content, filename, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  // Generate PDF (basic implementation - for advanced PDFs, use jsPDF or similar)
  const generatePDF = (data, columns) => {
    const csvData = convertToCSV(data, columns);
    const timestamp = new Date().toLocaleString();
    
    const pdfContent = `
REPORT EXPORT
Generated: ${timestamp}
Total Records: ${data.length}

${csvData.split('\n').map(line => line.replace(/,/g, ' | ')).join('\n')}
    `.trim();

    return pdfContent;
  };

  const handleExport = async (format) => {
    if (disabled || isLoading || !data.length) return;

    setExporting(format);

    try {
      // If custom export handler is provided, use it
      if (onExport) {
        await onExport(format, data);
        return;
      }

      // Generate timestamp for filename
      const timestamp = new Date().toISOString().split('T')[0];
      const fullFilename = `${filename}_${timestamp}`;

      let content, mimeType, extension;

      switch (format) {
        case 'csv':
          content = convertToCSV(data, columns);
          mimeType = 'text/csv;charset=utf-8;';
          extension = 'csv';
          break;

        case 'excel':
          content = '\ufeff' + convertToExcel(data, columns); // BOM for Excel UTF-8 support
          mimeType = 'application/vnd.ms-excel;charset=utf-8;';
          extension = 'csv'; // Using CSV format that Excel can open
          break;

        case 'pdf':
          content = generatePDF(data, columns);
          mimeType = 'text/plain;charset=utf-8;';
          extension = 'txt'; // Basic text format - upgrade to actual PDF with proper library
          break;

        default:
          throw new Error(`Unsupported export format: ${format}`);
      }

      downloadFile(content, `${fullFilename}.${extension}`, mimeType);

    } catch (error) {
      console.error('Export failed:', error);
      alert(`Export failed: ${error.message}`);
    } finally {
      setExporting(null);
    }
  };

  const exportOptions = [
    {
      format: 'excel',
      label: 'Excel',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      color: 'text-green-600 hover:text-green-700 border-green-300 hover:border-green-400'
    },
    {
      format: 'csv',
      label: 'CSV',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      color: 'text-blue-600 hover:text-blue-700 border-blue-300 hover:border-blue-400'
    },
    {
      format: 'pdf',
      label: 'PDF',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
      color: 'text-red-600 hover:text-red-700 border-red-300 hover:border-red-400'
    }
  ];

  return (
    <div className="report-export-actions">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600 mr-2">Export:</span>
        
        {exportOptions.map(option => (
          <button
            key={option.format}
            className={`report-export-btn btn-outline ${option.color} ${
              disabled || isLoading || !data.length ? 'opacity-50 cursor-not-allowed' : ''
            }`}
            onClick={() => handleExport(option.format)}
            disabled={disabled || isLoading || !data.length || exporting === option.format}
            title={`Export as ${option.label}`}
          >
            {exporting === option.format ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
            ) : (
              option.icon
            )}
            <span className="ml-1">
              {exporting === option.format ? 'Exporting...' : option.label}
            </span>
          </button>
        ))}
      </div>

      {/* Export Info */}
      <div className="mt-2">
        <p className="text-xs text-gray-500">
          {data.length === 0 ? (
            'No data available for export'
          ) : (
            `Ready to export ${data.length} record${data.length !== 1 ? 's' : ''}`
          )}
        </p>
      </div>

      {/* Export Statistics */}
      {data.length > 0 && (
        <div className="mt-1 text-xs text-gray-400">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      )}
    </div>
  );
};

ExportButtons.propTypes = {
  data: PropTypes.array,
  filename: PropTypes.string,
  isLoading: PropTypes.bool,
  onExport: PropTypes.func,
  disabled: PropTypes.bool,
  columns: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    label: PropTypes.string,
  }))
};

export default ExportButtons;