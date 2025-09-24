// src/components/AllTasks/BulkOperationsModal.jsx
import React, { useState, useEffect } from 'react';
import { useGetAssignmentOptionsQuery } from '../../redux/api/tasksApi';

const BulkOperationsModal = ({ 
  operationType, 
  selectedTasks, 
  onClose, 
  onExecute, 
  isLoading 
}) => {
  const [operationData, setOperationData] = useState({
    status: '',
    assignType: 'COMPLIANCE',
    userId: '',
    reason: '',
    priority: '',
    notes: ''
  });
  const [error, setError] = useState('');

  // Get assignment options for bulk assignment
  const {
    data: assignmentOptions,
    isLoading: isLoadingOptions
  } = useGetAssignmentOptionsQuery(
    { id: selectedTasks[0], type: operationData.assignType },
    { skip: operationType !== 'bulk_assignment' || selectedTasks.length === 0 }
  );

  // Reset form when operation type changes
  useEffect(() => {
    setOperationData({
      status: '',
      assignType: 'COMPLIANCE',
      userId: '',
      reason: '',
      priority: '',
      notes: ''
    });
    setError('');
  }, [operationType]);

  const handleInputChange = (field, value) => {
    setOperationData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleExecute = async () => {
    // Validation based on operation type
    if (operationType === 'bulk_status_update' && !operationData.status) {
      setError('Please select a status to update');
      return;
    }

    if (operationType === 'bulk_assignment' && !operationData.userId) {
      setError('Please select a user to assign tasks to');
      return;
    }

    if (operationType === 'bulk_delete' && !operationData.reason) {
      setError('Please provide a reason for bulk deletion');
      return;
    }

    try {
      await onExecute(operationType, operationData);
    } catch (err) {
      setError(err.message || 'Operation failed. Please try again.');
    }
  };

  const handleClose = () => {
    setOperationData({
      status: '',
      assignType: 'COMPLIANCE',
      userId: '',
      reason: '',
      priority: '',
      notes: ''
    });
    setError('');
    onClose();
  };

  const getOperationTitle = () => {
    switch (operationType) {
      case 'bulk_status_update':
        return 'Bulk Status Update';
      case 'bulk_assignment':
        return 'Bulk Task Assignment';
      case 'bulk_delete':
        return 'Bulk Task Deletion';
      default:
        return 'Bulk Operation';
    }
  };

  const getOperationDescription = () => {
    switch (operationType) {
      case 'bulk_status_update':
        return `Update the status of ${selectedTasks.length} selected tasks simultaneously.`;
      case 'bulk_assignment':
        return `Reassign ${selectedTasks.length} selected tasks to a new team member.`;
      case 'bulk_delete':
        return `Delete ${selectedTasks.length} selected tasks permanently.`;
      default:
        return `Perform operation on ${selectedTasks.length} selected tasks.`;
    }
  };

  const renderOperationFields = () => {
    switch (operationType) {
      case 'bulk_status_update':
        return (
          <>
            <div className="mb-4">
              <label className="info-label">New Status</label>
              <select
                value={operationData.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                className="select"
                disabled={isLoading}
              >
                <option value="">Select new status...</option>
                <option value="OPEN">Open</option>
                <option value="PRODUCT_REVIEW">Product Review</option>
                <option value="COMPLIANCE_REVIEW">Compliance Review</option>
                <option value="APPROVED">Approved</option>
                <option value="PUBLISHED">Published</option>
                <option value="CLOSED_INTERNAL">Closed (Internal)</option>
                <option value="CLOSED_EXCHANGE">Closed (Exchange)</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="info-label">Priority (Optional)</label>
              <select
                value={operationData.priority}
                onChange={(e) => handleInputChange('priority', e.target.value)}
                className="select"
                disabled={isLoading}
              >
                <option value="">Keep current priority</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
          </>
        );

      case 'bulk_assignment':
        return (
          <>
            <div className="mb-4">
              <label className="info-label">Assignment Type</label>
              <select
                value={operationData.assignType}
                onChange={(e) => handleInputChange('assignType', e.target.value)}
                className="select"
                disabled={isLoading}
              >
                <option value="COMPLIANCE">Compliance Team</option>
                <option value="PRODUCT">Product Team</option>
              </select>
            </div>

            <div className="mb-4">
              <label className="info-label">
                Assign to {operationData.assignType === 'COMPLIANCE' ? 'Compliance Officer' : 'Product User'}
              </label>
              {isLoadingOptions ? (
                <div className="flex items-center py-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                  <span className="text-sm text-gray-600">Loading users...</span>
                </div>
              ) : (
                <select
                  value={operationData.userId}
                  onChange={(e) => handleInputChange('userId', e.target.value)}
                  className="select"
                  disabled={isLoading}
                >
                  <option value="">Select a user...</option>
                  {assignmentOptions?.users?.map((user) => (
                    <option key={user.id || user._id} value={user.id || user._id}>
                      {user.fullName || user.name}
                      {user.workload && ` - ${user.workload} active tasks`}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </>
        );

      case 'bulk_delete':
        return (
          <div className="mb-4">
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
              <div className="flex">
                <svg className="w-5 h-5 text-red-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <h4 className="text-sm font-medium text-red-800">Warning</h4>
                  <p className="text-sm text-red-700">
                    This action cannot be undone. All selected tasks will be permanently deleted.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      {/* Modal Overlay */}
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
          <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={handleClose}></div>

          {/* Modal Content */}
          <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
            
            {/* Header */}
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {getOperationTitle()}
                </h3>
                <button
                  onClick={handleClose}
                  className="text-gray-400 hover:text-gray-600"
                  disabled={isLoading}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <p className="text-sm text-gray-600 mb-4">
                {getOperationDescription()}
              </p>

              {/* Selected Tasks Summary */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">
                    Selected Tasks
                  </span>
                  <span className="text-sm text-gray-600">
                    {selectedTasks.length} task{selectedTasks.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              {/* Operation-specific fields */}
              {renderOperationFields()}

              {/* Reason/Notes field (common for all operations) */}
              <div className="mb-4">
                <label className="info-label">
                  {operationType === 'bulk_delete' ? 'Reason for Deletion *' : 'Notes (Optional)'}
                </label>
                <textarea
                  value={operationType === 'bulk_delete' ? operationData.reason : operationData.notes}
                  onChange={(e) => handleInputChange(
                    operationType === 'bulk_delete' ? 'reason' : 'notes', 
                    e.target.value
                  )}
                  placeholder={
                    operationType === 'bulk_delete' 
                      ? 'Explain why these tasks are being deleted...'
                      : 'Add any additional notes about this bulk operation...'
                  }
                  className="input"
                  rows={3}
                  disabled={isLoading}
                />
              </div>

              {/* Error Display */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Operation Summary */}
              {(operationData.status || operationData.userId) && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">Operation Summary</h4>
                  <div className="text-sm text-blue-800">
                    <p><strong>Tasks:</strong> {selectedTasks.length} selected</p>
                    {operationData.status && <p><strong>New Status:</strong> {operationData.status.replace('_', ' ')}</p>}
                    {operationData.userId && assignmentOptions?.users && (
                      <p><strong>Assignee:</strong> {
                        assignmentOptions.users.find(u => (u.id || u._id) === operationData.userId)?.fullName || 
                        'Selected user'
                      }</p>
                    )}
                    {operationData.priority && <p><strong>Priority:</strong> {operationData.priority}</p>}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                onClick={handleExecute}
                disabled={isLoading || (
                  (operationType === 'bulk_status_update' && !operationData.status) ||
                  (operationType === 'bulk_assignment' && !operationData.userId) ||
                  (operationType === 'bulk_delete' && !operationData.reason)
                )}
                className={`btn ${operationType === 'bulk_delete' ? 'btn-error' : 'btn-primary'} sm:ml-3 sm:w-auto w-full`}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    {operationType === 'bulk_status_update' && 'Update Status'}
                    {operationType === 'bulk_assignment' && 'Reassign Tasks'}
                    {operationType === 'bulk_delete' && 'Delete Tasks'}
                    {!['bulk_status_update', 'bulk_assignment', 'bulk_delete'].includes(operationType) && 'Execute'}
                  </>
                )}
              </button>
              <button
                onClick={handleClose}
                disabled={isLoading}
                className="btn btn-secondary mt-3 sm:mt-0 sm:mr-3 sm:w-auto w-full"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default BulkOperationsModal;