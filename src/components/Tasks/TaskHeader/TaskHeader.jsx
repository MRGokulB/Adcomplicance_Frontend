// src/components/Tasks/TaskHeader/TaskHeader.jsx - Enhanced with task name editing
import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { selectUserRole, selectCurrentUser } from '../../../redux/slices/authSlice';
import {
  useUpdateTaskStatusMutation,
  useClassifyTaskMutation,
  useReassignTaskMutation,
  useFollowUpTaskMutation,
  useAddCommentMutation,
  useApproveTaskMutation,
  usePublishTaskMutation,
  useCloseTaskMutation,
  useUpdateTaskNameMutation
} from '../../../redux/api/tasksApi';
import { usePermissions } from '../../../components/PermissionWrapper';
import { CanReassignTask } from '../../../components/PermissionWrapper';
// ADDED: Import enhanced permission helpers
import {
  USER_ROLES,
  canClassifyOrReclassifyTask,
  canCloseSpecificTask,
  getClassificationActions,
  getClosureActions
} from '../../../utils/roles';
import TaskReassignmentModal from '../../AllTasks/TaskReassignmentModal';

const TaskHeader = ({ task, refetch, comment, setComment, onRefresh }) => {
  const userRole = useSelector(selectUserRole);
  const currentUser = useSelector(selectCurrentUser);
  const permissions = usePermissions();

  // Local state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(task?.title || '');
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [showCommentsSidebar, setShowCommentsSidebar] = useState(false);
  const [showReassignment, setShowReassignment] = useState(false);
  const [selectedTaskType, setSelectedTaskType] = useState(task?.taskType || '');
  const [showClassificationSubmit, setShowClassificationSubmit] = useState(false);
  const [followUpMessage, setFollowUpMessage] = useState('');

  // Status-specific modals
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showClosureModal, setShowClosureModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedNewStatus, setSelectedNewStatus] = useState('');
  const [statusReason, setStatusReason] = useState('');
  const [closureType, setClosureType] = useState('');

  // Form data for status-specific actions
  const [formData, setFormData] = useState({
    approvalDate: new Date().toISOString().split('T')[0],
    expiryDate: '',
    approvalProofUrl: '',
    publishDate: new Date().toISOString().split('T')[0],
    publishedCopyUrl: '',
    closureComments: ''
  });

  // API mutations
  const [updateTaskStatus, { isLoading: isUpdatingStatus }] = useUpdateTaskStatusMutation();
  const [classifyTask, { isLoading: isClassifying }] = useClassifyTaskMutation();
  const [followUpTask, { isLoading: isFollowingUp }] = useFollowUpTaskMutation();
  const [addComment, { isLoading: isAddingComment }] = useAddCommentMutation();
  const [approveTask, { isLoading: isApproving }] = useApproveTaskMutation();
  const [publishTask, { isLoading: isPublishing }] = usePublishTaskMutation();
  const [closeTask, { isLoading: isClosing }] = useCloseTaskMutation();
  const [updateTaskName, { isLoading: isUpdatingName }] = useUpdateTaskNameMutation();
  useEffect(() => {
    if (task) {
      setSelectedTaskType(task.taskType || '');
      setShowClassificationSubmit(false);
    }
  }, [task?.taskType, task?.id]);

  // ADDED: Helper function to get correct CSS class for buttons
  const getButtonClass = (buttonType) => {
    const buttonClasses = {
      'primary': 'btn-primary',
      'secondary': 'btn-secondary',
      'success': 'btn-success',
      'warning': 'btn-warning',
      'error': 'btn-error',
      'outline': 'btn-outline',
      'ghost': 'btn-ghost',
      'info': 'btn-primary' // fallback to primary for info
    };
    return buttonClasses[buttonType] || 'btn-secondary';
  };

  // Check if user can act on this specific task
  const canUserActOnThisTask = () => {
    if (!task || !currentUser) return false

    if (permissions.isAdmin) return true

    // ENHANCED: Compliance users with more permissions when assigned
    if (permissions.isComplianceUser) {
      return task.assignedComplianceId === currentUser.id ||
        task.assignedCompliance?.id === currentUser.id
    }

    if (permissions.isProductUser) {
      return task.createdBy === currentUser.id ||
        task.assignedProductIds?.includes(currentUser.id) ||
        (task.assignedProducts && task.assignedProducts.some(user =>
          typeof user === 'object' ? user.id === currentUser.id : false
        ))
    }

    return false
  }

  // UPDATED: Enhanced classification check using new helper function
  const canUserClassifyThisTask = () => {
  if (!currentUser) return false
  
  // FIXED: COMPLIANCE_ADMIN and ADMIN can classify/reclassify any task
  if ([USER_ROLES.COMPLIANCE_ADMIN, USER_ROLES.ADMIN].includes(userRole)) {
    return canClassifyOrReclassifyTask(userRole, task, currentUser.id)
  }
  
  // For other roles, check both classification permission AND task access
  return canClassifyOrReclassifyTask(userRole, task, currentUser.id) && canUserActOnThisTask()
}
  const canUserEditTask = () => {
    if (!permissions.isComplianceUser && !permissions.isAdmin) return false;
    if (permissions.isAdmin) return true;
    return task?.assignedComplianceId === currentUser?.id;
  };
  const handleTaskTypeSelection = (taskType) => {
    setSelectedTaskType(taskType);
    // Show submit button only if different from current task type
    setShowClassificationSubmit(taskType && taskType !== task.taskType);
  };
  // ADDED: Get classification actions for better UI feedback
  const classificationActions = task && currentUser ? getClassificationActions(userRole, task, currentUser.id) : { canClassify: false, canReclassify: false };
  const closureActions = task && currentUser ? getClosureActions(userRole, task, currentUser.id) : { canClose: false, reason: '' };

  // Get workflow buttons based on current status and permissions
  const getWorkflowButtons = () => {
    const buttons = [];
    const canAct = canUserActOnThisTask();

    if (!canAct) return buttons;

    // Classification required first
    if (!task.taskType && task.status === 'OPEN') {
      return [{
        type: 'warning',
        text: 'Classification Required',
        disabled: true,
        message: 'Task must be classified before status actions are available'
      }];
    }

    // ADDED: Submit button for classified tasks in OPEN status
    if (task.taskType && task.status === 'OPEN') {
      buttons.push({
        type: 'primary',
        text: 'Submit for Review',
        action: () => handleQuickStatusChange('COMPLIANCE_REVIEW'),
        disabled: isUpdatingStatus
      });
    }

    // Status-specific workflow buttons
    switch (task.status) {
      case 'COMPLIANCE_REVIEW':
        if (permissions.isComplianceUser && canAct) {
          buttons.push({
            type: 'success',
            text: 'Approve Task',
            action: () => setShowApprovalModal(true),
            disabled: isApproving
          });
          buttons.push({
            type: 'warning',
            text: 'Request Changes',
            action: () => handleQuickStatusChange('PRODUCT_REVIEW'),
            disabled: isUpdatingStatus
          });
        }
        break;

      case 'PRODUCT_REVIEW':
        if (permissions.isProductUser && canAct) {
          buttons.push({
            type: 'primary',
            text: 'Submit for Review',
            action: () => handleQuickStatusChange('COMPLIANCE_REVIEW'),
            disabled: isUpdatingStatus
          });
        }
        break;

      case 'APPROVED':
        if (permissions.isProductUser && canAct) {
          buttons.push({
            type: 'success',
            text: 'Publish Task',
            action: () => setShowPublishModal(true),
            disabled: isPublishing
          });
        }
        break;

      case 'PUBLISHED':
        buttons.push({
          type: 'success',
          text: 'Published Successfully',
          disabled: true
        });
        break;

      default:
        if (task.status?.includes('CLOSED')) {
          buttons.push({
            type: 'secondary',
            text: 'Task Closed',
            disabled: true
          });
        }
    }

    // Admin manual override option
    if (permissions.isAdmin && !task.status?.includes('CLOSED')) {
      buttons.push({
        type: 'outline',
        text: 'Manual Status Change',
        action: () => setShowStatusModal(true)
      });
    }

    return buttons;
  };

  // Get status badge styling
  const getStatusBadgeClass = (status) => {
    const statusStyles = {
      'OPEN': 'bg-blue-100 text-blue-800',
      'COMPLIANCE_REVIEW': 'bg-yellow-100 text-yellow-800',
      'PRODUCT_REVIEW': 'bg-orange-100 text-orange-800',
      'APPROVED': 'bg-green-100 text-green-800',
      'PUBLISHED': 'bg-purple-100 text-purple-800',
      'CLOSED_INTERNAL': 'bg-gray-100 text-gray-800',
      'CLOSED_EXCHANGE': 'bg-red-100 text-red-800',
      'EXPIRED': 'bg-red-100 text-red-800'
    };
    return statusStyles[status] || 'bg-gray-100 text-gray-800';
  };


  // HANDLERS
  const handleSubmitClassification = async () => {
    if (!selectedTaskType || selectedTaskType === task.taskType) return;

    try {
      await classifyTask({
        id: task.id,
        taskType: selectedTaskType
      }).unwrap();
      setShowClassificationSubmit(false);
    } catch (error) {
      console.error('Failed to classify task:', error);
      alert(error?.data?.message || 'Failed to classify task');
      // Reset on error
      setSelectedTaskType(task.taskType || '');
      setShowClassificationSubmit(false);
    }
  };

  const handleCancelClassification = () => {
    setSelectedTaskType(task.taskType || '');
    setShowClassificationSubmit(false);
  };
  const handleQuickStatusChange = async (newStatus) => {
    const defaultReasons = {
      'COMPLIANCE_REVIEW': 'Task ready for compliance review',
      'PRODUCT_REVIEW': 'Changes requested by compliance team',
      'APPROVED': 'Task approved by compliance',
      'PUBLISHED': 'Task published successfully'
    };
    try {
      await updateTaskStatus({
        id: task.id,
        status: newStatus,
        reason: defaultReasons[newStatus] || `Status changed to ${newStatus}`
      }).unwrap();
      //onRefresh?.();
      // refetch?.();
    } catch (error) {
      console.error('Failed to update status:', error);
      alert(error?.data?.message || 'Failed to update status');
    }
  };

  const handleTaskTypeChange = async (newTaskType) => {
    if (!canUserClassifyThisTask()) return;

    try {
      await classifyTask({
        id: task.id,
        taskType: newTaskType
      }).unwrap();
      //onRefresh?.();
    } catch (error) {
      console.error('Failed to classify task:', error);
      alert(error?.data?.message || 'Failed to classify task');
    }
  };

  // NEW: Handle task name update
  const handleTaskNameUpdate = async () => {
    if (!editedTitle.trim() || editedTitle.trim() === task.title) {
      setIsEditingTitle(false);
      setEditedTitle(task.title);
      return;
    }

    try {
      await updateTaskName({
        id: task.id,
        title: editedTitle.trim()
      }).unwrap();

      setIsEditingTitle(false);
      onRefresh?.();
    } catch (error) {
      console.error('Failed to update task name:', error);
      alert(error?.data?.message || 'Failed to update task name');
      setEditedTitle(task.title); // Reset to original title on error
    }
  };

  // NEW: Handle edit cancellation
  const handleCancelEdit = () => {
    setEditedTitle(task.title);
    setIsEditingTitle(false);
  };

  const handleApprovalSubmit = async () => {
    if (!formData.approvalDate || !formData.expiryDate) {
      alert('Approval date and expiry date are required');
      return;
    }

    try {
      await approveTask({
        id: task.id,
        approvalDate: formData.approvalDate,
        expiryDate: formData.expiryDate,
        approvalProofUrl: formData.approvalProofUrl
      }).unwrap();

      setShowApprovalModal(false);
      //onRefresh?.();
    } catch (error) {
      console.error('Failed to approve task:', error);
      alert(error?.data?.message || 'Failed to approve task');
    }
  };

  const handlePublishSubmit = async () => {
    if (!formData.publishDate || !formData.publishedCopyUrl) {
      alert('Publish date and published copy URL are required');
      return;
    }

    try {
      await publishTask({
        id: task.id,
        publishDate: formData.publishDate,
        publishedCopyUrl: formData.publishedCopyUrl
      }).unwrap();

      setShowPublishModal(false);
      onRefresh?.();
    } catch (error) {
      console.error('Failed to publish task:', error);
      alert(error?.data?.message || 'Failed to publish task');
    }
  };

  const handleManualStatusChange = async () => {
    if (!selectedNewStatus || !statusReason.trim()) {
      alert('Please select a status and provide a reason');
      return;
    }

    try {
      await updateTaskStatus({
        id: task.id,
        status: selectedNewStatus,
        reason: statusReason
      }).unwrap();

      setShowStatusModal(false);
      setSelectedNewStatus('');
      setStatusReason('');
      onRefresh?.();
    } catch (error) {
      console.error('Failed to update status:', error);
      alert(error?.data?.message || 'Failed to update status');
    }
  };

  const handleClosureSubmit = async () => {
    if (!formData.closureComments.trim()) {
      alert('Closure comments are required');
      return;
    }

    try {
      await closeTask({
        id: task.id,
        closureType: closureType,
        closureComments: formData.closureComments
      }).unwrap();

      setShowClosureModal(false);
      onRefresh?.();
    } catch (error) {
      console.error('Failed to close task:', error);
      alert(error?.data?.message || 'Failed to close task');
    }
  };

  const handleFollowUp = async () => {
    try {
      await followUpTask({
        id: task.id,
        message: followUpMessage || 'Follow-up initiated from task header',
        urgency: 'MEDIUM'
      }).unwrap();

      setShowFollowUp(false);
      setFollowUpMessage('');
      onRefresh?.();
    } catch (error) {
      console.error('Failed to follow up:', error);
      alert(error?.data?.message || 'Failed to send follow-up');
    }
  };

  const handleAddComment = async () => {
    if (!comment.trim()) return;

    try {
      await addComment({
        id: task.id,
        content: comment,
        isGlobal: true
      }).unwrap();

      setComment('');
      onRefresh?.();
    } catch (error) {
      console.error('Failed to add comment:', error);
      alert(error?.data?.message || 'Failed to add comment');
    }
  };

  if (!task) return null;

  const workflowButtons = getWorkflowButtons();

  return (
    <div className="info-section">
      <div className="info-card bg-gray-50">
        <div className="flex-between items-start info-card-header">
          <div className="flex-1">
            {/* UIN and Title */}
            <div className="mb-4">
              <div className="flex items-center gap-4 mb-2">
                <span className="text-sm font-medium text-gray-600">UIN:</span>
                <span className="text-sm font-semibold text-gray-900 bg-gray-100 px-2 py-1 rounded">
                  {task.uin || task.id}
                </span>
              </div>

              <div className="flex items-center gap-3">
                {isEditingTitle && (permissions.isComplianceUser || permissions.isAdmin) ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input
                      type="text"
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      className="input flex-1"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleTaskNameUpdate();
                        if (e.key === 'Escape') handleCancelEdit();
                      }}
                      autoFocus
                      disabled={isUpdatingName}
                    />
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={handleTaskNameUpdate}
                      disabled={isUpdatingName || !editedTitle.trim()}
                    >
                      {isUpdatingName ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={handleCancelEdit}
                      disabled={isUpdatingName}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <h1 className="text-xl font-semibold text-gray-900">{task.title}</h1>
                    {(permissions.isComplianceUser || permissions.isAdmin) && (
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          setEditedTitle(task.title);
                          setIsEditingTitle(true);
                        }}
                        title="Edit task title"
                        disabled={isUpdatingName}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Task Type and Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">

              {/* Enhanced Classification Section */}
              <div>
                <label className="exchange-form-label">Task Type</label>
                {canUserClassifyThisTask() ? (
                  <div className="space-y-2">
                    <select
                      className="exchange-form-select"
                      value={selectedTaskType}
                      onChange={(e) => handleTaskTypeSelection(e.target.value)}
                      disabled={isClassifying}
                    >
                      <option value="">Select Type...</option>
                      <option value="INTERNAL">Internal</option>
                      <option value="EXCHANGE">Exchange</option>
                    </select>

                    {/* Submit Classification Button */}
                    {showClassificationSubmit && (
                      <div className="flex gap-2">
                        <button
                          className="btn btn-primary btn-sm flex-1"
                          onClick={handleSubmitClassification}
                          disabled={isClassifying}
                        >
                          {isClassifying ? 'Submitting...' : `Submit as ${selectedTaskType === 'INTERNAL' ? 'Internal' : 'Exchange'}`}
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={handleCancelClassification}
                          disabled={isClassifying}
                        >
                          Cancel
                        </button>
                      </div>
                    )}

                    {/* Show current classification if exists and no pending changes */}
                    {task.taskType && !showClassificationSubmit && (
                      <div className="text-sm text-green-600 mt-1">
                        ✓ Currently classified as: {task.taskType === 'EXCHANGE' ? 'Exchange' : 'Internal'} 
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="exchange-form-select bg-gray-100 cursor-not-allowed flex items-center">
                    <span className={task.taskType ? 'text-gray-900' : 'text-gray-500'}>
                      {task.taskType ? (task.taskType === 'EXCHANGE' ? 'Exchange' : 'Internal') : 'Awaiting Classification'}
                    </span>
                  </div>
                )}

                {/* UPDATED: Better user feedback for classification permissions */}
                {!canUserClassifyThisTask() && !task.taskType && (
                  <p className="text-xs text-amber-600 mt-1">
                    {permissions.isComplianceUser
                      ? 'You can only classify tasks assigned to you'
                      : 'Only assigned compliance users can classify this task'}
                  </p>
                )}
              </div>

              <div>
                <label className="exchange-form-label">Status & Actions</label>

                <div className="mb-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadgeClass(task.status)}`}>
                    {task.status?.replace('_', ' ')}
                  </span>
                </div>

                {/* Workflow Buttons */}
                <div className="space-y-2">
                  {workflowButtons.map((button, index) => (
                    <button
                      key={index}
                      className={`btn ${getButtonClass(button.type)} btn-sm w-full`}
                      onClick={button.action}
                      disabled={button.disabled}
                      title={button.message}
                    >
                      {button.text}
                    </button>
                  ))}

                  {/* UPDATED: Enhanced closure options with better permission checking */}
                  {closureActions.canClose && !task.status?.includes('CLOSED') && task.status !== 'PUBLISHED' && (
                    <details className="mt-2">
                      <summary className="text-sm text-red-600 cursor-pointer">
                        Close Task ({closureActions.reason})
                      </summary>
                      <div className="flex gap-2 mt-2">
                        <button
                          className="btn btn-error btn-sm flex-1"
                          onClick={() => { setClosureType('CLOSED_INTERNAL'); setShowClosureModal(true); }}
                          disabled={isClosing}
                        >
                          Close Internal
                        </button>
                        <button
                          className="btn btn-error btn-sm flex-1"
                          onClick={() => { setClosureType('CLOSED_EXCHANGE'); setShowClosureModal(true); }}
                          disabled={isClosing}
                        >
                          Close Exchange
                        </button>
                      </div>
                    </details>
                  )}

                  {/* Fallback: Admin closure options (keep existing logic for backwards compatibility) */}
                  {!closureActions.canClose && permissions.isAdmin && !task.status?.includes('CLOSED') && task.status !== 'PUBLISHED' && (
                    <details className="mt-2">
                      <summary className="text-sm text-red-600 cursor-pointer">Admin: Close Task</summary>
                      <div className="flex gap-2 mt-2">
                        <button
                          className="btn btn-error btn-sm flex-1"
                          onClick={() => { setClosureType('CLOSED_INTERNAL'); setShowClosureModal(true); }}
                          disabled={isClosing}
                        >
                          Close Internal
                        </button>
                        <button
                          className="btn btn-error btn-sm flex-1"
                          onClick={() => { setClosureType('CLOSED_EXCHANGE'); setShowClosureModal(true); }}
                          disabled={isClosing}
                        >
                          Close Exchange
                        </button>
                      </div>
                    </details>
                  )}
                </div>
              </div>
            </div>

            {/* Task Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 mb-2">
              <div>
                <label className="exchange-form-label">Platform</label>
                <div className="bg-gray-50 rounded-lg ">
                  <span className="text-sm text-gray-700">
                    {task.platform || 'Not specified'}
                  </span>
                </div>
              </div>

              <div>
                <label className="exchange-form-label">Category</label>
                <div className="bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-700">
                    {task.category || 'Not specified'}
                  </span>
                </div>
              </div>
            </div>

            {/* Description */}
            {task.description && (
              <div className="mb-4">
                <label className="exchange-form-label">Description</label>
                <div className="bg-gray-50 rounded-lg ">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {task.description}
                  </p>
                </div>
              </div>
            )}

            {/* Assignments */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="exchange-form-label">Assigned Product Users</label>
                <div className="bg-gray-50 rounded-lg p-3">
                  {task.assignedProducts && task.assignedProducts.length > 0 ? (
                    task.assignedProducts.map((user, index) => (
                      <div key={index} className="flex items-center gap-2 mb-2 last:mb-0">
                        <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                        <span className="text-sm text-gray-700">
                          {typeof user === 'string' ? user : user.fullName || user.name}
                        </span>
                      </div>
                    ))
                  ) : (
                    <span className="text-sm text-gray-500">No assignments</span>
                  )}
                </div>
              </div>

              <div>
                <label className="exchange-form-label">Assigned Compliance User</label>
                <div className="bg-gray-50 rounded-lg p-3">
                  {task.assignedCompliance ? (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <span className="text-sm text-gray-700">
                        {typeof task.assignedCompliance === 'string'
                          ? task.assignedCompliance
                          : task.assignedCompliance.fullName || task.assignedCompliance.name}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm text-gray-500">Not assigned</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 ml-4">
            {(permissions.isComplianceUser || permissions.isAdmin || permissions.isSeniorManager) && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setShowFollowUp(true)}
                disabled={isFollowingUp}
              >
                Follow-Up
              </button>
            )}

            <CanReassignTask>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setShowReassignment(true)}
              >
                Reassign
              </button>
            </CanReassignTask>

            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setShowCommentsSidebar(!showCommentsSidebar)}
            >
              Comments
            </button>
          </div>
        </div>
      </div>

      {/* ALL EXISTING MODALS REMAIN THE SAME - No changes needed */}
      {/* Approval Modal */}
      {showApprovalModal && (
        <div className="modal-overlay" onClick={() => setShowApprovalModal(false)}>
          <div className="modal max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="text-lg font-semibold text-gray-900">Approve Task</h3>
              <button onClick={() => setShowApprovalModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="exchange-form-label">Approval Date *</label>
                  <input
                    type="date"
                    className="input"
                    value={formData.approvalDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, approvalDate: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="exchange-form-label">Expiry Date *</label>
                  <input
                    type="date"
                    className="input"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, expiryDate: e.target.value }))}
                    required
                  />
                </div>

              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowApprovalModal(false)}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={handleApprovalSubmit}
                disabled={isApproving || !formData.approvalDate || !formData.expiryDate}
              >
                {isApproving ? 'Approving...' : 'Approve Task'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Publish Modal */}
      {showPublishModal && (
        <div className="modal-overlay" onClick={() => setShowPublishModal(false)}>
          <div className="modal max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="text-lg font-semibold text-gray-900">Publish Task</h3>
              <button onClick={() => setShowPublishModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="exchange-form-label">Publish Date *</label>
                  <input
                    type="date"
                    className="input"
                    value={formData.publishDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, publishDate: e.target.value }))}
                    required
                  />
                  <label className="exchange-form-label">Published Copy URL *</label>
                  <input
                    type="url"
                    className="input"
                    value={formData.publishedCopyUrl}
                    onChange={(e) => setFormData(prev => ({...prev, publishedCopyUrl: e.target.value}))}
                    placeholder="https://..."
                    required
                  />
                </div>

              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowPublishModal(false)}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={handlePublishSubmit}
                disabled={isPublishing || !formData.publishDate}
              >
                {isPublishing ? 'Publishing...' : 'Publish Task'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Status Change Modal (Admin) */}
      {showStatusModal && (
        <div className="modal-overlay" onClick={() => setShowStatusModal(false)}>
          <div className="modal max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="text-lg font-semibold text-gray-900">Manual Status Change</h3>
              <button onClick={() => setShowStatusModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="space-y-4">
                <div>
                  <label className="exchange-form-label">Current Status</label>
                  <div className="p-2 bg-gray-100 rounded">{task.status?.replace('_', ' ')}</div>
                </div>
                <div>
                  <label className="exchange-form-label">New Status *</label>
                  <select
                    className="input"
                    value={selectedNewStatus}
                    onChange={(e) => setSelectedNewStatus(e.target.value)}
                  >
                    <option value="">Select status...</option>
                    <option value="OPEN">Open</option>
                    <option value="COMPLIANCE_REVIEW">Compliance Review</option>
                    <option value="PRODUCT_REVIEW">Product Review</option>
                    <option value="APPROVED">Approved</option>
                    <option value="PUBLISHED">Published</option>
                  </select>
                </div>
                <div>
                  <label className="exchange-form-label">Reason *</label>
                  <textarea
                    className="input resize-none min-h-[100px]"
                    value={statusReason}
                    onChange={(e) => setStatusReason(e.target.value)}
                    placeholder="Explain the reason for this status change..."
                    required
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowStatusModal(false)}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={handleManualStatusChange}
                disabled={isUpdatingStatus || !selectedNewStatus || !statusReason.trim()}
              >
                {isUpdatingStatus ? 'Updating...' : 'Update Status'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Closure Modal */}
      {showClosureModal && (
  <div className="modal-overlay" onClick={() => setShowClosureModal(false)}>
    <div className="modal max-w-lg" onClick={(e) => e.stopPropagation()}>
      <div className="modal-header">
        <h3 className="text-lg font-semibold text-gray-900">
          {closureType === 'CLOSED_INTERNAL' ? 'Close Internal Task' : 'Close Exchange Task'}
        </h3>
        <button onClick={() => setShowClosureModal(false)}>×</button>
      </div>
      <div className="modal-body">
        <div className="mb-4">
          <p className="text-sm text-gray-600">
            Closing task as: <strong>
              {closureType === 'CLOSED_INTERNAL' ? 'Internal Closure' : 'Exchange Closure'}
            </strong>
          </p>
          {closureType === 'CLOSED_INTERNAL' && (
            <p className="text-xs text-gray-500 mt-1">
              This will mark the task as resolved internally without exchange submission.
            </p>
          )}
          {closureType === 'CLOSED_EXCHANGE' && (
            <p className="text-xs text-gray-500 mt-1">
              This will mark the task as closed due to exchange-related issues.
            </p>
          )}
        </div>
        <div>
          <label className="exchange-form-label">Closure Comments *</label>
          <textarea
            className="input resize-none min-h-[100px]"
            placeholder={
              closureType === 'CLOSED_INTERNAL' 
                ? "Explain why this task is being resolved internally..."
                : "Explain the exchange-related reason for closure..."
            }
            value={formData.closureComments}
            onChange={(e) => setFormData(prev => ({ ...prev, closureComments: e.target.value }))}
            required
          />
        </div>
      </div>
      <div className="modal-footer">
        <button className="btn btn-secondary" onClick={() => setShowClosureModal(false)}>
          Cancel
        </button>
        <button
          className="btn btn-error"
          onClick={handleClosureSubmit}
          disabled={isClosing || !formData.closureComments.trim()}
        >
          {isClosing ? 'Closing...' : 
            (closureType === 'CLOSED_INTERNAL' ? 'Close Internal' : 'Close Exchange')
          }
        </button>
      </div>
    </div>
  </div>
)}

      {/* Follow-Up Modal */}
      {showFollowUp && (
        <div className="modal-overlay" onClick={() => setShowFollowUp(false)}>
          <div className="modal max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="text-lg font-semibold text-gray-900">Follow-Up Task</h3>
              <button onClick={() => setShowFollowUp(false)}>×</button>
            </div>
            <div className="modal-body">
              <p className="text-gray-700 mb-4">Send a follow-up reminder for this task?</p>
              <textarea
                className="input resize-none min-h-[100px]"
                placeholder="Add follow-up message (optional)..."
                value={followUpMessage}
                onChange={(e) => setFollowUpMessage(e.target.value)}
              />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowFollowUp(false)}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={handleFollowUp}
                disabled={isFollowingUp}
              >
                {isFollowingUp ? 'Sending...' : 'Send Follow-Up'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comments Sidebar */}
      {showCommentsSidebar && (
  <>
    {/* Overlay for mobile */}
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
      onClick={() => setShowCommentsSidebar(false)}
    />
    
    {/* Comments Sidebar */}
    <div className="fixed inset-y-0 right-0 w-full sm:w-96 lg:w-80 bg-white border-l border-gray-200 shadow-lg z-50 flex flex-col">
      
      {/* Fixed Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white flex-shrink-0">
        <h3 className="text-lg font-semibold text-gray-900">Comments</h3>
        <button 
          onClick={() => setShowCommentsSidebar(false)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          aria-label="Close comments"
        >
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      {/* Scrollable Comments Area */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {task.comments && task.comments.length > 0 ? (
            task.comments.map((comment, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-3 break-words">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-sm font-medium text-gray-900 break-words">
                    {comment.author?.fullName || comment.createdBy?.fullName || comment.createdBy || 'User'}
                  </span>
                  <span className="text-xs text-gray-500 whitespace-nowrap flex-shrink-0">
                    {new Date(comment.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-gray-700 break-words leading-relaxed">{comment.content}</p>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-sm text-gray-500 mb-2">No comments yet</p>
              <p className="text-xs text-gray-400">Be the first to add a comment below</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Fixed Input Area */}
      <div className="border-t border-gray-200 p-4 bg-white flex-shrink-0">
        <div className="space-y-3">
          <textarea
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            rows={3}
            placeholder="Add a comment..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={500}
          />
          
          {/* Character count and actions */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">
              {comment.length}/500 characters
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setComment('')}
                className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800 transition-colors duration-200"
                disabled={!comment.trim()}
              >
                Clear
              </button>
              <button
                type="button"
                className="px-4 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                onClick={handleAddComment}
                disabled={isAddingComment || !comment.trim()}
              >
                {isAddingComment ? (
                  <div className="flex items-center gap-2">
                    <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Adding...
                  </div>
                ) : (
                  'Add Comment'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </>
)}

      {/* Task Reassignment Modal */}
      {showReassignment && (
        <TaskReassignmentModal
          taskId={task.id}
          onClose={() => setShowReassignment(false)}
          onSuccess={() => {
            setShowReassignment(false);
            onRefresh?.();
          }}
        />
      )}
    </div>
  );
};

export default TaskHeader;