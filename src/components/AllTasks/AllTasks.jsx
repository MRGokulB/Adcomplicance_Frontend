// src/components/AllTasks/AllTasks.jsx - Updated with new API endpoints and permissions
import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectUserRole } from '../../redux/slices/authSlice';
import { 
  useGetTasksQuery,
  useGetApprovedNotPublishedQuery,
  useGetExpiringSoonQuery,
  useAdvancedTaskSearchQuery, // NEW
  useBulkTaskOperationsMutation, // NEW
  useValidateFilesMutation, // NEW
  useGetTaskHealthCheckQuery, // NEW
  useUpdateTaskStatusMutation, // NEW
} from '../../redux/api/tasksApi';
import { hasPermission, PERMISSIONS } from '../../utils/roles';
import { 
  usePermissions, // Updated hook
  CanReassignTask, // NEW
  CanValidateFiles, // NEW
  CanPerformBulkOperations, // NEW
  CanViewHealthCheck, // NEW
  CanViewDashboardStats, // NEW
} from '../PermissionWrapper';
import CreateNewAdTask from '../Tasks/NewTask';
import TaskDetailPanel from './TaskDetailPanel';
import FileValidationModal from './FlieValidationModal'; // NEW - to be created
import TaskReassignmentModal from './TaskReassignmentModal' // NEW - to be created
import BulkOperationsModal from './BulkOperationsModal' // NEW - to be created

