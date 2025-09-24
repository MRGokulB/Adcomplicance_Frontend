// components/TaskStatusTransition.jsx - UI component for manual status changes
import React, { useState } from 'react'
import { useTaskStatusManager } from '../hooks/useTaskStatusManager'
import { usePermissions } from '../hooks/usePermissions'

const TaskStatusTransition = ({ taskId, currentStatus, task, onStatusUpdate }) => {
  const [showTransitionDialog, setShowTransitionDialog] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState('')
  const [reason, setReason] = useState('')
  
  const {
    updateStatus,
    validTransitions,
    getStatusLabel,
    getStatusColor,
    isLoading
  } = useTaskStatusManager(taskId, currentStatus)
  
  const { userRole } = usePermissions()

  const handleStatusChange = async () => {
    if (!selectedStatus || !reason.trim()) {
      return
    }

    const result = await updateStatus(selectedStatus, reason)
    if (result.success) {
      setShowTransitionDialog(false)
      setSelectedStatus('')
      setReason('')
      onStatusUpdate?.(result.data)
    }
  }

  const getTransitionReasonPlaceholder = (status) => {
    const placeholders = {
      'COMPLIANCE_REVIEW': 'Explain why this task is ready for compliance review...',
      'PRODUCT_REVIEW': 'Describe what needs to be revised by the product team...',
      'APPROVED': 'Confirmation that all requirements are met...',
      'PUBLISHED': 'Confirm the task has been published...'
    }
    return placeholders[status] || 'Provide a reason for this status change...'
  }

  if (validTransitions.length === 0) {
    return (
      <div className="flex items-center space-x-2">
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(currentStatus)}`}>
          {getStatusLabel(currentStatus)}
        </span>
        <span className="text-sm text-gray-500">No actions available</span>
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center space-x-3">
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(currentStatus)}`}>
          {getStatusLabel(currentStatus)}
        </span>
        
        {validTransitions.length > 0 && (
          <button
            onClick={() => setShowTransitionDialog(true)}
            disabled={isLoading}
            className="btn btn-primary btn-sm"
          >
            Update Status
          </button>
        )}
      </div>

      {/* Status Transition Dialog */}
      {showTransitionDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Update Task Status</h3>
              <button
                onClick={() => setShowTransitionDialog(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Status
                </label>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(currentStatus)}`}>
                  {getStatusLabel(currentStatus)}
                </span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Status
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select new status...</option>
                  {validTransitions.map(status => (
                    <option key={status} value={status}>
                      {getStatusLabel(status)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Change <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={getTransitionReasonPlaceholder(selectedStatus)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Warning for specific transitions */}
              {selectedStatus === 'PRODUCT_REVIEW' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                  <div className="flex">
                    <svg className="w-5 h-5 text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <div className="text-sm text-yellow-800">
                      This will send the task back to the product team for revisions.
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowTransitionDialog(false)}
                className="btn btn-secondary"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleStatusChange}
                disabled={!selectedStatus || !reason.trim() || isLoading}
                className="btn btn-primary"
              >
                {isLoading ? 'Updating...' : 'Update Status'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default TaskStatusTransition