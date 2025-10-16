import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { selectUserRole, selectCurrentUser } from '../../../redux/slices/authSlice';
import {
  useUpdateTaskStatusMutation,
  useClassifyTaskMutation,
  useFollowUpTaskMutation,
  useAddCommentMutation,
  useApproveTaskMutation,
  usePublishTaskMutation,
  useCloseTaskMutation,
  useUpdateTaskNameMutation
} from '../../../redux/api/tasksApi';
import { usePermissions } from '../../../components/PermissionWrapper';
import { CanReassignTask } from '../../../components/PermissionWrapper';
import { useUploadFilesMutation } from '../../../redux/api/uploadApi';
import {
  USER_ROLES,
  canClassifyOrReclassifyTask,
  getClassificationActions,
  getClosureActions
} from '../../../utils/roles';
import TaskReassignmentModal from '../../AllTasks/TaskReassignmentModal';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';

const TaskHeader = ({ task, refetch, comment, setComment, onRefresh }) => {
  const userRole = useSelector(selectUserRole);
  const currentUser = useSelector(selectCurrentUser);
  const permissions = usePermissions();

  const [modals, setModals] = useState({
    followUp: false,
    comments: false,
    reassignment: false,
    approval: false,
    publish: false,
    closure: false,
    status: false
  });

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(task?.title || '');
  const [selectedTaskType, setSelectedTaskType] = useState(task?.taskType || '');
  const [showClassificationSubmit, setShowClassificationSubmit] = useState(false);
  const [followUpMessage, setFollowUpMessage] = useState('');
  const [selectedNewStatus, setSelectedNewStatus] = useState('');
  const [statusReason, setStatusReason] = useState('');
  const [closureType, setClosureType] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
const [uploadStatus, setUploadStatus] = useState('');

  const [formData, setFormData] = useState({
    approvalDate: new Date().toISOString().split('T')[0],
    expiryDate: '',
    approvalProofUrl: '',
    publishDate: new Date().toISOString().split('T')[0],
    publishedCopyUrl: '',
    publishedFilesRaw: [],
    closureComments: ''
  });

  const [updateTaskStatus, { isLoading: isUpdatingStatus }] = useUpdateTaskStatusMutation();
  const [classifyTask, { isLoading: isClassifying }] = useClassifyTaskMutation();
  const [followUpTask, { isLoading: isFollowingUp }] = useFollowUpTaskMutation();
  const [addComment, { isLoading: isAddingComment }] = useAddCommentMutation();
  const [approveTask, { isLoading: isApproving }] = useApproveTaskMutation();
  const [publishTask, { isLoading: isPublishing }] = usePublishTaskMutation();
  const [closeTask, { isLoading: isClosing }] = useCloseTaskMutation();
  const [updateTaskName, { isLoading: isUpdatingName }] = useUpdateTaskNameMutation();
  const [uploadFiles, { isLoading: isUploadingPublishFiles }] = useUploadFilesMutation();

  useEffect(() => {
    if (task) {
      setSelectedTaskType(task.taskType || '');
      setShowClassificationSubmit(false);
      setEditedTitle(task.title || '');
    }
  }, [task?.taskType, task?.id, task?.title]);

  const getButtonClass = useCallback((buttonType) => {
    const buttonClasses = {
      'primary': 'btn-primary',
      'secondary': 'btn-secondary',
      'success': 'btn-success',
      'warning': 'btn-warning',
      'error': 'btn-error',
      'outline': 'btn-outline',
      'ghost': 'btn-ghost',
      'info': 'btn-primary'
    };
    return buttonClasses[buttonType] || 'btn-secondary';
  }, []);

  const getStatusBadgeClass = useCallback((status) => {
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
  }, []);

  const getFileTypeIcon = useCallback((fileName) => {
    const extension = fileName?.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return (
          <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M4 18h12V6l-4-4H4v16zm8-14v4h4l-4-4z" />
          </svg>
        );
      case 'doc':
      case 'docx':
        return (
          <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
            <path d="M4 2h8l4 4v10a2 2 0 01-2 2H4a2 2 0 01-2-2V4a2 2 0 012-2zm2 3v2h8V5H6zm0 4v2h8V9H6zm0 4v2h5v-2H6z" />
          </svg>
        );
      case 'xls':
      case 'xlsx':
      case 'csv':
        return (
          <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path d="M4 2h12a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V4a2 2 0 012-2zm1 3v2h2V5H5zm4 0v2h2V5H9zm4 0v2h2V5h-2zM5 9v2h2V9H5zm4 0v2h2V9H9zm4 0v2h2V9h-2zM5 13v2h2v-2H5zm4 0v2h2v-2H9zm4 0v2h2v-2h-2z" />
          </svg>
        );
      case 'ppt':
      case 'pptx':
        return (
          <svg className="w-4 h-4 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M4 2h12a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V4a2 2 0 012-2zm2 3v10h8V5H6zm2 2h4v2H8V7zm0 3h4v2H8v-2z" />
          </svg>
        );
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'bmp':
      case 'svg':
        return (
          <svg className="w-4 h-4 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" />
          </svg>
        );
      case 'mp4':
      case 'avi':
      case 'mov':
      case 'webm':
      case 'mkv':
        return (
          <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 6a2 2 0 012-2h6l2 2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM8 9a1 1 0 100-2 1 1 0 000 2z" />
          </svg>
        );
      case 'txt':
        return (
          <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
            <path d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm1 3h10v2H5V7zm0 4h10v2H5v-2z" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4z" />
          </svg>
        );
    }
  }, []);

  const handleViewFile = useCallback((fileUrl, fileName = '') => {
    const extension = fileName ?
      fileName.split('.').pop().toLowerCase() :
      fileUrl.split('.').pop().toLowerCase();

    if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(extension)) {
      const viewerUrl = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(fileUrl)}`;
      const viewerWindow = window.open(viewerUrl, '_blank');

      if (!viewerWindow) {
        alert('Popup blocked. Please allow popups to view Office files or use the download button.');
        window.location.href = fileUrl;
      }
    }
    else if (['pdf', 'jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg'].includes(extension)) {
      window.open(fileUrl, '_blank');
    }
    else if (['mp4', 'avi', 'mov', 'webm', 'mkv'].includes(extension)) {
      window.open(fileUrl, '_blank');
    }
    else {
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = fileName || fileUrl.split('/').pop();
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }, []);

  const canUserActOnThisTask = useMemo(() => {
    if (!task || !currentUser) return false;
    if (permissions.isAdmin) return true;

    if (permissions.isComplianceUser) {
      return task.assignedComplianceId === currentUser.id ||
        task.assignedCompliance?.id === currentUser.id;
    }

    if (permissions.isProductUser) {
      return task.createdBy === currentUser.id ||
        task.assignedProductIds?.includes(currentUser.id) ||
        (task.assignedProducts && task.assignedProducts.some(user =>
          typeof user === 'object' ? user.id === currentUser.id : false
        ));
    }

    return false;
  }, [task, currentUser, permissions.isAdmin, permissions.isComplianceUser, permissions.isProductUser]);

  const canUserClassifyThisTask = useMemo(() => {
    if (!currentUser) return false;
    
    if ([USER_ROLES.COMPLIANCE_ADMIN, USER_ROLES.ADMIN].includes(userRole)) {
      return canClassifyOrReclassifyTask(userRole, task, currentUser.id);
    }
    
    return canClassifyOrReclassifyTask(userRole, task, currentUser.id) && canUserActOnThisTask;
  }, [userRole, task, currentUser, canUserActOnThisTask]);

  const classificationActions = useMemo(() => 
    task && currentUser ? getClassificationActions(userRole, task, currentUser.id) : { canClassify: false, canReclassify: false },
    [userRole, task, currentUser]
  );

  const closureActions = useMemo(() => 
    task && currentUser ? getClosureActions(userRole, task, currentUser.id) : { canClose: false, reason: '' },
    [userRole, task, currentUser]
  );

  const workflowButtons = useMemo(() => {
    const buttons = [];
    const canAct = canUserActOnThisTask;

    if (!canAct || !task) return buttons;

    if (!task.taskType && task.status === 'OPEN') {
      return [{
        type: 'warning',
        text: 'Classification Required',
        disabled: true,
        message: 'Task must be classified before status actions are available'
      }];
    }

    if (task.taskType && task.status === 'OPEN') {
      buttons.push({
        type: 'primary',
        text: 'Submit for Review',
        action: () => handleQuickStatusChange('COMPLIANCE_REVIEW'),
        disabled: isUpdatingStatus
      });
    }

    switch (task.status) {
      case 'COMPLIANCE_REVIEW':
        if (permissions.isComplianceUser && canAct) {
          buttons.push({
            type: 'success',
            text: 'Approve Task',
            action: () => toggleModal('approval', true),
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
            action: () => toggleModal('publish', true),
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

    if (permissions.isAdmin && !task.status?.includes('CLOSED')) {
      buttons.push({
        type: 'outline',
        text: 'Manual Status Change',
        action: () => toggleModal('status', true)
      });
    }

    return buttons;
  }, [canUserActOnThisTask, task, isUpdatingStatus, isApproving, isPublishing, permissions.isComplianceUser, permissions.isProductUser, permissions.isAdmin]);

   const toggleModal = useCallback((modalName, value) => {
    setModals(prev => ({ ...prev, [modalName]: value }));
  }, []);

   const handleTaskTypeSelection = useCallback((taskType) => {
    setSelectedTaskType(taskType);
    setShowClassificationSubmit(taskType && taskType !== task?.taskType);
  }, [task?.taskType]);

  const handleSubmitClassification = useCallback(async () => {
    if (!selectedTaskType || selectedTaskType === task?.taskType) return;

    try {
      await classifyTask({
        id: task.id,
        taskType: selectedTaskType
      }).unwrap();
      setShowClassificationSubmit(false);
    } catch (error) {
      console.error('Failed to classify task:', error);
      alert(error?.data?.message || 'Failed to classify task');
      setSelectedTaskType(task?.taskType || '');
      setShowClassificationSubmit(false);
    }
  }, [selectedTaskType, task?.taskType, task?.id, classifyTask]);

  const handleCancelClassification = useCallback(() => {
    setSelectedTaskType(task?.taskType || '');
    setShowClassificationSubmit(false);
  }, [task?.taskType]);

  const handleQuickStatusChange = useCallback(async (newStatus) => {
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
    } catch (error) {
      console.error('Failed to update status:', error);
      alert(error?.data?.message || 'Failed to update status');
    }
  }, [task?.id, updateTaskStatus]);

  const handleTaskNameUpdate = useCallback(async () => {
    if (!editedTitle.trim() || editedTitle.trim() === task?.title) {
      setIsEditingTitle(false);
      setEditedTitle(task?.title || '');
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
      setEditedTitle(task?.title || '');
    }
  }, [editedTitle, task?.title, task?.id, updateTaskName, onRefresh]);

  const handleCancelEdit = useCallback(() => {
    setEditedTitle(task?.title || '');
    setIsEditingTitle(false);
  }, [task?.title]);

  const handleApprovalSubmit = useCallback(async () => {
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

      toggleModal('approval', false);
    } catch (error) {
      console.error('Failed to approve task:', error);
      alert(error?.data?.message || 'Failed to approve task');
    }
  }, [formData, task?.id, approveTask, toggleModal]);

 const handlePublishSubmit = useCallback(async () => {
  if (!formData.publishDate || !formData.publishedCopyUrl) {
    alert('Publish date and published copy URL are required');
    return;
  }

  try {
    let publishedFilesUrls = [];

    if (formData.publishedFilesRaw && formData.publishedFilesRaw.length > 0) {
      setUploadStatus('uploading');
      setUploadProgress(10);

      const filesFormData = new FormData();
      formData.publishedFilesRaw.forEach((file) => {
        filesFormData.append('files', file);
      });

      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev < 70) return prev + 5;
          return prev;
        });
      }, 500);

      const uploadResult = await uploadFiles(filesFormData).unwrap();
      
      clearInterval(progressInterval);
      setUploadProgress(90);
      
      publishedFilesUrls = uploadResult.files?.map(f => f.url) || [];

      setUploadProgress(100);
      setTimeout(() => {
        setUploadStatus('');
        setUploadProgress(0);
      }, 500);
    }

    await publishTask({
      id: task.id,
      publishDate: formData.publishDate,
      publishedCopyUrl: formData.publishedCopyUrl,
      publishedFiles: publishedFilesUrls
    }).unwrap();

    toggleModal('publish', false);
    setFormData(prev => ({ ...prev, publishedFilesRaw: [] }));
    onRefresh?.();
  } catch (error) {
    console.error('Failed to publish task:', error);
    setUploadStatus('');
    setUploadProgress(0);
    alert(error?.data?.message || 'Failed to publish task');
  }
}, [formData, task?.id, publishTask, toggleModal, onRefresh, uploadFiles]);
  const handleManualStatusChange = useCallback(async () => {
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

      toggleModal('status', false);
      setSelectedNewStatus('');
      setStatusReason('');
      onRefresh?.();
    } catch (error) {
      console.error('Failed to update status:', error);
      alert(error?.data?.message || 'Failed to update status');
    }
  }, [selectedNewStatus, statusReason, task?.id, updateTaskStatus, toggleModal, onRefresh]);

  const handleClosureSubmit = useCallback(async () => {
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

      toggleModal('closure', false);
      onRefresh?.();
    } catch (error) {
      console.error('Failed to close task:', error);
      alert(error?.data?.message || 'Failed to close task');
    }
  }, [formData.closureComments, task?.id, closureType, closeTask, toggleModal, onRefresh]);

  const handleFollowUp = useCallback(async () => {
    try {
      await followUpTask({
        id: task.id,
        message: followUpMessage || 'Follow-up initiated from task header',
        urgency: 'MEDIUM'
      }).unwrap();

      toggleModal('followUp', false);
      setFollowUpMessage('');
      onRefresh?.();
    } catch (error) {
      console.error('Failed to follow up:', error);
      alert(error?.data?.message || 'Failed to send follow-up');
    }
  }, [task?.id, followUpMessage, followUpTask, toggleModal, onRefresh]);

  const handleAddComment = useCallback(async () => {
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
  }, [comment, task?.id, addComment, setComment, onRefresh]);

  if (!task) return null;

  return (
    <div className="info-section">
      <div className="info-card bg-gray-50">
        <div className="flex-between items-start info-card-header">
          <div className="flex-1">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="exchange-form-label">Task Type</label>
                {canUserClassifyThisTask ? (
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

                {!canUserClassifyThisTask && !task.taskType && (
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

                  {closureActions.canClose && !task.status?.includes('CLOSED') && task.status !== 'PUBLISHED' && (
  <details className="mt-2">
    <summary className="text-sm text-red-600 cursor-pointer">
      Close Task ({closureActions.reason})
    </summary>
    <div className="flex gap-2 mt-2">
      {task.taskType === 'INTERNAL' && (
        <button
          className="btn btn-error btn-sm flex-1"
          onClick={() => { setClosureType('CLOSED_INTERNAL'); toggleModal('closure', true); }}
          disabled={isClosing}
        >
          Close Internal
        </button>
      )}
      {task.taskType === 'EXCHANGE' && (
        <button
          className="btn btn-error btn-sm flex-1"
          onClick={() => { setClosureType('CLOSED_EXCHANGE'); toggleModal('closure', true); }}
          disabled={isClosing}
        >
          Close Exchange
        </button>
      )}
    </div>
  </details>
)}

                  {!closureActions.canClose && permissions.isAdmin && !task.status?.includes('CLOSED') && task.status !== 'PUBLISHED' && (
  <details className="mt-2">
    <summary className="text-sm text-red-600 cursor-pointer">Admin: Close Task</summary>
    <div className="flex gap-2 mt-2">
      {task.taskType === 'INTERNAL' && (
        <button
          className="btn btn-error btn-sm flex-1"
          onClick={() => { setClosureType('CLOSED_INTERNAL'); toggleModal('closure', true); }}
          disabled={isClosing}
        >
          Close Internal
        </button>
      )}
      {task.taskType === 'EXCHANGE' && (
        <button
          className="btn btn-error btn-sm flex-1"
          onClick={() => { setClosureType('CLOSED_EXCHANGE'); toggleModal('closure', true); }}
          disabled={isClosing}
        >
          Close Exchange
        </button>
      )}
    </div>
  </details>
)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2  mb-2">
              <div>
                <label className="exchange-form-label">Platform</label>
                <div className="bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-700">
                    {task.platform || 'Not specified'}
                  </span>
                </div>
              </div>

              <div className="ml-2">
                <label className="exchange-form-label ">Category</label>
                <div className="bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-700">
                    {task.category || 'Not specified'}
                  </span>
                </div>
              </div>
            </div>

            {task.description && (
  <div className="mb-4">
    <label className="exchange-form-label">Description</label>
    <div className="bg-gray-50 rounded-lg p-3"> 
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

{task.status === 'PUBLISHED' && (task.publishedCopyUrl || (task.publishedFiles && task.publishedFiles.length > 0)) && (
  <div className="mb-4">
    <label className="exchange-form-label">Published Materials</label>
    <div className="bg-green-50 rounded-lg p-3 border border-green-200">
      
      {task.publishedCopyUrl && (
        <div className="mb-2">
          <div className="text-sm font-medium text-green-800 mb-1">Published Copy URL:</div>
          <a 
            href={task.publishedCopyUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline text-sm break-all"
          >
            {task.publishedCopyUrl}
          </a>
        </div>
      )}
      
      {task.publishedFiles && task.publishedFiles.length > 0 && (
        <div>
          <div className="text-sm font-medium text-green-800 mb-2">
            Published Files ({task.publishedFiles.length}):
          </div>
          <div className="space-y-1">
            {task.publishedFiles.map((fileUrl, index) => {
              const fileName = fileUrl.split('/').pop();
              return (
                <div key={index} className="flex items-center justify-between bg-white rounded p-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {getFileTypeIcon(fileName)}
                    <span className="text-sm text-gray-700 truncate">{fileName}</span>
                  </div>
                  <div className="flex gap-1 ml-2 flex-shrink-0">
                    <button
                      onClick={() => handleViewFile(fileUrl, fileName)}
                      className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                      title="View file"
                    >
                      View
                    </button>
                    <a
                      href={fileUrl}
                      download={fileName}
                      className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200"
                      title="Download file"
                    >
                      Download
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  </div>
)}

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

          <div className="flex flex-col gap-2 ml-4">
            {(permissions.isComplianceUser || permissions.isAdmin || permissions.isSeniorManager) && (
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => toggleModal('followUp', true)}
                disabled={isFollowingUp}
              >
                Follow-Up
              </button>
            )}

            <CanReassignTask>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => toggleModal('reassignment', true)}
              >
                Reassign
              </button>
            </CanReassignTask>

            <button
              className="btn btn-ghost btn-sm"
              onClick={() => toggleModal('comments', !modals.comments)}
            >
              Comments
            </button>
          </div>
        </div>
      </div>

      {modals.approval && (
        <div className="modal-overlay" onClick={() => toggleModal('approval', false)}>
          <div className="modal max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="text-lg font-semibold text-gray-900">Approve Task</h3>
              <button onClick={() => toggleModal('approval', false)}>×</button>
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
              <button className="btn btn-secondary" onClick={() => toggleModal('approval', false)}>Cancel</button>
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

      {modals.publish && (
  <div className="modal-overlay" onClick={() => toggleModal('publish', false)}>
    <div className="modal max-w-lg" onClick={(e) => e.stopPropagation()}>
      <div className="modal-header">
        <h3 className="text-lg font-semibold text-gray-900">Publish Task</h3>
        <button onClick={() => toggleModal('publish', false)}>×</button>
      </div>
      <div className="modal-body">
        <div className="relative">
          {uploadStatus && (
            <div className="absolute inset-0 bg-white bg-opacity-98 flex flex-col items-center justify-center z-20 rounded-lg">
              <div className="relative mb-4">
                <svg className="w-16 h-16 animate-spin text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-blue-600">{uploadProgress}%</span>
                </div>
              </div>
              
              <div className="text-center max-w-sm px-4">
                <p className="text-lg font-semibold text-gray-800 mb-2">Uploading Files</p>
                <p className="text-sm text-gray-600 mb-3">
                  This may take a few minutes for large files. Please do not close this window.
                </p>
                
                <div className="w-64 bg-gray-200 rounded-full h-2.5 overflow-hidden shadow-inner">
                  <div 
                    className="bg-gradient-to-r from-blue-400 to-blue-600 h-2.5 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                
                {formData.publishedFilesRaw && formData.publishedFilesRaw.length > 0 && (
                  <div className="mt-3 text-xs text-gray-500">
                    <p>Uploading {formData.publishedFilesRaw.length} file{formData.publishedFilesRaw.length !== 1 ? 's' : ''}</p>
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center gap-2 text-blue-600">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          )}
          
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
            </div>
            <div>
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
            <div>
  <label className="exchange-form-label">
    Published Files (Optional)
    <span className="text-xs text-gray-500 ml-2">Max 5 files</span>
  </label>
  <input
    type="file"
    className="input"
    multiple
    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.bmp,.svg,.mp3,.mp4,.avi,image/*,video/*,.mov,.webm,.mkv,.csv,.txt,.eml,.msg,.excel,.csv"
    onChange={(e) => setFormData(prev => ({
      ...prev,
      publishedFilesRaw: Array.from(e.target.files)
    }))}
    disabled={isPublishing || isUploadingPublishFiles}
  />
  {formData.publishedFilesRaw && formData.publishedFilesRaw.length > 0 && (
    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
      <div className="text-sm text-gray-600 mb-2">
        {formData.publishedFilesRaw.length} file(s) selected:
      </div>
      <div className="space-y-2 max-h-32 overflow-y-auto">
        {formData.publishedFilesRaw.map((file, index) => (
          <div key={index} className="flex items-center gap-2 text-xs bg-white p-2 rounded border">
            <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900 truncate">{file.name}</div>
              <div className="text-gray-500">
                {(file.size / 1024 / 1024).toFixed(2)} MB • {file.type || 'Unknown type'}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                const newFiles = formData.publishedFilesRaw.filter((_, i) => i !== index);
                setFormData(prev => ({ ...prev, publishedFilesRaw: newFiles }));
              }}
              className="text-red-500 hover:text-red-700 p-1"
              disabled={isPublishing || isUploadingPublishFiles}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  )}
</div>
          </div>
        </div>
      </div>
      <div className="modal-footer">
        <button className="btn btn-secondary" onClick={() => toggleModal('publish', false)}>Cancel</button>
        <button
          className="btn btn-primary"
          onClick={handlePublishSubmit}
          disabled={isPublishing || isUploadingPublishFiles || !formData.publishDate || !formData.publishedCopyUrl}
        >
          {isPublishing ? 'Publishing...' : 'Publish Task'}
        </button>
      </div>
    </div>
  </div>
)}

      {modals.status && (
        <div className="modal-overlay" onClick={() => toggleModal('status', false)}>
          <div className="modal max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="text-lg font-semibold text-gray-900">Manual Status Change</h3>
              <button onClick={() => toggleModal('status', false)}>×</button>
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
              <button className="btn btn-secondary" onClick={() => toggleModal('status', false)}>Cancel</button>
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

      {modals.closure && (
        <div className="modal-overlay" onClick={() => toggleModal('closure', false)}>
          <div className="modal max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="text-lg font-semibold text-gray-900">
                {closureType === 'CLOSED_INTERNAL' ? 'Close Internal Task' : 'Close Exchange Task'}
              </h3>
              <button onClick={() => toggleModal('closure', false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  Closing task as: <strong>
                    {closureType === 'CLOSED_INTERNAL' ? 'Internal Closure' : 'Exchange Closure'}
                  </strong>
                </p>
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
              <button className="btn btn-secondary" onClick={() => toggleModal('closure', false)}>Cancel</button>
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

      {modals.followUp && (
        <div className="modal-overlay" onClick={() => toggleModal('followUp', false)}>
          <div className="modal max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="text-lg font-semibold text-gray-900">Follow-Up Task</h3>
              <button onClick={() => toggleModal('followUp', false)}>×</button>
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
              <button className="btn btn-secondary" onClick={() => toggleModal('followUp', false)}>Cancel</button>
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

      {modals.comments && (
        <>
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => toggleModal('comments', false)}
          />
          
          <div className="fixed inset-y-0 right-0 w-full sm:w-96 lg:w-80 bg-white border-l border-gray-200 shadow-lg z-50 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white flex-shrink-0">
              <h3 className="text-lg font-semibold text-gray-900">Comments</h3>
              <button 
                onClick={() => toggleModal('comments', false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
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
                    <p className="text-sm text-gray-500">No comments yet</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="border-t border-gray-200 p-4 bg-white flex-shrink-0">
              <div className="space-y-3">
                <textarea
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Add a comment..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  maxLength={500}
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">{comment.length}/500</span>
                  <button
                    className="px-4 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    onClick={handleAddComment}
                    disabled={isAddingComment || !comment.trim()}
                  >
                    {isAddingComment ? 'Adding...' : 'Add Comment'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {modals.reassignment && (
        <TaskReassignmentModal
          taskId={task.id}
          onClose={() => toggleModal('reassignment', false)}
          onSuccess={() => {
            toggleModal('reassignment', false);
            onRefresh?.();
          }}
        />
      )}
    </div>
  );
};

export default TaskHeader;