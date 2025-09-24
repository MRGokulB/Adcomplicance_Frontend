// src/components/AllTasks/TaskReassignmentModal.jsx
import React, { useState, useEffect } from 'react';
import { 
  useReassignTaskMutation, 
  useGetAssignmentOptionsQuery 
} from '../../redux/api/tasksApi';

const TaskReassignmentModal = ({ taskId, onClose, onSuccess }) => {
  const [assignmentData, setAssignmentData] = useState({
    assignType: 'COMPLIANCE', // 'COMPLIANCE' or 'PRODUCT'
    userId: '',
    reason: ''
  });
  const [error, setError] = useState('');

  // Get assignment options based on type
  const {
    data: assignmentOptions,
    isLoading: isLoadingOptions,
    refetch: refetchOptions
  } = useGetAssignmentOptionsQuery(
    { id: taskId, type: assignmentData.assignType },
    { skip: !taskId }
  );

  // Reassignment mutation
  const [reassignTask, { isLoading: isReassigning }] = useReassignTaskMutation();

  // Refetch options when assignment type changes
  useEffect(() => {
    if (taskId) {
      refetchOptions();
    }
  }, [assignmentData.assignType, refetchOptions, taskId]);

  const handleInputChange = (field, value) => {
    setAssignmentData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleReassign = async () => {
    if (!assignmentData.userId) {
      setError('Please select a user to assign the task to');
      return;
    }

    try {
      const result = await reassignTask({
        id: taskId,
        assignType: assignmentData.assignType,
        userId: assignmentData.userId,
        reason: assignmentData.reason
      }).unwrap();

      // Success callback
      onSuccess(result);
    } catch (err) {
      setError(err.data?.message || 'Failed to reassign task. Please try again.');
    }
  };

  const handleClose = () => {
    setAssignmentData({ assignType: 'COMPLIANCE', userId: '', reason: '' });
    setError('');
    onClose();
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
                  Reassign Task
                </h3>
                <button
                  onClick={handleClose}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <p className="text-sm text-gray-600 mb-4">
                Reassign this task to a different team member. Select the assignment type and user below.
              </p>

              {/* Assignment Type Selection */}
              <div className="mb-4">
                <label className="info-label">Assignment Type</label>
                <select
                  value={assignmentData.assignType}
                  onChange={(e) => handleInputChange('assignType', e.target.value)}
                  className="select"
                  disabled={isReassigning}
                >
                  <option value="COMPLIANCE">Compliance Team</option>
                  <option value="PRODUCT">Product Team</option>
                </select>
              </div>

              {/* User Selection */}
              <div className="mb-4">
                <label className="info-label">
                  Assign to {assignmentData.assignType === 'COMPLIANCE' ? 'Compliance Officer' : 'Product User'}
                </label>
                {isLoadingOptions ? (
                  <div className="flex items-center py-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                    <span className="text-sm text-gray-600">Loading users...</span>
                  </div>
                ) : (
                  <select
                    value={assignmentData.userId}
                    onChange={(e) => handleInputChange('userId', e.target.value)}
                    className="select"
                    disabled={isReassigning}
                  >
                    <option value="">Select a user...</option>
                    {assignmentOptions?.users?.map((user) => (
                      <option key={user.id || user._id} value={user.id || user._id}>
                        {user.fullName || user.name} 
                        {user.email && ` (${user.email})`}
                        {user.workload && ` - ${user.workload} active tasks`}
                      </option>
                    ))}
                  </select>
                )}

                {/* User recommendations */}
                {assignmentOptions?.recommendations && assignmentOptions.recommendations.length > 0 && (
                  <div className="mt-2 p-2 bg-blue-50 rounded-lg">
                    <p className="text-xs font-medium text-blue-800 mb-1">Recommended:</p>
                    <div className="flex flex-wrap gap-1">
                      {assignmentOptions.recommendations.slice(0, 3).map((rec) => (
                        <button
                          key={rec.id || rec._id}
                          onClick={() => handleInputChange('userId', rec.id || rec._id)}
                          className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                          disabled={isReassigning}
                        >
                          {rec.fullName || rec.name} ({rec.workload || 0} tasks)
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Reason Input */}
              <div className="mb-4">
                <label className="info-label">Reason for Reassignment (Optional)</label>
                <textarea
                  value={assignmentData.reason}
                  onChange={(e) => handleInputChange('reason', e.target.value)}
                  placeholder="Enter reason for reassignment..."
                  className="input"
                  rows={3}
                  disabled={isReassigning}
                />
              </div>

              {/* Error Display */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Assignment Summary */}
              {assignmentData.userId && assignmentOptions?.users && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Assignment Summary</h4>
                  <div className="text-sm text-gray-600">
                    <p><strong>Type:</strong> {assignmentData.assignType === 'COMPLIANCE' ? 'Compliance Review' : 'Product Team'}</p>
                    <p><strong>Assignee:</strong> {
                      assignmentOptions.users.find(u => (u.id || u._id) === assignmentData.userId)?.fullName || 
                      assignmentOptions.users.find(u => (u.id || u._id) === assignmentData.userId)?.name || 
                      'Selected user'
                    }</p>
                    {assignmentData.reason && <p><strong>Reason:</strong> {assignmentData.reason}</p>}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                onClick={handleReassign}
                disabled={isReassigning || !assignmentData.userId}
                className="btn btn-primary sm:ml-3 sm:w-auto w-full"
              >
                {isReassigning ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Reassigning...
                  </>
                ) : (
                  'Reassign Task'
                )}
              </button>
              <button
                onClick={handleClose}
                disabled={isReassigning}
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

export default TaskReassignmentModal;