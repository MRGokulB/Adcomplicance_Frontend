import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { selectUserRole, selectCurrentUser } from '../../redux/slices/authSlice';
import { 
  useReassignTaskMutation, 
  useGetAssignmentOptionsQuery 
} from '../../redux/api/tasksApi';
import { USER_ROLES, hasPermission, PERMISSIONS } from '../../utils/roles';

const TaskReassignmentModal = ({ taskId, onClose, onSuccess }) => {
  const currentUser = useSelector(selectCurrentUser);
  const userRole = useSelector(selectUserRole);

  const getAvailableAssignmentTypes = () => {
    switch (userRole) {
      case USER_ROLES.PRODUCT_ADMIN:
        return [{ value: 'PRODUCT', label: 'Product Team' }];
      case USER_ROLES.COMPLIANCE_ADMIN:
        return [{ value: 'COMPLIANCE', label: 'Compliance Team' }];
      case USER_ROLES.ADMIN:
      case USER_ROLES.SENIOR_MANAGER:
        return [
          { value: 'COMPLIANCE', label: 'Compliance Team' },
          { value: 'PRODUCT', label: 'Product Team' }
        ];
      default:
        return [];
    }
  };

  const availableAssignmentTypes = getAvailableAssignmentTypes();
  const defaultAssignmentType = availableAssignmentTypes.length > 0 ? availableAssignmentTypes[0].value : '';

  const [assignmentData, setAssignmentData] = useState({
    assignType: defaultAssignmentType,
    userId: '',
    reason: ''
  });
  const [error, setError] = useState('');

  const canReassign = hasPermission(userRole, PERMISSIONS.TASK_REASSIGN);

  const {
    data: assignmentOptions,
    isLoading: isLoadingOptions,
    refetch: refetchOptions
  } = useGetAssignmentOptionsQuery(
    { id: taskId, type: assignmentData.assignType },
    { skip: !taskId || !assignmentData.assignType }
  );

  const [reassignTask, { isLoading: isReassigning }] = useReassignTaskMutation();

  useEffect(() => {
    if (availableAssignmentTypes.length > 0 && !assignmentData.assignType) {
      setAssignmentData(prev => ({
        ...prev,
        assignType: availableAssignmentTypes[0].value
      }));
    }
  }, [availableAssignmentTypes, assignmentData.assignType]);

  useEffect(() => {
    if (taskId && assignmentData.assignType) {
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

    if (!canReassign) {
      setError('You do not have permission to reassign tasks');
      return;
    }

    try {
      const result = await reassignTask({
        id: taskId,
        assignType: assignmentData.assignType,
        userId: assignmentData.userId,
        reason: assignmentData.reason
      }).unwrap();

      onSuccess(result);
    } catch (err) {
      setError(err.data?.message || 'Failed to reassign task. Please try again.');
    }
  };

  const handleClose = () => {
    setAssignmentData({ 
      assignType: defaultAssignmentType, 
      userId: '', 
      reason: '' 
    });
    setError('');
    onClose();
  };

  if (!canReassign) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
          <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>
          <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
              <div className="flex items-center justify-center">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                  <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
              </div>
              <div className="mt-3 text-center">
                <h3 className="text-lg font-medium text-gray-900">Access Denied</h3>
                <p className="mt-2 text-sm text-gray-500">
                  You do not have permission to reassign tasks. Contact your administrator if you believe this is an error.
                </p>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button onClick={onClose} className="btn btn-primary sm:w-auto w-full">
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (availableAssignmentTypes.length === 0) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
          <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>
          <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900">No Assignment Options</h3>
                <p className="mt-2 text-sm text-gray-500">
                  No assignment options are available for your role.
                </p>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button onClick={onClose} className="btn btn-primary sm:w-auto w-full">
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
          <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={handleClose}></div>

          <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
            
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Reassign Task
                </h3>
                <button
                  onClick={handleClose}
                  className="text-gray-400 hover:text-gray-600"
                  disabled={isReassigning}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

               

              <p className="text-sm text-gray-600 mb-4">
                Select a team member to reassign this task to.
              </p>

              {availableAssignmentTypes.length > 1 && (
                <div className="mb-4">
                  <label className="info-label">Assignment Type</label>
                  <select
                    value={assignmentData.assignType}
                    onChange={(e) => handleInputChange('assignType', e.target.value)}
                    className="select"
                    disabled={isReassigning}
                  >
                    {availableAssignmentTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {availableAssignmentTypes.length === 1 && (
                <div className="mb-4">
                  <label className="info-label">Assignment Type</label>
                  <div className="p-2 bg-gray-50 border border-gray-200 rounded-md">
                    <span className="text-sm font-medium text-gray-900">
                      {availableAssignmentTypes[0].label}
                    </span>
                  </div>
                </div>
              )}

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
                        {user.workload && ` - ${user.workload.total || user.workload} active tasks`}
                      </option>
                    ))}
                  </select>
                )}

                {assignmentOptions?.total && (
                  <div className="mt-1 text-xs text-gray-500">
                    {assignmentOptions.total} {assignmentData.assignType.toLowerCase()} users available
                  </div>
                )}
              </div>

              <div className="mb-4">
                <label className="info-label">Reason for Reassignment (Optional)</label>
                <textarea
                  value={assignmentData.reason}
                  onChange={(e) => handleInputChange('reason', e.target.value)}
                  placeholder="Enter reason for reassignment..."
                  className="input"
                  rows={3}
                  disabled={isReassigning}
                  maxLength={500}
                />
                <div className="text-xs text-gray-500 mt-1">
                  {assignmentData.reason.length}/500 characters
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex">
                    <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              )}

              {assignmentData.userId && assignmentOptions?.users && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Assignment Summary</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>
                      <span className="font-medium">Type:</span> {assignmentData.assignType === 'COMPLIANCE' ? 'Compliance Review' : 'Product Team'}
                    </div>
                    <div>
                      <span className="font-medium">Assignee:</span> {
                        assignmentOptions.users.find(u => (u.id || u._id) === assignmentData.userId)?.fullName || 
                        assignmentOptions.users.find(u => (u.id || u._id) === assignmentData.userId)?.name || 
                        'Selected user'
                      }
                    </div>
                    {assignmentData.reason && (
                      <div>
                        <span className="font-medium">Reason:</span> {assignmentData.reason}
                      </div>
                    )}
                    <div>
                      <span className="font-medium">Performed by:</span> {currentUser?.fullName || currentUser?.username || 'You'}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                onClick={handleReassign}
                disabled={isReassigning || !assignmentData.userId}
                className={`btn sm:ml-3 sm:w-auto w-full ${
                  !assignmentData.userId ? 'btn-secondary' : 'btn-primary'
                }`}
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
                  `Reassign Task`
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