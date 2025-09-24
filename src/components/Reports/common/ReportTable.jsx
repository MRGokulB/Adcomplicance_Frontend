import PropTypes from 'prop-types';
import { useState, useMemo } from 'react';

const ReportTable = ({ 
  columns, 
  data, 
  emptyMessage,
  isLoading = false,
  pagination = null,
  onPageChange = null,
  selectable = false,
  onSelectionChange = null,
  actions = []
}) => {
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: 'asc'
  });
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  // Handle sorting
  const handleSort = (key) => {
    let direction = 'asc';
    
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    
    setSortConfig({ key, direction });
  };

  // Get sorted data
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return data;
    
    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      // Handle null/undefined values
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;
      
      // Handle different data types
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      if (aValue instanceof Date && bValue instanceof Date) {
        return sortConfig.direction === 'asc' 
          ? aValue.getTime() - bValue.getTime()
          : bValue.getTime() - aValue.getTime();
      }
      
      // String comparison
      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();
      
      if (aStr < bStr) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aStr > bStr) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [data, sortConfig]);

  // Handle pagination
  const paginatedData = useMemo(() => {
    if (pagination) return sortedData; // External pagination
    
    const startIndex = (currentPage - 1) * rowsPerPage;
    return sortedData.slice(startIndex, startIndex + rowsPerPage);
  }, [sortedData, currentPage, rowsPerPage, pagination]);

  // Handle row selection
  const handleRowSelect = (rowId) => {
    if (!selectable) return;
    
    const newSelected = new Set(selectedRows);
    if (newSelected.has(rowId)) {
      newSelected.delete(rowId);
    } else {
      newSelected.add(rowId);
    }
    
    setSelectedRows(newSelected);
    onSelectionChange?.(Array.from(newSelected));
  };

  const handleSelectAll = () => {
    if (!selectable) return;
    
    if (selectedRows.size === paginatedData.length) {
      setSelectedRows(new Set());
      onSelectionChange?.([]);
    } else {
      const allIds = new Set(paginatedData.map(row => row.id));
      setSelectedRows(allIds);
      onSelectionChange?.(Array.from(allIds));
    }
  };

  // Render sort icon
  const renderSortIcon = (columnId) => {
    if (sortConfig.key !== columnId) {
      return (
        <span className="table-sort-icon neutral">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 12 12">
            <path d="M6 3l3 3H3l3-3zM6 9L3 6h6l-3 3z"/>
          </svg>
        </span>
      );
    }
    
    return (
      <span className={`table-sort-icon ${sortConfig.direction}`}>
        {sortConfig.direction === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  // Render cell content with formatting
  const renderCell = (row, column) => {
    const value = row[column.id];
    
    if (column.render) {
      return column.render(value, row);
    }
    
    // Auto-format based on column type or value
    if (column.type === 'status' || column.id === 'status' || column.id === 'approvalStatus') {
      const statusClass = String(value).toLowerCase().replace(/[\s_]+/g, '');
      return (
        <span className={`report-status-pill ${statusClass}`}>
          {value}
        </span>
      );
    }
    
    if (column.type === 'date' || column.id.includes('Date')) {
      if (!value || value === '-') return '-';
      try {
        return new Date(value).toLocaleDateString();
      } catch {
        return value;
      }
    }
    
    if (column.type === 'number' || typeof value === 'number') {
      if (value == null) return '-';
      return Number(value).toLocaleString();
    }
    
    if (column.type === 'currency') {
      if (value == null) return '-';
      return new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: 'USD' 
      }).format(value);
    }
    
    if (column.type === 'percentage') {
      if (value == null) return '-';
      return `${Number(value).toFixed(1)}%`;
    }
    
    if (column.type === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    
    // Truncate long text
    if (typeof value === 'string' && value.length > 50) {
      return (
        <span title={value}>
          {value.substring(0, 47)}...
        </span>
      );
    }
    
    return value || '-';
  };

  // Handle pagination
  const totalPages = pagination ? pagination.totalPages : Math.ceil(sortedData.length / rowsPerPage);
  const currentPageData = pagination ? pagination.page : currentPage;

  const handlePageChange = (newPage) => {
    if (pagination && onPageChange) {
      onPageChange(newPage);
    } else {
      setCurrentPage(newPage);
    }
  };

  if (isLoading) {
    return (
      <div className="report-table-container">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading data...</p>
        </div>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="report-empty">
        <div className="report-empty-icon">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="report-empty-title">No Data Found</h3>
        <p className="report-empty-description">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="report-table-container">
      {/* Table Actions */}
      {(selectable || actions.length > 0) && (
        <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg">
          {selectable && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">
                {selectedRows.size} of {paginatedData.length} selected
              </span>
              {selectedRows.size > 0 && actions.length > 0 && (
                <div className="flex gap-2">
                  {actions.map(action => (
                    <button
                      key={action.id}
                      onClick={() => action.onClick(Array.from(selectedRows))}
                      className={`btn btn-sm ${action.variant || 'btn-secondary'}`}
                    >
                      {action.icon && <span className="mr-1">{action.icon}</span>}
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Rows per page:</span>
            <select
              value={rowsPerPage}
              onChange={(e) => setRowsPerPage(Number(e.target.value))}
              className="border border-gray-300 rounded px-2 py-1 text-sm"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="report-table">
          <thead className="report-table-header">
            <tr>
              {selectable && (
                <th className="w-12">
                  <input
                    type="checkbox"
                    checked={selectedRows.size === paginatedData.length && paginatedData.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300"
                  />
                </th>
              )}
              {columns.map(column => (
                <th 
                  key={column.id}
                  className={`${column.sortable ? 'table-sortable' : ''} ${column.width ? `w-${column.width}` : ''}`}
                  onClick={column.sortable ? () => handleSort(column.id) : undefined}
                  style={{ minWidth: column.minWidth }}
                >
                  <div className="flex items-center gap-1">
                    {column.label}
                    {column.sortable && renderSortIcon(column.id)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="report-table-body">
            {paginatedData.map(row => (
              <tr 
                key={row.id}
                className={`${selectedRows.has(row.id) ? 'bg-blue-50' : ''} hover:bg-gray-50`}
              >
                {selectable && (
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedRows.has(row.id)}
                      onChange={() => handleRowSelect(row.id)}
                      className="rounded border-gray-300"
                    />
                  </td>
                )}
                {columns.map(column => (
                  <td key={`${row.id}-${column.id}`} className={column.className}>
                    {renderCell(row, column)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-700">
            Showing {((currentPageData - 1) * (pagination?.limit || rowsPerPage)) + 1} to{' '}
            {Math.min(currentPageData * (pagination?.limit || rowsPerPage), data.length)} of{' '}
            {pagination?.total || data.length} results
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handlePageChange(currentPageData - 1)}
              disabled={currentPageData === 1}
              className="btn btn-outline btn-sm"
            >
              Previous
            </button>
            
            {/* Page numbers */}
            <div className="flex space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPageData <= 3) {
                  pageNum = i + 1;
                } else if (currentPageData > totalPages - 3) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPageData - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`px-3 py-1 text-sm rounded ${
                      pageNum === currentPageData
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={() => handlePageChange(currentPageData + 1)}
              disabled={currentPageData === totalPages}
              className="btn btn-outline btn-sm"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Table Footer Info */}
      <div className="mt-4 text-xs text-gray-500 text-center">
        {sortConfig.key && (
          <span>Sorted by {columns.find(c => c.id === sortConfig.key)?.label} ({sortConfig.direction})</span>
        )}
      </div>
    </div>
  );
};

ReportTable.propTypes = {
  columns: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    sortable: PropTypes.bool,
    type: PropTypes.oneOf(['text', 'number', 'date', 'status', 'currency', 'percentage', 'boolean']),
    width: PropTypes.string,
    minWidth: PropTypes.string,
    className: PropTypes.string,
    render: PropTypes.func
  })).isRequired,
  data: PropTypes.array.isRequired,
  emptyMessage: PropTypes.string,
  isLoading: PropTypes.bool,
  pagination: PropTypes.shape({
    page: PropTypes.number,
    totalPages: PropTypes.number,
    total: PropTypes.number,
    limit: PropTypes.number
  }),
  onPageChange: PropTypes.func,
  selectable: PropTypes.bool,
  onSelectionChange: PropTypes.func,
  actions: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    label: PropTypes.string.isRequired,
    onClick: PropTypes.func.isRequired,
    icon: PropTypes.node,
    variant: PropTypes.string
  }))
};

ReportTable.defaultProps = {
  emptyMessage: 'No data available for the selected filters.',
  isLoading: false,
  selectable: false,
  actions: []
};

export default ReportTable;