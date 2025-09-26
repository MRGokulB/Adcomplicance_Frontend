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
        <span className="ml-1 text-gray-400">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 12 12">
            <path d="M6 3l3 3H3l3-3zM6 9L3 6h6l-3 3z"/>
          </svg>
        </span>
      );
    }
    
    return (
      <span className={`ml-1 text-blue-600`}>
        {sortConfig.direction === 'asc' ? 
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 12 12">
            <path d="M6 3l3 3H3l3-3z"/>
          </svg> : 
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 12 12">
            <path d="M6 9L3 6h6l-3 3z"/>
          </svg>
        }
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
    if (column.type === 'status' || column.id === 'status' || column.id === 'approvalStatus' || column.id === 'taskStatus') {
      const statusClass = String(value).toLowerCase().replace(/[\s_]+/g, '');
      return (
        <span className={`badge ${getStatusBadgeClass(statusClass)}`}>
          {String(value).replace(/_/g, ' ')}
        </span>
      );
    }
    
    if (column.type === 'date' || column.id.includes('Date') || column.id === 'createdAt' || column.id === 'approvalDate' || column.id === 'expiryDate') {
      if (!value || value === '-') return <span className="text-gray-500">-</span>;
      try {
        return <span className="text-sm text-gray-700">{new Date(value).toLocaleDateString()}</span>;
      } catch {
        return <span className="text-sm text-gray-700">{value}</span>;
      }
    }
    
    if (column.type === 'number' || typeof value === 'number') {
      if (value == null) return <span className="text-gray-500">-</span>;
      return <span className="text-sm text-gray-900 font-medium">{Number(value).toLocaleString()}</span>;
    }
    
    if (column.type === 'currency') {
      if (value == null) return <span className="text-gray-500">-</span>;
      return <span className="text-sm text-gray-900 font-medium">
        {new Intl.NumberFormat('en-US', { 
          style: 'currency', 
          currency: 'USD' 
        }).format(value)}
      </span>;
    }
    
    if (column.type === 'percentage') {
      if (value == null) return <span className="text-gray-500">-</span>;
      return <span className="text-sm text-gray-900 font-medium">{Number(value).toFixed(1)}%</span>;
    }
    
    if (column.type === 'boolean') {
      return <span className="text-sm text-gray-700">{value ? 'Yes' : 'No'}</span>;
    }

    // Handle role display
    if (column.id === 'role' || column.id === 'userRole') {
      return <span className={getRoleBadgeClass(value)}>{String(value).replace('_', ' ')}</span>;
    }

    // Handle UIN with clickable styling
    if (column.id === 'uin') {
      return <span className="font-medium text-gray-900">{value}</span>;
    }

    // Handle names and titles
    if (column.id === 'fullName' || column.id === 'createdBy' || column.id === 'performedBy' || column.id === 'assignedTo' || column.id === 'updatedBy') {
      return <span className="font-medium text-gray-900">{value || '-'}</span>;
    }

    // Handle titles with truncation
    if (column.id === 'title') {
      if (typeof value === 'string' && value.length > 50) {
        return (
          <span className="text-gray-900" title={value}>
            {value.substring(0, 47)}...
          </span>
        );
      }
      return <span className="text-gray-900">{value || '-'}</span>;
    }
    
    // Default text formatting
    return <span className="text-sm text-gray-700">{value || '-'}</span>;
  };

  // Get status badge class similar to AuditLog
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'approved':
      case 'published':
        return 'badge-success';
      case 'pending':
      case 'productreview':
      case 'compliancereview':
        return 'badge-warning';
      case 'rejected':
      case 'closedin':
      case 'closedinternal':
      case 'closedexchange':
        return 'badge-error';
      case 'open':
        return 'badge-secondary';
      default:
        return 'badge-primary';
    }
  };

  // Get role badge class similar to AuditLog
  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'PRODUCT_USER':
        return 'badge badge-primary';
      case 'COMPLIANCE_USER':
        return 'badge badge-warning';
      case 'PRODUCT_ADMIN':
        return 'badge badge-success';
      case 'COMPLIANCE_ADMIN':
        return 'badge badge-info';
      case 'SENIOR_MANAGER':
        return 'badge badge-secondary';
      case 'ADMIN':
        return 'badge badge-error';
      case 'SYSTEM':
        return 'badge badge-secondary';
      default:
        return 'badge badge-secondary';
    }
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
      <div className="card">
        <div className="card-body text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading data...</p>
        </div>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="card">
        <div className="card-body text-center py-12">
          <div className="table-empty">
            <svg className="table-empty-icon" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
            <h3 className="table-empty-title">No Data Found</h3>
            <p className="table-empty-description">{emptyMessage}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Table Actions */}
      {(selectable || actions.length > 0) && (
        <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
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
              className="select"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      )}

      {/* Table - Using same classes as AuditLog */}
      <div className="card">
        <div className="table-container">
          <table className="table table-modern">
            <thead className="table-header">
              <tr>
                {selectable && (
                  <th>
                    <input
                      type="checkbox"
                      checked={selectedRows.size === paginatedData.length && paginatedData.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 accent-blue-600"
                    />
                  </th>
                )}
                {columns.map(column => (
                  <th 
                    key={column.id}
                    className={`${column.sortable ? 'table-sortable cursor-pointer select-none hover:bg-gray-100' : ''} ${column.width ? `w-${column.width}` : ''}`}
                    onClick={column.sortable ? () => handleSort(column.id) : undefined}
                    style={{ minWidth: column.minWidth }}
                  >
                    <div className="flex items-center">
                      {column.label}
                      {column.sortable && renderSortIcon(column.id)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="table-body">
              {paginatedData.map(row => (
                <tr 
                  key={row.id}
                  className={`group ${selectedRows.has(row.id) ? 'bg-blue-50' : ''}`}
                >
                  {selectable && (
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedRows.has(row.id)}
                        onChange={() => handleRowSelect(row.id)}
                        className="w-4 h-4 accent-blue-600"
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
          <div className="flex items-center justify-between mt-6 p-4 border-t border-gray-200">
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
        <div className="p-3 text-xs text-gray-500 text-center border-t border-gray-100">
          {sortConfig.key && (
            <span>Sorted by {columns.find(c => c.id === sortConfig.key)?.label} ({sortConfig.direction === 'asc' ? 'ascending' : 'descending'})</span>
          )}
        </div>
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