export default function AllTasksPage() {
    const navigate = useNavigate();
    const currentUserRole = useSelector(selectUserRole);
    const permissions = usePermissions();

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

    // NEW: Advanced search state
    const [advancedSearch, setAdvancedSearch] = useState({
        enabled: false,
        query: '',
        type: 'all' // 'title', 'description', 'uin', 'all'
    });

    const [selectedRows, setSelectedRows] = useState([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [activeView, setActiveView] = useState('all');

    // Task detail panel state
    const [selectedTaskForDetail, setSelectedTaskForDetail] = useState(null);
    const [showTaskDetail, setShowTaskDetail] = useState(false);

    // NEW: Modal states for new features
    const [showFileValidation, setShowFileValidation] = useState(false);
    const [showReassignment, setShowReassignment] = useState(false);
    const [showBulkOperations, setShowBulkOperations] = useState(false);
    const [bulkOperationType, setBulkOperationType] = useState('');

    // NEW: Bulk operations mutation
    const [performBulkOperation, { 
        isLoading: isBulkLoading, 
        error: bulkError 
    }] = useBulkTaskOperationsMutation();

    // NEW: File validation mutation
    const [validateFiles, { 
        isLoading: isValidating 
    }] = useValidateFilesMutation();

    // NEW: Status update mutation
    const [updateTaskStatus, { 
        isLoading: isUpdatingStatus 
    }] = useUpdateTaskStatusMutation();

    // Permission checks - Updated with new permissions
    const canCreateTasks = permissions.canCreateTask;
    const canViewTaskBuckets = permissions.canViewTaskBuckets;
    const canPerformBulkOps = permissions.canPerformBulkOperations;
    const canReassignTasks = permissions.canReassignTask;
    const canValidateFiles = permissions.canValidateFiles;
    const canViewHealthCheck = permissions.canViewHealthCheck;
    const canAdvancedSearch = permissions.canAdvancedSearch;

    // API queries based on active view
    const {
        data: tasksData,
        isLoading,
        isError,
        error,
        refetch
    } = useGetTasksQuery(filters, { skip: activeView !== 'all' });

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

    // NEW: Advanced search query
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

    // NEW: Health check query for system monitoring
    const {
        data: healthCheckData,
        refetch: refetchHealthCheck
    } = useGetTaskHealthCheckQuery(undefined, { 
        skip: !canViewHealthCheck,
        pollingInterval: 300000 // 5 minutes
    });

    // Get current data based on active view - Updated with advanced search
    const getCurrentData = () => {
        if (advancedSearch.enabled && advancedSearchData) {
            return {
                tasks: advancedSearchData?.results || [],
                pagination: advancedSearchData?.pagination || null,
                count: advancedSearchData?.pagination?.totalCount || 0,
                isLoading: isAdvancedSearchLoading
            };
        }

        switch (activeView) {
            case 'approved-not-published':
                return {
                    tasks: approvedNotPublishedData?.tasks || approvedNotPublishedData || [],
                    pagination: null,
                    count: approvedNotPublishedData?.count || (Array.isArray(approvedNotPublishedData) ? approvedNotPublishedData.length : 0),
                    isLoading: isLoadingApproved
                };
            case 'expiring-soon':
                return {
                    tasks: expiringSoonData?.tasks || expiringSoonData?.data || [],
                    pagination: null,
                    count: expiringSoonData?.summary?.totalExpiring || (Array.isArray(expiringSoonData?.data) ? expiringSoonData.data.length : 0),
                    isLoading: isLoadingExpiring
                };
            default:
                return {
                    tasks: tasksData?.tasks || [],
                    pagination: tasksData?.pagination || null,
                    count: tasksData?.pagination?.totalCount || 0,
                    isLoading: isLoading
                };
        }
    };

    const { tasks, pagination, count, isLoading: currentLoading } = getCurrentData();

    // Auto-refresh data
    useEffect(() => {
        const interval = setInterval(() => {
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
            // Also refresh health check
            if (canViewHealthCheck) {
                refetchHealthCheck();
            }
        }, 30000);

        return () => clearInterval(interval);
    }, [activeView, refetch, refetchApproved, refetchExpiring, refetchHealthCheck, canViewHealthCheck]);

    // Apply local filters to tasks
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

            return matchesCreatedBy && matchesAssignedTo && matchesRefNo && matchesSearch;
        });
    }, [tasks, localFilters]);

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

    // NEW: Handle advanced search
    const handleAdvancedSearch = () => {
        if (advancedSearch.query.trim()) {
            setAdvancedSearch(prev => ({ ...prev, enabled: true }));
            refetchAdvancedSearch();
        }
    };

    const clearAdvancedSearch = () => {
        setAdvancedSearch({ enabled: false, query: '', type: 'all' });
    };

    const handleViewChange = (view) => {
        setActiveView(view);
        setSelectedRows([]);
        setFilters(prev => ({ ...prev, page: 1 }));
        // Close task detail when switching views
        setShowTaskDetail(false);
        setSelectedTaskForDetail(null);
        // Clear advanced search when switching views
        clearAdvancedSearch();
    };

    // Handle row selection with task detail logic
    const handleRowSelect = (id, task) => {
        setSelectedRows(prev => {
            const newSelection = prev.includes(id) ? 
                prev.filter(rowId => rowId !== id) : 
                [...prev, id];
            
            // Show task detail only if exactly one task is selected
            if (newSelection.length === 1) {
                const selectedTask = paginatedData.find(t => t.id === newSelection[0]);
                setSelectedTaskForDetail(selectedTask?.id || null);
                setShowTaskDetail(true);
            } else {
                // Hide task detail if multiple or no tasks selected
                setShowTaskDetail(false);
                setSelectedTaskForDetail(null);
            }
            
            return newSelection;
        });
    };

    const handleSelectAll = () => {
        if (selectedRows.length === paginatedData.length) {
            setSelectedRows([]);
            setShowTaskDetail(false);
            setSelectedTaskForDetail(null);
        } else {
            const allIds = paginatedData.map(row => row.id);
            setSelectedRows(allIds);
            // Don't show details for multiple selections
            setShowTaskDetail(false);
            setSelectedTaskForDetail(null);
        }
    };

    // Handle task detail close
    const handleCloseTaskDetail = () => {
        setShowTaskDetail(false);
        setSelectedTaskForDetail(null);
        setSelectedRows([]); // Also clear selection
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
        setSelectedRows([]);
        // Close task detail on reset
        setShowTaskDetail(false);
        setSelectedTaskForDetail(null);
        // Clear advanced search
        clearAdvancedSearch();
    };

    // NEW: Handle bulk operations
    const handleBulkOperation = async (operation, data = {}) => {
        if (selectedRows.length === 0) return;

        try {
            const result = await performBulkOperation({
                operation,
                taskIds: selectedRows,
                ...data
            }).unwrap();

            // Show success message
            console.log('Bulk operation completed:', result);
            
            // Clear selection and refresh data
            setSelectedRows([]);
            setShowTaskDetail(false);
            setSelectedTaskForDetail(null);
            
            // Refresh current view
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

    // NEW: Handle file validation
    const handleFileValidation = async (files) => {
        try {
            const result = await validateFiles(files).unwrap();
            console.log('File validation result:', result);
            return result;
        } catch (error) {
            console.error('File validation failed:', error);
            throw error;
        }
    };

    const handleExportCSV = () => {
        const headers = ['UIN', 'Title', 'Task Type', 'Created By', 'Assigned Products', 'Assigned Compliance', 'Status', 'Priority', 'Last Updated'];
        const csvContent = [
            headers.join(','),
            ...filteredData.map(task => [
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
    };

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
                    <button onClick={refetch} className="btn btn-primary">
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="container-lg section-md">
            {/* Page Header */}
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
                    <button className="btn btn-outline">Export Excel</button>
                </div>
            </div>

            {/* Task Bucket Views */}
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
                        <button 
                            className={`btn btn-sm ${activeView === 'expiring-soon' ? 'btn-primary' : 'btn-outline'}`}
                            onClick={() => handleViewChange('expiring-soon')}
                        >
                            Expiring Soon
                        </button>
                    </div>
                </div>
            )}

            {/* Filter Panel */}
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
                            Showing {filteredData.length} of {count} tasks 
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
                    <div className="table-toolbar-right">
                        {/* NEW: File Validation Button */}
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

                {/* NEW: Enhanced selection bar with bulk operations */}
                {selectedRows.length > 0 && (
                    <div className="table-selection-bar">
                        <div className="table-selection-info">
                            {selectedRows.length} task{selectedRows.length > 1 ? 's' : ''} selected
                            {selectedRows.length === 1 && ' (details shown below)'}
                        </div>
                        <div className="table-selection-actions">
                            {/* NEW: Bulk Operations */}
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

                            {/* NEW: Individual Reassignment */}
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
                                onClick={() => {
                                    setSelectedRows([]);
                                    setShowTaskDetail(false);
                                    setSelectedTaskForDetail(null);
                                }}
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
                                    checked={selectedRows.length === paginatedData.length && paginatedData.length > 0} 
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
                        {paginatedData.length > 0 ? paginatedData.map((task) => (
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
                                                'No tasks match your current filters. Try adjusting your search criteria.' :
                                                `No ${activeView.replace('-', ' ')} tasks found.`
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
                            {selectedRows.length} of {filteredData.length} row(s) selected.
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

            {/* Task Detail Panel - Only show when exactly one task is selected */}
            {showTaskDetail && selectedTaskForDetail && selectedRows.length === 1 && (
                <TaskDetailPanel 
                    taskId={selectedTaskForDetail}
                    onClose={handleCloseTaskDetail}
                />
            )}

            {/* Create Task Modal */}
            {showCreateModal && (
                <CreateNewAdTask onClose={() => setShowCreateModal(false)} />
            )}

            {/* NEW: File Validation Modal */}
            {showFileValidation && (
                <FileValidationModal 
                    onClose={() => setShowFileValidation(false)}
                    onValidate={handleFileValidation}
                    isValidating={isValidating}
                />
            )}

            {/* NEW: Task Reassignment Modal */}
            {showReassignment && selectedRows.length === 1 && (
                <TaskReassignmentModal 
                    taskId={selectedRows[0]}
                    onClose={() => setShowReassignment(false)}
                    onSuccess={() => {
                        setShowReassignment(false);
                        refetch(); // Refresh data
                    }}
                />
            )}

            {/* NEW: Bulk Operations Modal */}
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
};