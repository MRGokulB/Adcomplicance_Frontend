import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectUserRole } from '../../redux/slices/authSlice';
import { useGetTaskByIdQuery } from '../../redux/api/tasksApi';
import { hasPermission, PERMISSIONS } from '../../utils/roles';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';

const TaskDetailPanel = ({ taskId, onClose }) => {
    const navigate = useNavigate();
    const userRole = useSelector(selectUserRole);
    const [activeTab, setActiveTab] = useState('overview');

    const {
        data: task,
        isLoading,
        error
    } = useGetTaskByIdQuery(taskId, {
        skip: !taskId
    });

    if (!taskId) return null;

    if (isLoading) {
        return (
            <div className="task-detail-panel">
                <div className="task-detail-loading">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-sm text-gray-600 mt-2">Loading task details...</p>
                </div>
            </div>
        );
    }

    if (error || !task) {
        return (
            <div className="task-detail-panel">
                <div className="task-detail-error">
                    <div className="text-red-600 mb-4">
                        <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to load task</h3>
                    <p className="text-sm text-gray-600">Task details could not be retrieved.</p>
                </div>
            </div>
        );
    }

    const canEditTask = hasPermission(userRole, PERMISSIONS.TASK_UPDATE_OWN) ||
        hasPermission(userRole, PERMISSIONS.TASK_UPDATE_ALL);

    const formatDate = (dateString) => {
        if (!dateString) return 'Not set';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'OPEN': return 'report-status-pill draft';
            case 'PRODUCT_REVIEW': return 'report-status-pill pending';
            case 'COMPLIANCE_REVIEW': return 'report-status-pill pending';
            case 'APPROVED': return 'report-status-pill approved';
            case 'PUBLISHED': return 'report-status-pill published';
            case 'CLOSED_INTERNAL':
            case 'CLOSED_EXCHANGE':
                return 'report-status-pill rejected';
            default: return 'report-status-pill draft';
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority?.toLowerCase()) {
            case 'high': return 'text-red-600 bg-red-50';
            case 'medium': return 'text-yellow-600 bg-yellow-50';
            case 'low': return 'text-green-600 bg-green-50';
            default: return 'text-gray-600 bg-gray-50';
        }
    };

    const renderOverviewTab = () => (
        <div className="task-detail-content">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="task-detail-section">
                    <h4 className="task-detail-section-title">Basic Information</h4>
                    <div className="space-y-3">
                        <div className="info-row">
                            <span className="info-label">UIN:</span>
                            <span className="info-value font-mono">{task.uin || 'Not assigned'}</span>
                        </div>
                        <div className="info-row">
                            <span className="info-label">Title:</span>
                            <span className="info-value font-medium">{task.title}</span>
                        </div>
                        <div className="info-row">
                            <span className="info-label">Status:</span>
                            <span className={`${getStatusBadge(task.status)}`}>
                                {task.status?.replace('_', ' ')}
                            </span>
                        </div>
                        <div className="info-row">
                            <span className="info-label">Task Type:</span>
                            <span className="info-value">
                                <span className={`badge ${task.taskType === 'EXCHANGE' ? 'badge-warning' : 'badge-info'}`}>
                                    {task.taskType === 'EXCHANGE' ? 'Exchange' : 'Internal'}
                                </span>
                            </span>
                        </div>
                        {task.priority && (
                            <div className="info-row">
                                <span className="info-label">Priority:</span>
                                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                                    {task.priority}
                                </span>
                            </div>
                        )}
                        {task.platform && (
                            <div className="info-row">
                                <span className="info-label">Platform:</span>
                                <span className="info-value">{task.platform}</span>
                            </div>
                        )}
                        {task.category && (
                            <div className="info-row">
                                <span className="info-label">Category:</span>
                                <span className="info-value">{task.category}</span>
                            </div>
                        )}
                        {task.description && (
                            <div className="info-row flex-col items-start">
                                <span className="info-label mb-2">Description:</span>
                                <div className="info-value w-full bg-gray-50 rounded-lg p-3">
                                    <div className="prose prose-sm max-w-none">
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            rehypePlugins={[rehypeRaw, rehypeSanitize]}
                                            components={{
                                                a: ({ node, ...props }) => (
                                                    <a
                                                        {...props}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-600 hover:text-blue-800 underline"
                                                    />
                                                ),
                                                p: ({ node, ...props }) => (
                                                    <p {...props} className="mb-2 last:mb-0 text-sm text-gray-700" />
                                                ),
                                                ul: ({ node, ...props }) => (
                                                    <ul {...props} className="list-disc list-inside mb-2 text-sm" />
                                                ),
                                                ol: ({ node, ...props }) => (
                                                    <ol {...props} className="list-decimal list-inside mb-2 text-sm" />
                                                ),
                                            }}
                                        >
                                            {task.description}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div className="info-row">
                            <span className="info-label">Created:</span>
                            <span className="info-value">{formatDate(task.createdAt)}</span>
                        </div>
                        <div className="info-row">
                            <span className="info-label">Last Updated:</span>
                            <span className="info-value">{formatDate(task.updatedAt)}</span>
                        </div>

                    </div>
                </div>

                <div className="task-detail-section">
                    <h4 className="task-detail-section-title">Assignment Details</h4>
                    <div className="space-y-3">
                        <div className="info-row">
                            <span className="info-label">Created By:</span>
                            <div className="flex items-center gap-2">
                                <div className="card-avatar-sm">
                                    {task.createdBy?.fullName?.split(' ').map(n => n[0]).join('') || 'U'}
                                </div>
                                <span className="info-value">{task.createdBy?.fullName || 'Unknown'}</span>
                            </div>
                        </div>
                        {task.assignedProducts && task.assignedProducts.length > 0 && (
                            <div className="info-row">
                                <span className="info-label">Product Team:</span>
                                <div className="space-y-1">
                                    {task.assignedProducts.map((product, index) => (
                                        <div key={index} className="flex items-center gap-2">
                                            <div className="card-avatar-sm">
                                                {product.fullName?.split(' ').map(n => n[0]).join('') || 'P'}
                                            </div>
                                            <span className="info-value">{product.fullName}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {task.assignedCompliance && (
                            <div className="info-row">
                                <span className="info-label">Compliance:</span>
                                <div className="flex items-center gap-2">
                                    <div className="card-avatar-sm">
                                        {task.assignedCompliance.fullName?.split(' ').map(n => n[0]).join('') || 'C'}
                                    </div>
                                    <span className="info-value">{task.assignedCompliance.fullName}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>



            {(task.approvalDate || task.publishDate || task.expiryDate) && (
                <div className="task-detail-section mt-6">
                    <h4 className="task-detail-section-title">Timeline</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {task.approvalDate && (
                            <div className="info-row">
                                <span className="info-label">Approved:</span>
                                <span className="info-value text-green-600 font-medium">{formatDate(task.approvalDate)}</span>                            </div>
                        )}
                        {task.publishDate && (
                            <div className="info-row">
                                <span className="info-label">Published:</span>
                                <span className="info-value text-blue-600 font-medium">{formatDate(task.publishDate)}</span>                            </div>
                        )}
                        {task.expiryDate && (
                            <div className="info-row">
                                <span className="info-label">Expires:</span>
                                <span className="info-value text-red-600 font-medium">{formatDate(task.expiryDate)}</span>                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
    return (
        <div className="task-detail-panel">
            <div className="task-detail-header">
                <div className="task-detail-header-left">
                    <h3 className="task-detail-title">Task Details</h3>
                    <p className="task-detail-subtitle">{task.title}</p>
                </div>
                <div className="task-detail-header-right">
                    <button
                        className="btn btn-outline btn-sm"
                        onClick={() => navigate(`/tasks/${taskId}`)}
                    >
                        Open Full View
                    </button>
                    <button
                        className="btn btn-ghost btn-icon-sm"
                        onClick={onClose}
                        title="Close details"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>

            <div className="task-detail-tabs">
                <button
                    className={`task-detail-tab ${activeTab === 'overview' ? 'active' : ''}`}
                    onClick={() => setActiveTab('overview')}
                >
                    Overview
                </button>
                 
            </div>

            <div className="task-detail-body">
                {activeTab === 'overview' && renderOverviewTab()}
                 
            </div>
        </div>
    );
};

export default TaskDetailPanel;