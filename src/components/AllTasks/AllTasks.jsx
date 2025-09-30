// src/components/AllTasks/AllTasks.jsx - OPTIMIZED VERSION
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
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
import {
    usePermissions,
    CanValidateFiles,
    CanPerformBulkOperations,
    CanReassignTask,
} from '../PermissionWrapper';
import CreateNewAdTask from '../Tasks/NewTask';
import TaskDetailPanel from './TaskDetailPanel';
import FileValidationModal from './FlieValidationModal';
import TaskReassignmentModal from './TaskReassignmentModal';
import BulkOperationsModal from './BulkOperationsModal';

// OPTIMIZED: Debounce hook
const useDebounce = (value, delay = 500) => {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => clearTimeout(handler);
    }, [value, delay]);

    return debouncedValue;
};

export default function AllTasksPage() {
    const navigate = useNavigate();
    const currentUserRole = useSelector(selectUserRole);
    const permissions = usePermissions();

    // OPTIMIZED: Single unified filters state - all server-side
    const [filters, setFilters] = useState({
        taskType: '',
        status: '',
        priority: '',
        createdBy: '',
        assignedTo: '',
        dateFrom: '',
        dateTo: '',
        search: '',
        page: 1,
        limit: 10
    });

    // OPTIMIZED: Separate state for immediate UI update
    const [searchInput, setSearchInput] = useState('');
    const [createdByInput, setCreatedByInput] = useState('');
    const [assignedToInput, setAssignedToInput] = useState('');

    // OPTIMIZED: Debounced values
    const debouncedSearch = useDebounce(searchInput, 500);
    const debouncedCreatedBy = useDebounce(createdByInput, 500);
    const debouncedAssignedTo = useDebounce(assignedToInput, 500);

    // Update filters when debounced values change
    useEffect(() => {
        setFilters(prev => ({ ...prev, search: debouncedSearch, page: 1 }));
    }, [debouncedSearch]);

    useEffect(() => {
        setFilters(prev => ({ ...prev, createdBy: debouncedCreatedBy, page: 1 }));
    }, [debouncedCreatedBy]);

    useEffect(() => {
        setFilters(prev => ({ ...prev, assignedTo: debouncedAssignedTo, page: 1 }));
    }, [debouncedAssignedTo]);

    // Advanced search state
    const [advancedSearch, setAdvancedSearch] = useState({
        enabled: false,
        query: '',
        type: 'all'
    });

    const [selectedRows, setSelectedRows] = useState([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [activeView, setActiveView] = useState('all');

    // Task detail panel state
    const [selectedTaskForDetail, setSelectedTaskForDetail] = useState(null);
    const [showTaskDetail, setShowTaskDetail] = useState(false);

    // Modal states
    const [showFileValidation, setShowFileValidation] = useState(false);
    const [showReassignment, setShowReassignment] = useState(false);
    const [showBulkOperations, setShowBulkOperations] = useState(false);
    const [bulkOperationType, setBulkOperationType] = useState('');

    // Mutations
    const [performBulkOperation, { isLoading: isBulkLoading }] = useBulkTaskOperationsMutation();
    const [validateFiles, { isLoading: isValidating }] = useValidateFilesMutation();

    // Permission checks
    const canCreateTasks = permissions.canCreateTask;
    const canViewTaskBuckets = permissions.canViewTaskBuckets;
    const canPerformBulkOps = permissions.canPerformBulkOperations;
    const canReassignTasks = permissions.canReassignTask;
    const canValidateFiles = permissions.canValidateFiles;
    const canViewHealthCheck = permissions.canViewHealthCheck;
    const canAdvancedSearch = permissions.canAdvancedSearch;

    // OPTIMIZED: API queries - conditional based on view
    const {
        data: tasksData,
        isLoading,
        isError,
        error,
        refetch,
        isFetching
    } = useGetTasksQuery(filters, { 
        skip: activeView !== 'all' || advancedSearch.enabled 
    });

    const {
        data: approvedNotPublishedData,
        isLoading: isLoadingApproved,
        refetch: refetchApproved
    } = useGetApprovedNotPublishedQuery(undefined, { 
        skip: activeView !== 'approved-not-published',
        pollingInterval: 0
    });

    const {
        data: expiringSoonData,
        isLoading: isLoadingExpiring,
        refetch: refetchExpiring
    } = useGetExpiringSoonQuery({ days: 15 }, {
        skip: activeView !== 'expiring-soon',
        pollingInterval: 0
    });

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

    // Health check
    const { data: healthCheckData, refetch: refetchHealthCheck } = useGetTaskHealthCheckQuery(undefined, {
        skip: !canViewHealthCheck,
        pollingInterval: 300000
    });

    // OPTIMIZED: Get current data - no client-side filtering
    const getCurrentData = useCallback(() => {
        if (advancedSearch.enabled && advancedSearchData) {
            return {
                tasks: advancedSearchData?.results || [],
                pagination: advancedSearchData?.pagination || null,
                totalCount: advancedSearchData?.pagination?.totalCount || 0,
                isLoading: isAdvancedSearchLoading
            };
        }

        switch (activeView) {
            case 'approved-not-published':
                const approvedTasks = approvedNotPublishedData?.tasks || approvedNotPublishedData || [];
                return {
                    tasks: approvedTasks,
                    pagination: null,
                    totalCount: approvedNotPublishedData?.count || approvedTasks.length,
                    isLoading: isLoadingApproved
                };
                
            case 'expiring-soon':
                const expiringTasks = expiringSoonData?.tasks || expiringSoonData?.data || [];
                return {
                    tasks: expiringTasks,
                    pagination: null,
                    totalCount: expiringSoonData?.summary?.totalExpiring || expiringTasks.length,
                    isLoading: isLoadingExpiring
                };
                
            default:
                return {
                    tasks: tasksData?.tasks || [],
                    pagination: tasksData?.pagination || null,
                    totalCount: tasksData?.pagination?.totalCount || 0,
                    isLoading: isLoading
                };
        }
    }, [advancedSearch, advancedSearchData, activeView, tasksData, approvedNotPublishedData, expiringSoonData, isLoading, isLoadingApproved, isLoadingExpiring, isAdvancedSearchLoading]);

    const { tasks, pagination, totalCount, isLoading: currentLoading } = getCurrentData();

    // Tab visibility handler
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
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

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [activeView, refetch, refetchApproved, refetchExpiring]);

    // OPTIMIZED: Server-side pagination
    const totalPages = pagination 
        ? Math.ceil(pagination.totalCount / filters.limit)
        : Math.ceil(totalCount / filters.limit);

    // OPTIMIZED: Simplified handlers
    const handleFilterChange = useCallback((field, value) => {
        setFilters(prev => ({ 
            ...prev, 
            [field]: value,
            page: 1
        }));
    }, []);

    const handleAdvancedSearch = useCallback(() => {
        if (advancedSearch.query.trim()) {
            setAdvancedSearch(prev => ({ ...prev, enabled: true }));
            refetchAdvancedSearch();
        }
    }, [advancedSearch.query, refetchAdvancedSearch]);

    const clearAdvancedSearch = useCallback(() => {
        setAdvancedSearch({ enabled: false, query: '', type: 'all' });
    }, []);

    const handleViewChange = useCallback((view) => {
        setActiveView(view);
        setSelectedRows([]);
        setFilters(prev => ({ ...prev, page: 1 }));
        setShowTaskDetail(false);
        setSelectedTaskForDetail(null);
        clearAdvancedSearch();
    }, [clearAdvancedSearch]);

    const handleRowSelect = useCallback((id, task) => {
        setSelectedRows(prev => {
            const newSelection = prev.includes(id) 
                ? prev.filter(rowId => rowId !== id)
                : [...prev, id];

            if (newSelection.length === 1) {
                const selectedTask = tasks.find(t => t.id === newSelection[0]);
                setSelectedTaskForDetail(selectedTask?.id || null);
                setShowTaskDetail(true);
            } else {
                setShowTaskDetail(false);
                setSelectedTaskForDetail(null);
            }

            return newSelection;
        });
    }, [tasks]);

    const handleSelectAll = useCallback(() => {
        if (selectedRows.length === tasks.length) {
            setSelectedRows([]);
            setShowTaskDetail(false);
            setSelectedTaskForDetail(null);
        } else {
            setSelectedRows(tasks.map(task => task.id));
            setShowTaskDetail(false);
            setSelectedTaskForDetail(null);
        }
    }, [selectedRows.length, tasks]);

    const handleCloseTaskDetail = useCallback(() => {
        setShowTaskDetail(false);
        setSelectedTaskForDetail(null);
        setSelectedRows([]);
    }, []);

    const handleReset = useCallback(() => {
        setFilters({
            taskType: '',
            status: '',
            priority: '',
            createdBy: '',
            assignedTo: '',
            dateFrom: '',
            dateTo: '',
            search: '',
            page: 1,
            limit: 10
        });
        setSearchInput('');
        setCreatedByInput('');
        setAssignedToInput('');
        setSelectedRows([]);
        setShowTaskDetail(false);
        setSelectedTaskForDetail(null);
        clearAdvancedSearch();
    }, [clearAdvancedSearch]);

    const handleBulkOperation = async (operation, data = {}) => {
        if (selectedRows.length === 0) return;

        try {
            await performBulkOperation({
                operation,
                taskIds: selectedRows,
                ...data
            }).unwrap();

            setSelectedRows([]);
            setShowTaskDetail(false);
            setSelectedTaskForDetail(null);

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
        } catch (error) {
            console.error('Bulk operation failed:', error);
        }
    };

    const handleFileValidation = async (files) => {
        try {
            const result = await validateFiles(files).unwrap();
            return result;
        } catch (error) {
            console.error('File validation failed:', error);
            throw error;
        }
    };

    const handleExportCSV = useCallback(() => {
        const headers = ['UIN', 'Title', 'Task Type', 'Created By', 'Assigned Products', 'Assigned Compliance', 'Status', 'Priority', 'Last Updated'];
        const csvContent = [
            headers.join(','),
            ...tasks.map(task => [
                task.uin || '',
                `"${task.title || ''}"`,
                task.taskType || '',
                task.createdBy?.fullName || task.createdBy || '',
                `"${Array.isArray(task.assignedProducts) ?
                    task.assignedProducts.map(p => typeof p === 'string' ? p : p.fullName).join('; ') :
                    ''}"`,
                task.assignedCompliance?.fullName || task.assignedCompliance || '',
                task.status || '',
                task.priority || '',
                task.lastUpdated || new Date(task.updatedAt || task.createdAt).toLocaleString()
            ].join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tasks_${activeView}_export_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    }, [tasks, activeView]);

    const getStatusBadge = (status) => {
        switch (status) {
            case 'OPEN': return 'table-status-indicator offline';
            case 'PRODUCT_REVIEW': return 'table-status-indicator busy';
            case 'COMPLIANCE_REVIEW': return 'table-status-indicator busy';
            case 'APPROVED': return 'table-status-indicator online';
            case 'PUBLISHED': return 'table-status-indicator online';
            case 'CLOSED_INTERNAL':
            case 'CLOSED_EXCHANGE':
                return 'table-status-indicator offline';
            default: return 'table-status-indicator offline';
        }
    };

    const getTaskTypeLabel = (taskType) => {
        return taskType === 'EXCHANGE' ? 'Exchange' : 'Internal';
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
                    <span className="ml-2 text-gray-600">Loading tasks...</span>
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
                    <button onClick={refetch} className="btn btn-primary">Try Again</button>
                </div>
            </div>
        );
    }

    return (
        <div className="container-lg section-md">
            <div className="flex-between items-center mb-6">
                <div>
                    <h1 className="text-heading-2">All Tasks</h1>
                    <p className="text-caption mt-2">
                        Full view of all tasks across statuses, teams, and roles
                        {showTaskDetail && selectedRows.length === 1 && (
                            <span className="ml-2 text-blue-600">• Task details shown below</span>
                        )}
                        {advancedSearch.enabled && (
                            <span className="ml-2 text-green-600">• Advanced search active</span>
                        )}
                    </p>
                </div>
                <div className="flex gap-2">
                    <button className="btn btn-outline" onClick={handleExportCSV}>Export CSV</button>
                </div>
            </div>

            {canViewTaskBuckets && (
                <div className="mb-6">
                    <div className="flex gap-2 mb-4">
                        <button
                            className={`btn btn-sm ${activeView === 'all' ? 'btn-primary' : 'btn-outline'}`}
                            onClick={() => handleViewChange('all')}
                        >
                            All Tasks
                        </button>
                        <button
                            className={`btn btn-sm ${activeView === 'approved-not-published' ? 'btn-primary' : 'btn-outline'}`}
                            onClick={() => handleViewChange('approved-not-published')}
                        >
                            Approved Not Published
                        </button>
                    </div>
                </div>
            )}

            {/* Filter Panel - OPTIMIZED with debouncing */}
            <div className="filter-panel">
                <div className="card-header">
                    <h3 className="card-title">Filters</h3>
                    {isFetching && <span className="text-xs text-blue-600">Updating...</span>}
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
                                <option value="">All Status</option>
                                <option value="OPEN">Open</option>
                                <option value="PRODUCT_REVIEW">Product Review</option>
                                <option value="COMPLIANCE_REVIEW">Compliance Review</option>
                                <option value="APPROVED">Approved</option>
                                <option value="PUBLISHED">Published</option>
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
                                value={createdByInput}
                                onChange={(e) => setCreatedByInput(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="info-label">Assigned To</label>
                            <input
                                type="text"
                                className="input"
                                placeholder="Search assignee"
                                value={assignedToInput}
                                onChange={(e) => setAssignedToInput(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="info-label">Date From</label>
                            <input
                                type="date"
                                className="input"
                                value={filters.dateFrom}
                                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="info-label">Date To</label>
                            <input
                                type="date"
                                className="input"
                                value={filters.dateTo}
                                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="info-label">Search All</label>
                            <input
                                type="text"
                                className="input"
                                placeholder="Search everything..."
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="filter-actions">
                        <div className="filter-summary">
                            Showing {tasks.length} of {totalCount} tasks
                            {activeView !== 'all' && ` (${activeView.replace('-', ' ')})`}
                            {advancedSearch.enabled && ` • Advanced search: "${advancedSearch.query}"`}
                        </div>
                        <div className="filter-buttons">
                            <button className="btn btn-secondary" onClick={handleReset}>Reset</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table with server-side pagination */}
            <div className="table-container">
                <div className="table-toolbar">
                    <div className="table-toolbar-left">
                        <h3 className="text-heading-4">Task Management</h3>
                    </div>
                    <div className="table-toolbar-right">
                        <CanValidateFiles>
                            <button
                                className="btn btn-outline btn-sm"
                                onClick={() => setShowFileValidation(true)}
                            >
                                Validate Files
                            </button>
                        </CanValidateFiles>

                        {canCreateTasks && (
                            <button
                                className="btn btn-primary btn-sm"
                                onClick={() => setShowCreateModal(true)}
                            >
                                + Add Task
                            </button>
                        )}
                    </div>
                </div>

                {selectedRows.length > 0 && (
                    <div className="table-selection-bar">
                        <div className="table-selection-info">
                            {selectedRows.length} task{selectedRows.length > 1 ? 's' : ''} selected
                            {selectedRows.length === 1 && ' (details shown below)'}
                        </div>
                        <div className="table-selection-actions">
                            <CanPerformBulkOperations>
                                <div className="flex gap-2">
                                    <button
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => {
                                            setBulkOperationType('bulk_status_update');
                                            setShowBulkOperations(true);
                                        }}
                                        disabled={isBulkLoading}
                                    >
                                        Bulk Status Update
                                    </button>
                                    <button
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => {
                                            setBulkOperationType('bulk_assignment');
                                            setShowBulkOperations(true);
                                        }}
                                        disabled={isBulkLoading}
                                    >
                                        Bulk Reassign
                                    </button>
                                </div>
                            </CanPerformBulkOperations>

                            <CanReassignTask>
                                {selectedRows.length === 1 && (
                                    <button
                                        className="btn btn-outline btn-sm"
                                        onClick={() => setShowReassignment(true)}
                                    >
                                        Reassign Task
                                    </button>
                                )}
                            </CanReassignTask>

                            <button
                                className="btn btn-ghost btn-sm"
                                onClick={handleCloseTaskDetail}
                            >
                                Clear Selection
                            </button>
                        </div>
                    </div>
                )}

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
                        {tasks.length > 0 ? tasks.map((task) => (
                            <tr
                                key={task.id}
                                className={`group ${selectedRows.includes(task.id) ? 'bg-blue-50' : ''}`}
                            >
                                <td>
                                    <input
                                        type="checkbox"
                                        checked={selectedRows.includes(task.id)}
                                        onChange={() => handleRowSelect(task.id, task)}
                                        className="w-4 h-4 accent-blue-600"
                                    />
                                </td>
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
                                        <span className={`badge ${
                                            task.priority === 'HIGH' ? 'badge-error' :
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
                                <td colSpan="9" className="text-center py-12">
                                    <div className="text-gray-500">
                                        <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
                                        <p className="text-gray-500">
                                            {activeView === 'all' ?
                                                'No tasks match your current filters.' :
                                                `No ${activeView.replace('-', ' ')} tasks found.`
                                            }
                                        </p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {/* Server-side pagination */}
                <div className="card-footer">
                    <div className="flex-between">
                        <div className="text-sm text-gray-600">
                            {selectedRows.length} of {totalCount} row(s) selected.
                        </div>
                        <div className="flex gap-2 items-center">
                            <div className="flex items-center gap-2 mr-4">
                                <span className="text-sm text-gray-600">Rows per page:</span>
                                <select
                                    value={filters.limit}
                                    onChange={(e) => handleFilterChange('limit', Number(e.target.value))}
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
                                    disabled={filters.page === 1 || currentLoading}
                                    onClick={() => handleFilterChange('page', 1)}
                                >
                                    ⟨⟨
                                </button>
                                <button
                                    className="btn btn-secondary btn-sm"
                                    disabled={filters.page === 1 || currentLoading}
                                    onClick={() => handleFilterChange('page', filters.page - 1)}
                                >
                                    ⟨
                                </button>
                                <button
                                    className="btn btn-secondary btn-sm"
                                    disabled={filters.page === totalPages || currentLoading}
                                    onClick={() => handleFilterChange('page', filters.page + 1)}
                                >
                                    ⟩
                                </button>
                                <button
                                    className="btn btn-secondary btn-sm"
                                    disabled={filters.page === totalPages || currentLoading}
                                    onClick={() => handleFilterChange('page', totalPages)}
                                >
                                    ⟩⟩
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {showTaskDetail && selectedTaskForDetail && selectedRows.length === 1 && (
                <TaskDetailPanel
                    taskId={selectedTaskForDetail}
                    onClose={handleCloseTaskDetail}
                />
            )}

            {showCreateModal && (
                <CreateNewAdTask onClose={() => setShowCreateModal(false)} />
            )}

            {showFileValidation && (
                <FileValidationModal
                    onClose={() => setShowFileValidation(false)}
                    onValidate={handleFileValidation}
                    isValidating={isValidating}
                />
            )}

            {showReassignment && selectedRows.length === 1 && (
                <TaskReassignmentModal
                    taskId={selectedRows[0]}
                    onClose={() => setShowReassignment(false)}
                    onSuccess={() => {
                        setShowReassignment(false);
                        refetch();
                    }}
                />
            )}

            {showBulkOperations && (
                <BulkOperationsModal
                    operationType={bulkOperationType}
                    selectedTasks={selectedRows}
                    onClose={() => setShowBulkOperations(false)}
                    onExecute={handleBulkOperation}
                    isLoading={isBulkLoading}
                />
            )}
        </div>
    );
}