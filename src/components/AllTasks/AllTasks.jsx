import React, { useState, useEffect, useCallback, useRef } from 'react';
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
    const tableRef = useRef(null);

    const [filters, setFilters] = useState({
        taskType: '',
        status: '',
        createdBy: '',
        assignedTo: '',
        dateFrom: '',
        dateTo: '',
        search: '',
        page: 1,
        limit: 10
    });

    const [searchInput, setSearchInput] = useState('');
    const [createdByInput, setCreatedByInput] = useState('');
    const [assignedToInput, setAssignedToInput] = useState('');
    const debouncedSearch = useDebounce(searchInput, 500);
    const debouncedCreatedBy = useDebounce(createdByInput, 500);
    const debouncedAssignedTo = useDebounce(assignedToInput, 500);

    useEffect(() => {
        setFilters(prev => ({ ...prev, search: debouncedSearch, page: 1 }));
    }, [debouncedSearch]);

    useEffect(() => {
        setFilters(prev => ({ ...prev, createdBy: debouncedCreatedBy, page: 1 }));
    }, [debouncedCreatedBy]);

    useEffect(() => {
        setFilters(prev => ({ ...prev, assignedTo: debouncedAssignedTo, page: 1 }));
    }, [debouncedAssignedTo]);

    const [advancedSearch, setAdvancedSearch] = useState({
        enabled: false,
        query: '',
        type: 'all'
    });

    const [selectedRows, setSelectedRows] = useState([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [activeView, setActiveView] = useState('all');

    const [selectedTaskForDetail, setSelectedTaskForDetail] = useState(null);
    const [showTaskDetail, setShowTaskDetail] = useState(false);

    const [showReassignment, setShowReassignment] = useState(false);
    const [showBulkOperations, setShowBulkOperations] = useState(false);
    const [bulkOperationType, setBulkOperationType] = useState('');

    const [performBulkOperation, { isLoading: isBulkLoading }] = useBulkTaskOperationsMutation();
    const [validateFiles, { isLoading: isValidating }] = useValidateFilesMutation();

    const canCreateTasks = permissions.canCreateTask;
    const canViewTaskBuckets = permissions.canViewTaskBuckets;
    const canPerformBulkOps = permissions.canPerformBulkOperations;
    const canReassignTasks = permissions.canReassignTask;
    const canViewHealthCheck = permissions.canViewHealthCheck;
    const canAdvancedSearch = permissions.canAdvancedSearch;

    const buildQueryParams = (filterObj) => {
        const params = {};
        Object.keys(filterObj).forEach(key => {
            if (key !== 'priority' && filterObj[key] !== '' && filterObj[key] != null) {
                params[key] = filterObj[key];
            }
        });
        return params;
    };

    const applyPriorityFilter = useCallback((taskList) => {
        if (!filters.priority) return taskList;
        return taskList.filter(task => task.priority === filters.priority);
    }, [filters.priority]);

    const {
        data: tasksData,
        isLoading,
        isError,
        error,
        refetch,
        isFetching
    } = useGetTasksQuery(buildQueryParams(filters), {
        skip: activeView !== 'all' || advancedSearch.enabled,
        pollingInterval: 30000,
        refetchOnFocus: true,
        refetchOnReconnect: true,
        refetchOnMountOrArgChange: true
    });

    const {
        data: approvedNotPublishedData,
        isLoading: isLoadingApproved,
        isFetching: isFetchingApproved,
        refetch: refetchApproved
    } = useGetApprovedNotPublishedQuery(undefined, {
        skip: activeView !== 'approved-not-published',
        pollingInterval: 0
    });

    const {
        data: expiringSoonData,
        isLoading: isLoadingExpiring,
        isFetching: isFetchingExpiring,
        refetch: refetchExpiring
    } = useGetExpiringSoonQuery({ days: 15 }, {
        skip: activeView !== 'expiring-soon',
        pollingInterval: 0
    });

    const {
        data: advancedSearchData,
        isLoading: isAdvancedSearchLoading,
        isFetching: isFetchingAdvancedSearch,
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

    const { data: healthCheckData, refetch: refetchHealthCheck } = useGetTaskHealthCheckQuery(undefined, {
        skip: !canViewHealthCheck,
        pollingInterval: 300000
    });

    const getCurrentData = useCallback(() => {
        if (advancedSearch.enabled && advancedSearchData) {
            const results = advancedSearchData?.results || [];
            const priorityFiltered = applyPriorityFilter(results);
            return {
                tasks: priorityFiltered,
                pagination: advancedSearchData?.pagination || null,
                totalCount: advancedSearchData?.pagination?.totalCount || 0,
                isLoading: isAdvancedSearchLoading,
                isFetching: isFetchingAdvancedSearch,
                isError: false,
                error: null
            };
        }

        switch (activeView) {
            case 'approved-not-published':
                const approvedTasks = approvedNotPublishedData?.tasks || approvedNotPublishedData || [];
                const approvedFiltered = applyPriorityFilter(approvedTasks);
                return {
                    tasks: approvedFiltered,
                    pagination: {
                        page: 1,
                        totalCount: approvedFiltered.length,
                        totalPages: 1,
                        hasNext: false,
                        hasPrev: false
                    },
                    totalCount: approvedFiltered.length,
                    isLoading: isLoadingApproved,
                    isFetching: isFetchingApproved,
                    isError: false,
                    error: null
                };

            case 'expiring-soon':
                const expiringTasks = expiringSoonData?.tasks || expiringSoonData?.data || [];
                const expiringFiltered = applyPriorityFilter(expiringTasks);
                return {
                    tasks: expiringFiltered,
                    pagination: {
                        page: 1,
                        totalCount: expiringFiltered.length,
                        totalPages: 1,
                        hasNext: false,
                        hasPrev: false
                    },
                    totalCount: expiringFiltered.length,
                    isLoading: isLoadingExpiring,
                    isFetching: isFetchingExpiring,
                    isError: false,
                    error: null
                };

            default:
                const allTasks = tasksData?.tasks || [];
                const priorityFiltered = applyPriorityFilter(allTasks);
                return {
                    tasks: priorityFiltered,
                    pagination: tasksData?.pagination || null,
                    totalCount: tasksData?.pagination?.totalCount || 0,
                    isLoading: isLoading || isFetching,
                    isFetching: isFetching,
                    isError: isError,
                    error: error
                };
        }
    }, [advancedSearch, advancedSearchData, activeView, tasksData, approvedNotPublishedData, expiringSoonData, isLoading, isLoadingApproved, isLoadingExpiring, isAdvancedSearchLoading, isFetchingAdvancedSearch, isFetchingApproved, isFetchingExpiring, isError, error, isFetching, applyPriorityFilter]);

    const { tasks, pagination, totalCount, isLoading: currentLoading, isFetching: currentFetching, isError: currentError, error: currentErrorData } = getCurrentData();

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

    const totalPages = pagination
        ? Math.ceil(pagination.totalCount / filters.limit)
        : Math.ceil(totalCount / filters.limit);

    const handleFilterChange = useCallback((field, value) => {
        setFilters(prev => ({
            ...prev,
            [field]: value,
            ...(field !== 'page' && field !== 'limit' ? { page: 1 } : {})
        }));
    }, []);

    const handlePageChange = useCallback((newPage) => {
        setFilters(prev => ({ ...prev, page: newPage }));

        if (tableRef.current) {
            tableRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
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

    if (currentLoading && !tasks.length && !currentError) {
        return (
            <div className="container-lg section-md">
                <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-gray-600">Loading tasks...</span>
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
                        {currentLoading && (
                            <span className="ml-2 text-blue-600">• Loading...</span>
                        )}
                    </p>
                </div>
            </div>

            {currentError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-start">
                        <svg className="w-5 h-5 text-red-600 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div className="flex-1">
                            <h3 className="text-sm font-semibold text-red-800">Error loading tasks</h3>
                            <p className="text-sm text-red-700 mt-1">
                                {currentErrorData?.data?.message || currentErrorData?.message || 'An error occurred while fetching tasks'}
                            </p>
                            <button
                                onClick={() => refetch()}
                                className="mt-2 text-sm text-red-800 underline hover:no-underline"
                            >
                                Try again
                            </button>
                        </div>
                        <button
                            onClick={handleReset}
                            className="ml-4 text-sm text-red-600 hover:text-red-800"
                        >
                            Reset filters
                        </button>
                    </div>
                </div>
            )}

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

            <div className="filter-panel">
                <div className="card-header">
                    <h3 className="card-title">Filters</h3>
                </div>
                <div className="card-body">
                    <div className="filter-grid">
                        <div>
                            <label className="info-label">Task Type</label>
                            <select
                                className="select"
                                value={filters.taskType}
                                onChange={(e) => handleFilterChange('taskType', e.target.value)}
                                disabled={currentLoading}
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
                                disabled={currentLoading}
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
                            <label className="info-label">Priority  </label>
                            <select
                                className="select"
                                value={filters.priority}
                                onChange={(e) => handleFilterChange('priority', e.target.value)}
                                disabled={currentLoading}
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
                                placeholder="Search by creator name"
                                value={createdByInput}
                                onChange={(e) => setCreatedByInput(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="info-label">Assigned To</label>
                            <input
                                type="text"
                                className="input"
                                placeholder="Search by assignee name"
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
                                onChange={(e) => setSearchInput(e.target.value)} />
                        </div>
                    </div>

                    <div className="flex justify-between items-center  pt-4 border-t border-gray-100">
                        <div></div>
                        <div className="flex gap-3">
                            <button
                                className="btn btn-secondary"
                                onClick={handleReset}
                                disabled={currentLoading}
                            >
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Reset
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex-between mb-4">
                <div></div>


            </div>

            <div className="table-container" ref={tableRef}>
                <div className="table-toolbar">
                    <div className="table-toolbar-left">
                        <h3 className="text-heading-4">Task Management</h3>
                    </div>
                    <div className="table-toolbar-right">
                        <div className="flex gap-2">
                            <button className="report-export-btn btn-outline text-blue-600 hover:text-blue-700 border-blue-300 hover:border-blue-400 " onClick={handleExportCSV}>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Export CSV</button>
                        </div>

                        {canCreateTasks && (
                            <button
                                className="report-export-btn "
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

                {currentFetching && tasks.length > 0 ? (
                    <div className="flex-col-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                        <p className="text-caption">Loading...</p>
                    </div>
                ) : (
                    <>
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
                                        <td colSpan="9" className="text-center py-12">
                                            <div className="text-gray-500">
                                                <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                                <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
                                                <p className="text-gray-500 mb-4">
                                                    {currentError ?
                                                        'Unable to load tasks. Please check your filters or try again.' :
                                                        activeView === 'all' ?
                                                            'No tasks match your current filters. Try adjusting your search criteria.' :
                                                            `No ${activeView.replace('-', ' ')} tasks found.`
                                                    }
                                                </p>
                                                {!currentError && (
                                                    <button
                                                        onClick={handleReset}
                                                        className="btn btn-secondary"
                                                    >
                                                        Reset Filters
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

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
                                            disabled={currentLoading}
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
                                            onClick={() => handlePageChange(1)}
                                        >
                                            ⟨⟨
                                        </button>
                                        <button
                                            className="btn btn-secondary btn-sm"
                                            disabled={filters.page === 1 || currentLoading}
                                            onClick={() => handlePageChange(filters.page - 1)}
                                        >
                                            ⟨
                                        </button>
                                        <button
                                            className="btn btn-secondary btn-sm"
                                            disabled={filters.page >= totalPages || currentLoading}
                                            onClick={() => handlePageChange(filters.page + 1)}
                                        >
                                            ⟩
                                        </button>
                                        <button
                                            className="btn btn-secondary btn-sm"
                                            disabled={filters.page >= totalPages || currentLoading}
                                            onClick={() => handlePageChange(totalPages)}
                                        >
                                            ⟩⟩
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
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