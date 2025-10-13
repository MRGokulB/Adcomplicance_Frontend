import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectUserRole } from '../../redux/slices/authSlice';
import {
    useGetTasksQuery,
    useGetApprovedNotPublishedQuery,
    useGetExpiringSoonQuery,
    useAdvancedTaskSearchQuery,
} from '../../redux/api/tasksApi';
import { usePermissions } from '../PermissionWrapper';

export default function AdvancedTable() {
    const navigate = useNavigate();
    const currentUserRole = useSelector(selectUserRole);
    const permissions = usePermissions();
    const tableRef = useRef(null);

    const [filters, setFilters] = useState({
        taskType: '',
        status: '',
        priority: '',
        createdBy: '',
        assignedTo: '',
        dateFrom: '',
        dateTo: '',
        searchQuery: '',
        page: 1,
        limit: 10
    });

    const [advancedSearch, setAdvancedSearch] = useState({
        enabled: false,
        query: '',
        type: 'all'
    });

    const [activeView, setActiveView] = useState('all');

    const canAdvancedSearch = permissions.canAdvancedSearch;

    const EXCLUDED_STATUSES = ['CLOSED_INTERNAL', 'CLOSED_EXCHANGE', 'PUBLISHED'];

    const serverFilters = useMemo(() => {
        const { priority, ...restFilters } = filters;
        return restFilters;
    }, [filters]);

    const {
        data: tasksData,
        isLoading,
        isError,
        error,
        refetch
    } = useGetTasksQuery(serverFilters, {
        skip: activeView !== 'all',
        refetchOnFocus: true,
        refetchOnReconnect: true,
        refetchOnMountOrArgChange: true
    });

    const {
        data: approvedNotPublishedData,
        isLoading: isLoadingApproved,
        refetch: refetchApproved
    } = useGetApprovedNotPublishedQuery(undefined, {
        skip: activeView !== 'approved-not-published'
    });

    const {
        data: expiringSoonData,
        isLoading: isLoadingExpiring,
        refetch: refetchExpiring
    } = useGetExpiringSoonQuery({ days: 15 }, {
        skip: activeView !== 'expiring-soon'
    });

    const {
        data: advancedSearchData,
        isLoading: isAdvancedSearchLoading,
        refetch: refetchAdvancedSearch
    } = useAdvancedTaskSearchQuery(
        {
            q: advancedSearch.query,
            type: advancedSearch.type,
            page: serverFilters.page,
            limit: serverFilters.limit
        },
        {
            skip: !advancedSearch.enabled || !advancedSearch.query || !canAdvancedSearch
        }
    );

    const filterActiveTasks = (taskList) => {
        if (!Array.isArray(taskList)) return [];
        return taskList.filter(task => !EXCLUDED_STATUSES.includes(task.status));
    };

    const applyPriorityFilter = (taskList) => {
        if (!filters.priority) return taskList;
        return taskList.filter(task => task.priority === filters.priority);
    };

    const getCurrentData = () => {
        if (advancedSearch.enabled && advancedSearchData) {
            const filteredResults = filterActiveTasks(advancedSearchData?.results || []);
            const priorityFiltered = applyPriorityFilter(filteredResults);
            return {
                tasks: priorityFiltered,
                totalBeforeClientFilter: filteredResults.length,
                pagination: advancedSearchData?.pagination || null,
                isLoading: isAdvancedSearchLoading
            };
        }

        switch (activeView) {
            case 'approved-not-published':
                const approvedTasks = filterActiveTasks(approvedNotPublishedData?.tasks || approvedNotPublishedData || []);
                const approvedFiltered = applyPriorityFilter(approvedTasks);
                return {
                    tasks: approvedFiltered,
                    totalBeforeClientFilter: approvedTasks.length,
                    pagination: {
                        page: 1,
                        totalCount: approvedFiltered.length,
                        totalPages: 1,
                        hasNext: false,
                        hasPrev: false
                    },
                    isLoading: isLoadingApproved
                };
            case 'expiring-soon':
                const expiringTasks = filterActiveTasks(expiringSoonData?.tasks || expiringSoonData?.data || []);
                const expiringFiltered = applyPriorityFilter(expiringTasks);
                return {
                    tasks: expiringFiltered,
                    totalBeforeClientFilter: expiringTasks.length,
                    pagination: {
                        page: 1,
                        totalCount: expiringFiltered.length,
                        totalPages: 1,
                        hasNext: false,
                        hasPrev: false
                    },
                    isLoading: isLoadingExpiring
                };
            default:
                const allTasks = tasksData?.tasks || [];
                const priorityFiltered = applyPriorityFilter(allTasks);
                return {
                    tasks: priorityFiltered,
                    totalBeforeClientFilter: allTasks.length,
                    pagination: tasksData?.pagination || null,
                    isLoading: isLoading
                };
        }
    };

    const { tasks, totalBeforeClientFilter, pagination, isLoading: currentLoading } = getCurrentData();

    useEffect(() => {
        const handleFocus = () => {
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

        document.addEventListener('visibilitychange', handleFocus);
        return () => document.removeEventListener('visibilitychange', handleFocus);
    }, [activeView, refetch, refetchApproved, refetchExpiring]);

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({
            ...prev,
            [field]: value,
            ...(field !== 'page' && field !== 'limit' ? { page: 1 } : {})
        }));
    };

    const handleAdvancedSearch = () => {
        if (advancedSearch.query.trim()) {
            setAdvancedSearch(prev => ({ ...prev, enabled: true }));
            setFilters(prev => ({ ...prev, page: 1 }));
        }
    };

    const clearAdvancedSearch = () => {
        setAdvancedSearch({ enabled: false, query: '', type: 'all' });
        setFilters(prev => ({ ...prev, page: 1 }));
    };

    const handleReset = () => {
        setFilters({
            taskType: '',
            status: '',
            priority: '',
            createdBy: '',
            assignedTo: '',
            dateFrom: '',
            dateTo: '',
            searchQuery: '',
            page: 1,
            limit: 10
        });
        clearAdvancedSearch();
    };

    const handlePageChange = (newPage) => {
        setFilters(prev => ({ ...prev, page: newPage }));
        if (tableRef.current) {
            tableRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'OPEN': return 'table-status-indicator offline';
            case 'PRODUCT_REVIEW': return 'table-status-indicator busy';
            case 'COMPLIANCE_REVIEW': return 'table-status-indicator busy';
            case 'APPROVED': return 'table-status-indicator online';
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
            <div className="flex-between items-center mb-6">
                <div>
                    <h1 className="text-heading-2">Tasks Overview</h1>
                    <p className="text-caption mt-2">
                        {advancedSearch.enabled && (
                            <span className="ml-2 text-green-600">• Advanced search active</span>
                        )}
                    </p>
                </div>
            </div>

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
                            </select>
                        </div>

                        <div>
                            <label className="info-label">
                                Priority
                            </label>
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
                                value={filters.createdBy}
                                onChange={(e) => handleFilterChange('createdBy', e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="info-label">Assigned To</label>
                            <input
                                type="text"
                                className="input"
                                placeholder="Search assignee"
                                value={filters.assignedTo}
                                onChange={(e) => handleFilterChange('assignedTo', e.target.value)}
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
                                value={filters.searchQuery}
                                onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex justify-between items-center  pt-4 border-t border-gray-100">
                        <div></div>
                        <div className="flex gap-3">
                            <button
                                className="btn btn-secondary"
                                onClick={handleReset} 
                            >
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Reset
                            </button>
                            {/*<button
                                className="btn btn-primary"
                            >
                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
                                </svg>
                                Apply Filters
                            </button>*/}
                        </div>
                    </div>
                </div>
            </div>

            <div className="table-container" ref={tableRef}>
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
                        {tasks.length > 0 ? tasks.map((task) => (
                            <tr key={task.id} className="group">
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
                                            {filters.priority ?
                                                `No tasks found with priority: ${filters.priority}` :
                                                activeView === 'all' ?
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

                <div className="card-footer">
                    <div className="flex-between">
                        <div className="text-sm text-gray-600">
                            Showing {tasks.length} of {pagination?.totalCount || 0} tasks
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
                                    Page {pagination?.page || 1} of {pagination?.totalPages || 1}
                                </span>
                                <button
                                    className="btn btn-secondary btn-sm"
                                    disabled={!pagination?.hasPrev}
                                    onClick={() => handlePageChange(1)}
                                >
                                    ⟨⟨
                                </button>
                                <button
                                    className="btn btn-secondary btn-sm"
                                    disabled={!pagination?.hasPrev}
                                    onClick={() => handlePageChange(filters.page - 1)}
                                >
                                    ⟨
                                </button>
                                <button
                                    className="btn btn-secondary btn-sm"
                                    disabled={!pagination?.hasNext}
                                    onClick={() => handlePageChange(filters.page + 1)}
                                >
                                    ⟩
                                </button>
                                <button
                                    className="btn btn-secondary btn-sm"
                                    disabled={!pagination?.hasNext}
                                    onClick={() => handlePageChange(pagination?.totalPages || 1)}
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
}