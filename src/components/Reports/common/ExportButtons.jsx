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

  const convertToCSV = (data, columns) => {
    if (!data.length) return '';

    const headers = columns.length > 0 
      ? columns.map(col => col.label || col.id)
      : Object.keys(data[0]);

    const columnIds = columns.length > 0 
      ? columns.map(col => col.id)
      : Object.keys(data[0]);

    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        columnIds.map(id => {
          const value = row[id];
          if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value || '';
        }).join(',')
      )
    ].join('\n');

    return csvContent;
  };

  const convertToExcel = (data, columns) => {
    const csvData = convertToCSV(data, columns);
    return csvData;
  };

  const generatePDF = async (data, columns) => {
    if (!window.jspdf) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      document.head.appendChild(script);
      await new Promise((resolve) => { script.onload = resolve; });
    }

    if (!window.jspdf.jsPDF.prototype.autoTable) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js';
      document.head.appendChild(script);
      await new Promise((resolve) => { script.onload = resolve; });
    }

    const { jsPDF } = window.jspdf;
    
    const numColumns = columns.length > 0 ? columns.length : Object.keys(data[0] || {}).length;
    const orientation = numColumns > 6 ? 'landscape' : 'portrait';
    
    const doc = new jsPDF({
      orientation: orientation,
      unit: 'mm',
      format: 'a4'
    });
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    doc.setFillColor(41, 128, 185);
    doc.rect(0, 0, pageWidth, 35, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text('Report Export', 14, 15);
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 23);
    doc.text(`Total Records: ${data.length}`, 14, 29);
    
    doc.setTextColor(0, 0, 0);

    const headers = columns.length > 0 
      ? columns.map(col => col.label || col.id)
      : Object.keys(data[0]);

    const columnIds = columns.length > 0 
      ? columns.map(col => col.id)
      : Object.keys(data[0]);

    const tableData = data.map(row => 
      columnIds.map(id => {
        const value = row[id];
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value);
      })
    );

    doc.autoTable({
      head: [headers],
      body: tableData,
      startY: 38,
      styles: { 
        fontSize: 9,
        cellPadding: 3,
        overflow: 'linebreak',
        cellWidth: 'wrap',
        valign: 'middle',
        lineColor: [200, 200, 200],
        lineWidth: 0.1
      },
      headStyles: {
        fillColor: [52, 73, 94],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'left',
        fontSize: 10,
        cellPadding: 4
      },
      alternateRowStyles: {
        fillColor: [248, 249, 250]
      },
      rowStyles: {
        fillColor: [255, 255, 255]
      },
      margin: { left: 14, right: 14, top: 38, bottom: 25 },
      tableWidth: 'auto',
      theme: 'grid',
      didDrawPage: function (data) {
        doc.setFillColor(240, 240, 240);
        doc.rect(0, pageHeight - 20, pageWidth, 20, 'F');
        
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        const pageText = `Page ${data.pageNumber} of ${doc.internal.getNumberOfPages()}`;
        doc.text(pageText, pageWidth / 2, pageHeight - 10, { align: 'center' });
        
        doc.setFontSize(8);
        doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, pageHeight - 10);
      },
      didParseCell: function(data) {
        if (data.section === 'body' && data.row.index % 2 === 0) {
          data.cell.styles.fillColor = [248, 249, 250];
        }
      }
    });

    return doc;
  };

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

  const handleExport = async (format) => {
    if (disabled || isLoading || !data.length) return;

    setExporting(format);

    try {
      if (onExport) {
        await onExport(format, data);
        return;
      }

      const timestamp = new Date().toISOString().split('T')[0];
      const fullFilename = `${filename}_${timestamp}`;

      let content, mimeType, extension;

      switch (format) {
        case 'csv':
          content = convertToCSV(data, columns);
          mimeType = 'text/csv;charset=utf-8;';
          extension = 'csv';
          downloadFile(content, `${fullFilename}.${extension}`, mimeType);
          break;

        case 'excel':
          content = '\ufeff' + convertToExcel(data, columns);
          mimeType = 'application/vnd.ms-excel;charset=utf-8;';
          extension = 'csv';
          downloadFile(content, `${fullFilename}.${extension}`, mimeType);
          break;

        case 'pdf':
          const pdf = await generatePDF(data, columns);
          pdf.save(`${fullFilename}.pdf`);
          break;

        default:
          throw new Error(`Unsupported export format: ${format}`);
      }

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