// src/components/Dashboard/AdvancedTable.jsx - Dashboard-specific task table excluding closed and published tasks
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { selectUserRole } from '../../redux/slices/authSlice';
import {
    useGetTasksQuery,
    useGetApprovedNotPublishedQuery,
    useGetExpiringSoonQuery,
    useAdvancedTaskSearchQuery,
    useBulkTaskOperationsMutation,
    useValidateFilesMutation,
    useGetTaskHealthCheckQuery,
    useUpdateTaskStatusMutation,
} from '../../redux/api/tasksApi';
import { hasPermission, PERMISSIONS } from '../../utils/roles';
import {
    usePermissions,
    CanReassignTask,
    CanValidateFiles,
    CanPerformBulkOperations,
    CanViewHealthCheck,
    CanViewDashboardStats,
} from '../PermissionWrapper';
 

export default function AdvancedTable() {
    const navigate = useNavigate();
    const currentUserRole = useSelector(selectUserRole);
    const permissions = usePermissions();
    const dispatch = useDispatch();

    const [filters, setFilters] = useState({
        taskType: '',
        status: '',
        search: '',
        priority: '',
        page: 1,
        limit: 10
    });

    const [localFilters, setLocalFilters] = useState({
        createdBy: '',
        assignedTo: '',
        dateFrom: '',
        dateTo: '',
        refNo: '',
        searchQuery: ''
    });

    // Advanced search state
    const [advancedSearch, setAdvancedSearch] = useState({
        enabled: false,
        query: '',
        type: 'all' // 'title', 'description', 'uin', 'all'
    }); 
    const [activeView, setActiveView] = useState('all');

    // Permission checks - Updated with new permissions
    const canCreateTasks = permissions.canCreateTask;
    const canViewTaskBuckets = permissions.canViewTaskBuckets;
    const canPerformBulkOps = permissions.canPerformBulkOperations;
    const canReassignTasks = permissions.canReassignTask;
    const canValidateFiles = permissions.canValidateFiles;
    const canViewHealthCheck = permissions.canViewHealthCheck;
    const canAdvancedSearch = permissions.canAdvancedSearch;

    // EXCLUDED STATUSES - Key modification for AdvancedTable
    const EXCLUDED_STATUSES = ['CLOSED_INTERNAL', 'CLOSED_EXCHANGE', 'PUBLISHED'];

    // API queries based on active view
    const {
        data: tasksData,
        isLoading,
        isError,
        error,
        refetch
    } = useGetTasksQuery(filters, {
        skip: activeView !== 'all',
        refetchOnFocus: true,    
        refetchOnReconnect: true, 
        refetchOnMountOrArgChange: true
     });

    const {
        data: approvedNotPublishedData,
        isLoading: isLoadingApproved,
        refetch: refetchApproved
    } = useGetApprovedNotPublishedQuery(undefined, { skip: activeView !== 'approved-not-published' });

    const {
        data: expiringSoonData,
        isLoading: isLoadingExpiring,
        refetch: refetchExpiring
    } = useGetExpiringSoonQuery({ days: 15 });

    // Advanced search query
    const {
        data: advancedSearchData,
        isLoading: isAdvancedSearchLoading,
        refetch: refetchAdvancedSearch
    } = useAdvancedTaskSearchQuery(
        {
            q: advancedSearch.query,
            type: advancedSearch.type,
            page: filters.page,
            limit: filters.limit
        },
        {
            skip: !advancedSearch.enabled || !advancedSearch.query || !canAdvancedSearch
        }
    );

    // Health check query for system monitoring
    const {
        data: healthCheckData,
        refetch: refetchHealthCheck
    } = useGetTaskHealthCheckQuery(undefined, {
        skip: true,
        pollingInterval: 300000 // 5 minutes
    });

    // Function to filter out excluded statuses
    const filterActiveTasks = (taskList) => {
        if (!Array.isArray(taskList)) return [];
        return taskList.filter(task => !EXCLUDED_STATUSES.includes(task.status));
    };

    // Get current data based on active view - Updated with status filtering
    const getCurrentData = () => {
        if (advancedSearch.enabled && advancedSearchData) {
            const filteredResults = filterActiveTasks(advancedSearchData?.results || []);
            return {
                tasks: filteredResults,
                pagination: advancedSearchData?.pagination || null,
                count: filteredResults.length,
                isLoading: isAdvancedSearchLoading
            };
        }

        switch (activeView) {
            case 'approved-not-published':
                const approvedTasks = filterActiveTasks(approvedNotPublishedData?.tasks || approvedNotPublishedData || []);
                return {
                    tasks: approvedTasks,
                    pagination: null,
                    count: approvedTasks.length,
                    isLoading: isLoadingApproved
                };
            case 'expiring-soon':
                const expiringTasks = filterActiveTasks(expiringSoonData?.tasks || expiringSoonData?.data || []);
                return {
                    tasks: expiringTasks,
                    pagination: null,
                    count: expiringTasks.length,
                    isLoading: isLoadingExpiring
                };
            default:
                const allActiveTasks = filterActiveTasks(tasksData?.tasks || []);
                return {
                    tasks: allActiveTasks,
                    pagination: tasksData?.pagination || null,
                    count: allActiveTasks.length,
                    isLoading: isLoading
                };
        }
    };

    const { tasks, pagination, count, isLoading: currentLoading } = getCurrentData();

    // Add focus handling to refresh data when tab becomes active
    useEffect(() => {
        const handleFocus = () => {
            if (document.visibilityState === 'visible') {
                // Refresh current view when tab becomes visible
                switch (activeView) {
                    case 'approved-not-published':
                        refetchApproved();
                        break;
                    case 'expiring-soon':
                        refetchExpiring();
                        break;
                    default:
                        refetch();
                }
            }
        };

        document.addEventListener('visibilitychange', handleFocus);
        return () => document.removeEventListener('visibilitychange', handleFocus);
    }, [activeView, refetch, refetchApproved, refetchExpiring]);

    // Apply local filters to tasks (already filtered for active tasks)
    // Apply local filters to tasks (already filtered for active tasks)
const filteredData = useMemo(() => {
  return tasks.filter(task => {
    const matchesCreatedBy = !localFilters.createdBy ||
      task.createdBy?.fullName?.toLowerCase().includes(localFilters.createdBy.toLowerCase()) ||
      task.createdBy?.toLowerCase().includes(localFilters.createdBy.toLowerCase());

    const matchesAssignedTo = !localFilters.assignedTo ||
      task.assignedProducts?.some(product =>
        (typeof product === 'string' ? product : product.fullName)?.toLowerCase().includes(localFilters.assignedTo.toLowerCase())
      );

    const matchesRefNo = !localFilters.refNo ||
      (task.uin && task.uin.toLowerCase().includes(localFilters.refNo.toLowerCase()));

    const matchesSearch = !localFilters.searchQuery ||
      [task.title, task.description, task.uin, task.platform, task.category]
        .some(value => value && value.toString().toLowerCase().includes(localFilters.searchQuery.toLowerCase()));

    // Date filtering
    const matchesDateFrom = !localFilters.dateFrom ||
      (task.createdAt && new Date(task.createdAt) >= new Date(localFilters.dateFrom));

    const matchesDateTo = !localFilters.dateTo ||
      (task.createdAt && new Date(task.createdAt) <= new Date(localFilters.dateTo + 'T23:59:59'));

    // Priority filtering (from main filters state)
    const matchesPriority = !filters.priority ||
      task.priority === filters.priority;

    return matchesCreatedBy && 
           matchesAssignedTo && 
           matchesRefNo && 
           matchesSearch && 
           matchesDateFrom && 
           matchesDateTo && 
           matchesPriority;
  });
}, [tasks, localFilters, filters.priority]);

    // Pagination for filtered data
    const totalPages = Math.ceil(filteredData.length / filters.limit);
    const startIndex = (filters.page - 1) * filters.limit;
    const paginatedData = filteredData.slice(startIndex, startIndex + filters.limit);

    const handleFilterChange = (field, value) => {
        if (['taskType', 'status', 'search', 'priority'].includes(field)) {
            setFilters(prev => ({ ...prev, [field]: value, page: 1 }));
        } else {
            setLocalFilters(prev => ({ ...prev, [field]: value }));
        }
    };

    // Handle advanced search
    const handleAdvancedSearch = () => {
        if (advancedSearch.query.trim()) {
            setAdvancedSearch(prev => ({ ...prev, enabled: true }));
            refetchAdvancedSearch();
        }
    };

    const clearAdvancedSearch = () => {
        setAdvancedSearch({ enabled: false, query: '', type: 'all' });
    }; 

    const handleReset = () => {
        setFilters({
            taskType: '',
            status: '',
            search: '',
            priority: '',
            page: 1,
            limit: 10
        });
        setLocalFilters({
            createdBy: '',
            assignedTo: '',
            dateFrom: '',
            dateTo: '',
            refNo: '',
            searchQuery: ''
        }); 
        clearAdvancedSearch();
    }; 
    const getStatusBadge = (status) => {
        switch (status) {
            case 'OPEN': return 'table-status-indicator offline';
            case 'PRODUCT_REVIEW': return 'table-status-indicator busy';
            case 'COMPLIANCE_REVIEW': return 'table-status-indicator busy';
            case 'APPROVED': return 'table-status-indicator online';
            // Removed PUBLISHED, CLOSED_INTERNAL, CLOSED_EXCHANGE as they're filtered out
            default: return 'table-status-indicator offline';
        }
    };

    const getTaskTypeLabel = (taskType) => {
        return taskType === 'EXCHANGE' ? 'Exchange' : 'Internal';
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Loading state
    if (currentLoading && !tasks.length) {
        return (
            <div className="container-lg section-md">
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-gray-600">Loading active tasks...</span>
                </div>
            </div>
        );
    }

    // Error state
    if (isError) {
        return (
            <div className="container-lg section-md">
                <div className="text-center py-12">
                    <div className="text-red-600 mb-4">
                        <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load tasks</h3>
                    <p className="text-gray-600 mb-4">{error?.data?.message || 'An error occurred while fetching tasks'}</p>
                    <button onClick={refetch} className="btn btn-primary">
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="container-lg section-md">
            {/* Page Header - Modified for Dashboard context */}
            <div className="flex-between items-center mb-6">
                <div>
                    <h1 className="text-heading-2"> Tasks Overview</h1>
                    <p className="text-caption mt-2"> 
                        {advancedSearch.enabled && (
                            <span className="ml-2 text-green-600">• Advanced search active</span>
                        )}
                    </p>
                </div> 
            </div> 

            {/* Filter Panel */}
            <div className="filter-panel">
                <div className="card-header">
                    <h3 className="card-title">Filter & Search</h3>
                </div>
                <div className="card-body">
                    <div className="filter-grid">
                        <div>
                            <label className="info-label">Task Type</label>
                            <select
                                className="select"
                                value={filters.taskType}
                                onChange={(e) => handleFilterChange('taskType', e.target.value)}
                            >
                                <option value="">All Task Types</option>
                                <option value="INTERNAL">Internal</option>
                                <option value="EXCHANGE">Exchange</option>
                            </select>
                        </div>

                        <div>
                            <label className="info-label">Status</label>
                            <select
                                className="select"
                                value={filters.status}
                                onChange={(e) => handleFilterChange('status', e.target.value)}
                            >
                                <option value="">All Active Status</option>
                                <option value="OPEN">Open</option>
                                <option value="PRODUCT_REVIEW">Product Review</option>
                                <option value="COMPLIANCE_REVIEW">Compliance Review</option>
                                <option value="APPROVED">Approved</option>
                                {/* Removed PUBLISHED, CLOSED_INTERNAL, CLOSED_EXCHANGE options */}
                            </select>
                        </div>

                        <div>
                            <label className="info-label">Priority</label>
                            <select
                                className="select"
                                value={filters.priority}
                                onChange={(e) => handleFilterChange('priority', e.target.value)}
                            >
                                <option value="">All Priorities</option>
                                <option value="HIGH">High</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="LOW">Low</option>
                            </select>
                        </div>

                        <div>
                            <label className="info-label">Created By</label>
                            <input
                                type="text"
                                className="input"
                                placeholder="Search by creator"
                                value={localFilters.createdBy}
                                onChange={(e) => handleFilterChange('createdBy', e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="info-label">Assigned To</label>
                            <input
                                type="text"
                                className="input"
                                placeholder="Search assignee"
                                value={localFilters.assignedTo}
                                onChange={(e) => handleFilterChange('assignedTo', e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="info-label">Date From</label>
                            <input
                                type="date"
                                className="input"
                                value={localFilters.dateFrom}
                                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="info-label">Date To</label>
                            <input
                                type="date"
                                className="input"
                                value={localFilters.dateTo}
                                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="info-label">Search All</label>
                            <input
                                type="text"
                                className="input"
                                placeholder="Search everything..."
                                value={localFilters.searchQuery}
                                onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="filter-actions">
                        <div className="filter-summary">
                            Showing {filteredData.length} of {count} active tasks
                            {activeView !== 'all' && ` (${activeView.replace('-', ' ')})`}
                            {advancedSearch.enabled && ` • Advanced search: "${advancedSearch.query}"`}
                        </div>
                        <div className="filter-buttons">
                            <button className="btn btn-secondary" onClick={handleReset}>Reset</button>
                            <button className="btn btn-primary">Apply Filters</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="table-container">
                <div className="table-toolbar">
                    <div className="table-toolbar-left">
                        <h3 className="text-heading-4">Task Management</h3>
                    </div>
                </div> 

                <table className="table">
                    <thead className="table-header">
                        <tr>
                            <th className="table-sortable">UIN</th>
                            <th className="table-sortable">Title</th>
                            <th>Task Type</th>
                            <th>Status</th>
                            <th>Priority</th>
                            <th>Created By</th>
                            <th>Last Updated</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody className="table-body">
                        {paginatedData.length > 0 ? paginatedData.map((task) => (
                            <tr
                                key={task.id}
                                className="group"
                            > 
                                <td className="font-medium">{task.uin}</td>
                                <td className="max-w-xs truncate">{task.title}</td>
                                <td>
                                    <span className={`badge ${task.taskType === 'EXCHANGE' ? 'badge-warning' : 'badge-info'}`}>
                                        {getTaskTypeLabel(task.taskType)}
                                    </span>
                                </td>
                                <td>
                                    <span className={getStatusBadge(task.status)}>
                                        {task.status?.replace('_', ' ')}
                                    </span>
                                </td>
                                <td>
                                    {task.priority && (
                                        <span className={`badge ${task.priority === 'HIGH' ? 'badge-error' :
                                                task.priority === 'MEDIUM' ? 'badge-warning' : 'badge-success'
                                            }`}>
                                            {task.priority}
                                        </span>
                                    )}
                                </td>
                                <td className="text-sm text-gray-600">
                                    {task.createdBy?.fullName || task.createdBy}
                                </td>
                                <td className="text-sm text-gray-600">
                                    {formatDateTime(task.updatedAt || task.createdAt)}
                                </td>
                                <td>
                                    <div className="table-row-actions">
                                        <button
                                            className="btn btn-ghost btn-icon-sm"
                                            onClick={() => navigate('/tasks/' + task.id)}
                                            title="Open full task view"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                            </svg>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan="8" className="text-center py-12">
                                    <div className="text-gray-500">
                                        <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        <h3 className="text-lg font-medium text-gray-900 mb-2">No active tasks found</h3>
                                        <p className="text-gray-500">
                                            {activeView === 'all' ?
                                                'No active tasks match your current filters. Try adjusting your search criteria.' :
                                                `No active ${activeView.replace('-', ' ')} tasks found.`
                                            }
                                        </p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {/* Pagination Footer */}
                <div className="card-footer">
                    <div className="flex-between">
                        <div className="text-sm text-gray-600">
                            Showing {paginatedData.length} of {filteredData.length} tasks
                        </div>
                        <div className="flex gap-2 items-center">
                            <div className="flex items-center gap-2 mr-4">
                                <span className="text-sm text-gray-600">Rows per page:</span>
                                <select
                                    value={filters.limit}
                                    onChange={(e) => setFilters(prev => ({ ...prev, limit: Number(e.target.value), page: 1 }))}
                                    className="select"
                                >
                                    <option value={5}>5</option>
                                    <option value={10}>10</option>
                                    <option value={25}>25</option>
                                    <option value={50}>50</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-600">
                                    Page {filters.page} of {Math.max(1, totalPages)}
                                </span>
                                <button
                                    className="btn btn-secondary btn-sm"
                                    disabled={filters.page === 1}
                                    onClick={() => setFilters(prev => ({ ...prev, page: 1 }))}
                                >
                                    ⟨⟨
                                </button>
                                <button
                                    className="btn btn-secondary btn-sm"
                                    disabled={filters.page === 1}
                                    onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                                >
                                    ⟨
                                </button>
                                <button
                                    className="btn btn-secondary btn-sm"
                                    disabled={filters.page === totalPages}
                                    onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                                >
                                    ⟩
                                </button>
                                <button
                                    className="btn btn-secondary btn-sm"
                                    disabled={filters.page === totalPages}
                                    onClick={() => setFilters(prev => ({ ...prev, page: totalPages }))}
                                >
                                    ⟩⟩
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};