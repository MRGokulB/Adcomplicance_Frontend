//src/components/Dashboard/Table.jsx - Updated with dynamic data integration
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectUserRole } from '../../redux/slices/authSlice';
import { useGetTasksQuery } from '../../redux/api/tasksApi';
import { useGetUsersQuery } from '../../redux/api/usersApi';
import { usePermissions, CanCreateTask } from '../PermissionWrapper';
import CreateNewAdTask from '../Tasks/NewTask';
import { USER_ROLES } from '../../utils/roles';

const AdvancedTable = () => {
  const navigate = useNavigate();
  const userRole = useSelector(selectUserRole);
  const permissions = usePermissions();

  const [filters, setFilters] = useState({
    status: '',
    taskType: '',
    createdBy: '',
    assignedTo: '',
    priority: '',
    searchQuery: '',
    dateFrom: '',
    dateTo: ''
  });

  const [selectedRows, setSelectedRows] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Build API query parameters based on filters
  const queryParams = useMemo(() => {
    const params = {
      page: currentPage,
      limit: rowsPerPage
    };

    // Add filters to query params
    if (filters.status) params.status = filters.status;
    if (filters.taskType) params.taskType = filters.taskType;
    if (filters.priority) params.priority = filters.priority;
    if (filters.searchQuery) params.search = filters.searchQuery;

    return params;
  }, [filters, currentPage, rowsPerPage]);

  // Fetch tasks data
  const {
    data: tasksResponse,
    isLoading: isTasksLoading,
    error: tasksError,
    refetch: refetchTasks
  } = useGetTasksQuery(queryParams, {
    pollingInterval: 30000, // Refresh every 30 seconds
    refetchOnMountOrArgChange: true
  });

  // Fetch users for filter dropdown
  const { data: usersResponse } = useGetUsersQuery({ limit: 100 });

  // Extract data from API responses
  const tasks = tasksResponse?.tasks || [];
  const pagination = tasksResponse?.pagination || {};
  const users = usersResponse?.users || [];

  // Get unique values for filter dropdowns
  const uniqueStatuses = useMemo(() => {
    return Array.from(new Set(tasks.map(task => task.status))).filter(Boolean);
  }, [tasks]);

  const uniqueTaskTypes = useMemo(() => {
    return Array.from(new Set(tasks.map(task => task.taskType))).filter(Boolean);
  }, [tasks]);

  const uniquePriorities = useMemo(() => {
    return Array.from(new Set(tasks.map(task => task.priority))).filter(Boolean);
  }, [tasks]);

  // Handle filter changes
  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setCurrentPage(1); // Reset to first page when filtering
  };

  // Handle row selection
  const handleRowSelect = (id) => {
    setSelectedRows(prev =>
      prev.includes(id)
        ? prev.filter(rowId => rowId !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedRows.length === tasks.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(tasks.map(task => task._id));
    }
  };

  // Reset filters
  const handleReset = () => {
    setFilters({
      status: '',
      taskType: '',
      createdBy: '',
      assignedTo: '',
      priority: '',
      searchQuery: '',
      dateFrom: '',
      dateTo: ''
    });
    setCurrentPage(1);
    setSelectedRows([]);
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['UIN', 'Title', 'Status', 'Task Type', 'Created By', 'Created Date', 'Priority', 'Assigned Products', 'Assigned Compliance'];
    const csvContent = [
      headers.join(','),
      ...tasks.map(task => [
        task.uin || '',
        `"${task.title || ''}"`,
        task.status || '',
        task.taskType || '',
        task.createdBy?.fullName || '',
        new Date(task.createdAt).toLocaleDateString(),
        task.priority || '',
        task.assignedProducts?.map(p => p.fullName).join('; ') || '',
        task.assignedCompliance?.fullName || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tasks_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Get status badge class based on actual task statuses
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'PUBLISHED':
      case 'APPROVED':
        return 'badge-status-done';
      case 'PRODUCT_REVIEW':
      case 'COMPLIANCE_REVIEW':
        return 'badge-status-process';
      case 'OPEN':
        return 'badge-status-pending';
      case 'CLOSED_INTERNAL':
      case 'CLOSED_REJECTED':
        return 'badge-secondary';
      default:
        return 'badge-secondary';
    }
  };

  // Get priority badge class
  const getPriorityBadgeClass = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return 'badge-error';
      case 'medium':
        return 'badge-warning';
      case 'low':
        return 'badge-success';
      default:
        return 'badge-secondary';
    }
  };

  // Format status display name
  const formatStatusDisplay = (status) => {
    if (!status) return '';
    return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  // Handle task row click
  const handleTaskClick = (taskId) => {
    navigate(`/tasks/${taskId}`);
  };

  // Calculate total pages from API pagination
  const totalPages = pagination.totalPages || 1;

  if (tasksError) {
    return (
      <div className="container-lg section-md">
        <div className="card">
          <div className="card-body text-center py-8">
            <div className="text-red-600 mb-4">
              <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-semibold">Failed to Load Tasks</h3>
              <p className="text-gray-600 mt-2">Unable to fetch task data. Please try again.</p>
            </div>
            <button 
              onClick={() => refetchTasks()}
              className="btn btn-primary"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-lg section-md">
      {/* Filter Panel */}
      <div className="filter-panel mb-6">
        <div className="card-header">
          <h3 className="card-title">Filter & Search</h3>
        </div>
        <div className="card-body">
          {/* Top Row - Search and Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Search Tasks</label>
              <input
                type="text"
                className="input"
                placeholder="Search by title, UIN, or description..."
                value={filters.searchQuery}
                onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Date Range</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  className="input"
                  placeholder="From"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                />
                <span className="flex items-center text-gray-500">to</span>
                <input
                  type="date"
                  className="input"
                  placeholder="To"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Bottom Row - Dropdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Status</label>
              <select
                className="select"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="">All Statuses</option>
                {uniqueStatuses.map(status => (
                  <option key={status} value={status}>
                    {formatStatusDisplay(status)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Task Type</label>
              <select
                className="select"
                value={filters.taskType}
                onChange={(e) => handleFilterChange('taskType', e.target.value)}
              >
                <option value="">All Types</option>
                {uniqueTaskTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Priority</label>
              <select
                className="select"
                value={filters.priority}
                onChange={(e) => handleFilterChange('priority', e.target.value)}
              >
                <option value="">All Priorities</option>
                {uniquePriorities.map(priority => (
                  <option key={priority} value={priority}>
                    {priority?.charAt(0)?.toUpperCase() + priority?.slice(1)?.toLowerCase()}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Created By</label>
              <select
                className="select"
                value={filters.createdBy}
                onChange={(e) => handleFilterChange('createdBy', e.target.value)}
              >
                <option value="">All Users</option>
                {users.map(user => (
                  <option key={user._id} value={user._id}>
                    {user.fullName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex-between">
            <div className="text-sm text-gray-600">
              {pagination.total || 0} tasks found
              {filters.searchQuery && ` (filtered by "${filters.searchQuery}")`}
            </div>
            <div className="flex gap-3">
              <button
                className="btn btn-secondary"
                onClick={handleReset}
              >
                Reset Filters
              </button>
              <button
                className="btn btn-outline"
                onClick={handleExportCSV}
                disabled={tasks.length === 0}
              >
                Export CSV
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => refetchTasks()}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-header">
          <div className="flex-between">
            <h3 className="card-title">Tasks Overview</h3>
            <div className="flex gap-2">
              <CanCreateTask>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => setShowCreateModal(true)}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Create Task
                </button>
              </CanCreateTask>
            </div>
          </div>
        </div>

        <div className="table-container">
          {isTasksLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading tasks...</p>
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Tasks Found</h3>
              <p className="text-gray-600 mb-4">
                {Object.values(filters).some(v => v) 
                  ? "Try adjusting your filters to see more results."
                  : "No tasks have been created yet."
                }
              </p>
              <CanCreateTask>
                <button
                  className="btn btn-primary"
                  onClick={() => setShowCreateModal(true)}
                >
                  Create First Task
                </button>
              </CanCreateTask>
            </div>
          ) : (
            <table className="table">
              <thead className="table-header">
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={selectedRows.length === tasks.length && tasks.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 accent-blue-600"
                    />
                  </th>
                  <th>Task Details</th>
                  <th>Status</th>
                  <th>Type</th>
                  <th>Created By</th>
                  <th>Assigned To</th>
                  <th>Created Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {tasks.map((task) => (
                  <tr key={task._id} className="hover:bg-gray-50 cursor-pointer">
                    <td onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedRows.includes(task._id)}
                        onChange={() => handleRowSelect(task._id)}
                        className="w-4 h-4 accent-blue-600"
                      />
                    </td>
                    <td onClick={() => handleTaskClick(task._id)}>
                      <div>
                        <div className="font-medium text-gray-900">{task.title}</div>
                        <div className="text-sm text-gray-500">{task.uin}</div>
                        {task.priority && (
                          <span className={`badge badge-sm ${getPriorityBadgeClass(task.priority)} mt-1`}>
                            {task.priority}
                          </span>
                        )}
                      </div>
                    </td>
                    <td onClick={() => handleTaskClick(task._id)}>
                      <span className={`badge ${getStatusBadgeClass(task.status)}`}>
                        {formatStatusDisplay(task.status)}
                      </span>
                    </td>
                    <td onClick={() => handleTaskClick(task._id)}>
                      <span className="text-sm text-gray-700">
                        {task.taskType || 'Not Classified'}
                      </span>
                    </td>
                    <td onClick={() => handleTaskClick(task._id)}>
                      <div className="flex items-center gap-2">
                        <div className="card-avatar-sm">
                          {task.createdBy?.fullName?.split(' ').map(n => n[0]).join('') || 'U'}
                        </div>
                        <span className="text-sm text-gray-700">
                          {task.createdBy?.fullName || 'Unknown'}
                        </span>
                      </div>
                    </td>
                    <td onClick={() => handleTaskClick(task._id)}>
                      <div className="text-sm text-gray-700">
                        {task.assignedProducts?.length > 0 && (
                          <div>
                            <strong>Product:</strong> {task.assignedProducts.map(p => p.fullName).join(', ')}
                          </div>
                        )}
                        {task.assignedCompliance && (
                          <div>
                            <strong>Compliance:</strong> {task.assignedCompliance.fullName}
                          </div>
                        )}
                        {!task.assignedProducts?.length && !task.assignedCompliance && (
                          <span className="text-gray-400">Not assigned</span>
                        )}
                      </div>
                    </td>
                    <td onClick={() => handleTaskClick(task._id)}>
                      <span className="text-sm text-gray-600">
                        {new Date(task.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <button
                          className="btn btn-ghost btn-icon-sm"
                          onClick={() => handleTaskClick(task._id)}
                          title="View Task"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Table Footer - Pagination */}
        {tasks.length > 0 && (
          <div className="card-footer">
            <div className="flex-between">
              <div className="text-sm text-gray-600">
                {selectedRows.length} of {tasks.length} row(s) selected. 
                {pagination.total && ` (${pagination.total} total tasks)`}
              </div>
              <div className="flex gap-2 items-center">
                <div className="flex items-center gap-2 mr-4">
                  <span className="text-sm text-gray-600">Rows per page:</span>
                  <select
                    value={rowsPerPage}
                    onChange={(e) => {
                      setRowsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="select select-sm"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(1)}
                  >
                    ⟨⟨
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => prev - 1)}
                  >
                    ⟨
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => prev + 1)}
                  >
                    ⟩
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(totalPages)}
                  >
                    ⟩⟩
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Task Modal */}
      {showCreateModal && (
        <CreateNewAdTask onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
};

export default AdvancedTable;