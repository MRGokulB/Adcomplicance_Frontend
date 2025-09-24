// src/components/Tasks/ExchangeApproval/ExchangeApproval.jsx - Updated for backend changes
import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { selectUserRole, selectCurrentUser } from '../../../redux/slices/authSlice';
import { 
  useAddExchangeApprovalMutation,
  useUpdateExchangeApprovalMutation,
  useDeleteExchangeApprovalMutation
} from '../../../redux/api/tasksApi';
import { useUploadFileMutation } from '../../../redux/api/uploadApi';
import { usePermissions } from '../../../components/PermissionWrapper';

const ExchangeApproval = ({ task, onRefresh }) => {
  const currentUser = useSelector(selectCurrentUser);
  const userRole = useSelector(selectUserRole);
  const permissions = usePermissions();

  // Local state
  const [showModal, setShowModal] = useState(false);
  const [selectedExchange, setSelectedExchange] = useState('');
  const [editingApproval, setEditingApproval] = useState(null);
  const [fileUploads, setFileUploads] = useState({});

  // API mutations
  const [addExchangeApproval, { isLoading: isAdding }] = useAddExchangeApprovalMutation();
  const [updateExchangeApproval, { isLoading: isUpdating }] = useUpdateExchangeApprovalMutation();
  const [deleteExchangeApproval, { isLoading: isDeleting }] = useDeleteExchangeApprovalMutation();
  const [uploadFile, { isLoading: isUploading }] = useUploadFileMutation();

  // Check if user can manage exchange approvals on this specific task
  const canUserManageThisTask = () => {
    if (!permissions.canManageExchangeApprovals) return false;
    
    // Admin can manage all
    if (permissions.isAdmin) return true;
    
    // Compliance users: check if assigned to this task
    if (permissions.isComplianceUser) {
      return task?.assignedComplianceId === currentUser?.id ||
             task?.assignedCompliance?.id === currentUser?.id;
    }
    
    return false;
  };

  const exchangeOptions = [
    { value: 'NSE', label: 'NSE (National Stock Exchange)' },
    { value: 'BSE', label: 'BSE (Bombay Stock Exchange)' },
    { value: 'MCX', label: 'MCX (Multi Commodity Exchange)' },
    { value: 'NCDEX', label: 'NCDEX (National Commodity & Derivatives Exchange)' }
  ];

  const statusOptions = [
    { value: 'NOT_SENT', label: 'Not Sent', color: 'gray' },
    { value: 'PENDING', label: 'Pending', color: 'yellow' },
    { value: 'APPROVED', label: 'Approved', color: 'green' },
    { value: 'REJECTED', label: 'Rejected', color: 'red' }
  ];

  // Get existing approvals from task data
  const approvals = task?.exchangeApprovals || [];

  const getAvailableExchanges = () => {
    const usedExchanges = approvals.map(approval => approval.exchangeName);
    return exchangeOptions.filter(option => !usedExchanges.includes(option.value));
  };

  const handleAddApproval = async () => {
    if (!selectedExchange) {
      alert('Please select an exchange.');
      return;
    }

    if (!canUserManageThisTask()) {
      alert('You do not have permission to manage exchange approvals for this task.');
      return;
    }

    try {
      await addExchangeApproval({
        id: task.id,
        exchangeName: selectedExchange
        // Note: Removed typeOfContent as per backend update
      }).unwrap();

      setSelectedExchange('');
      setShowModal(false);
      onRefresh();

    } catch (error) {
      console.error('Failed to add exchange approval:', error);
      alert(error?.data?.message || 'Failed to add exchange approval. Please try again.');
    }
  };

  const handleStatusChange = async (approvalId, newStatus) => {
    if (!canUserManageThisTask()) {
      alert('You do not have permission to update exchange approvals.');
      return;
    }

    try {
      await updateExchangeApproval({
        taskId: task.id,
        approvalId: approvalId,
        approvalStatus: newStatus
      }).unwrap();

      onRefresh();

    } catch (error) {
      console.error('Failed to update status:', error);
      alert(error?.data?.message || 'Failed to update status. Please try again.');
    }
  };

  const handleFieldUpdate = async (approvalId, field, value) => {
    if (!canUserManageThisTask()) {
      alert('You do not have permission to update exchange approvals.');
      return;
    }

    try {
      await updateExchangeApproval({
        taskId: task.id,
        approvalId: approvalId,
        [field]: value
      }).unwrap();

      onRefresh();

    } catch (error) {
      console.error('Failed to update field:', error);
      alert(error?.data?.message || 'Failed to update. Please try again.');
    }
  };

  const handleFileUpload = async (approvalId, file) => {
    if (!file) return;

    if (!canUserManageThisTask()) {
      alert('You do not have permission to upload files.');
      return;
    }

    try {
      setFileUploads(prev => ({ ...prev, [approvalId]: true }));

      const formData = new FormData();
      formData.append('file', file);

      const uploadResult = await uploadFile(formData).unwrap();
      const fileUrl = uploadResult.file?.url || uploadResult.url;

      await updateExchangeApproval({
        taskId: task.id,
        approvalId: approvalId,
        approvalEmailUrl: fileUrl, // Updated field name from backend
        emailFileName: file.name
      }).unwrap();

      onRefresh();

    } catch (error) {
      console.error('Failed to upload file:', error);
      alert(error?.data?.message || 'Failed to upload file. Please try again.');
    } finally {
      setFileUploads(prev => ({ ...prev, [approvalId]: false }));
    }
  };

  const handleDeleteApproval = async (approvalId) => {
    if (!canUserManageThisTask()) {
      alert('You do not have permission to delete exchange approvals.');
      return;
    }

    if (!confirm('Are you sure you want to delete this exchange approval?')) {
      return;
    }

    try {
      await deleteExchangeApproval({
        taskId: task.id,
        approvalId: approvalId
      }).unwrap();

      onRefresh();

    } catch (error) {
      console.error('Failed to delete approval:', error);
      alert(error?.data?.message || 'Failed to delete approval. Please try again.');
    }
  };

  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toISOString().split('T')[0];
  };

  const formatDisplayDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getStatusBadgeClass = (status) => {
    const statusConfig = statusOptions.find(opt => opt.value === status);
    switch (statusConfig?.color) {
      case 'green': return 'bg-green-100 text-green-800';
      case 'yellow': return 'bg-yellow-100 text-yellow-800';
      case 'red': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status) => {
    return statusOptions.find(opt => opt.value === status)?.label || status;
  };

  // Check if all approvals are approved (for task approval workflow)
  const allApprovalsApproved = approvals.length > 0 && approvals.every(approval => approval.approvalStatus === 'APPROVED');

  // Show different content based on task type
  if (!task || task.taskType !== 'EXCHANGE') {
    return (
      <div className="info-section">
        <div className="info-card bg-gray-50">
          <div className="card-body text-center py-6">
            <div className="text-gray-500">
              Exchange approvals are only required for Exchange type tasks.
            </div>
          </div>
        </div>
      </div>
    );
  }

  const canManage = canUserManageThisTask();

  return (
    <div className="">
      {/* Header with Add Button */}
      <div className="flex-between mb-6">
        <div className="">
          <h1 className="text-heading-2">Exchange Approval Management</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage approvals for different exchanges (NSE, BSE, MCX, NCDEX)
          </p>
          {allApprovalsApproved && approvals.length > 0 && (
            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-800">
              ✅ All exchange approvals completed - Task can be approved by compliance
            </div>
          )}
        </div>
        {canManage && getAvailableExchanges().length > 0 && (
          <button 
            className="exchange-add-btn"
            onClick={() => setShowModal(true)}
            disabled={isAdding}
          >
            {isAdding ? 'Adding...' : 'Add Exchange Entry'}
          </button>
        )}
      </div>

      {/* Exchange Approval Table */}
      <div className="card">
        <div className="table-container">
          {approvals.length > 0 ? (
            <table className="exchange-table">
              <thead className="exchange-table-header">
                <tr>
                  <th>Exchange</th>
                  <th>Status</th>
                  <th>Approval Date</th>
                  <th>Expiry Date</th>
                  <th>Reference No.</th>
                  <th>Approval Email</th>
                  <th>Updated By</th>
                  {canManage && <th>Actions</th>}
                </tr>
              </thead>
              <tbody className="exchange-table-body">
                {approvals.map((approval) => (
                  <tr key={approval.id}>
                    <td className="font-medium text-gray-900">{approval.exchangeName}</td>
                    <td>
                      {canManage ? (
                        <select 
                          className="exchange-status-dropdown"
                          value={approval.approvalStatus || 'NOT_SENT'}
                          onChange={(e) => handleStatusChange(approval.id, e.target.value)}
                          disabled={isUpdating}
                        >
                          {statusOptions.map(status => (
                            <option key={status.value} value={status.value}>
                              {status.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(approval.approvalStatus)}`}>
                          {getStatusLabel(approval.approvalStatus)}
                        </span>
                      )}
                    </td>
                    <td>
                      {canManage ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="date"
                            className="exchange-date-input"
                            value={formatDateForInput(approval.approvalDate)}
                            onChange={(e) => handleFieldUpdate(approval.id, 'approvalDate', e.target.value)}
                            disabled={isUpdating}
                          />
                          <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                          </svg>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-600">
                          {formatDisplayDate(approval.approvalDate) || '—'}
                        </span>
                      )}
                    </td>
                    <td>
                      {canManage ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="date"
                            className="exchange-date-input"
                            value={formatDateForInput(approval.expiryDate)}
                            onChange={(e) => handleFieldUpdate(approval.id, 'expiryDate', e.target.value)}
                            disabled={isUpdating}
                          />
                          <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                          </svg>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-600">
                          {formatDisplayDate(approval.expiryDate) || '—'}
                        </span>
                      )}
                    </td>
                    <td>
                      {canManage ? (
                        <input
                          type="text"
                          className="exchange-ref-input"
                          value={approval.referenceNumber || ''}
                          onChange={(e) => handleFieldUpdate(approval.id, 'referenceNumber', e.target.value)}
                          placeholder="Enter ref number"
                          disabled={isUpdating}
                        />
                      ) : (
                        <span className="text-sm text-gray-600">
                          {approval.referenceNumber || '—'}
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="space-y-2">
                        {approval.approvalEmailUrl && approval.emailFileName && (
                          <div>
                            <a 
                              href={approval.approvalEmailUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="exchange-file-link flex items-center gap-1"
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                              {approval.emailFileName}
                            </a>
                          </div>
                        )}
                        {canManage && (
                          <div className="flex items-center gap-2">
                            <label className="exchange-file-upload cursor-pointer">
                              Choose File
                              <input
                                type="file"
                                className="hidden"
                                onChange={(e) => handleFileUpload(approval.id, e.target.files[0])}
                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.eml,.msg"
                                disabled={isUploading || fileUploads[approval.id]}
                              />
                            </label>
                            <span className="text-sm text-gray-500">
                              {fileUploads[approval.id] ? 'Uploading...' : 'PDF, DOC, Image, Email'}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="text-sm text-gray-600">
                      {approval.updatedBy?.fullName || 
                       approval.submittedBy?.fullName || 
                       approval.submittedBy || 
                       currentUser?.fullName || 
                       '—'}
                    </td>
                    {canManage && (
                      <td>
                        <div className="flex gap-2">
                          {approval.approvalStatus !== 'PENDING' && (
                            <button 
                              className="exchange-submit-btn"
                              onClick={() => handleStatusChange(approval.id, 'PENDING')}
                              disabled={isUpdating}
                            >
                              Submit
                            </button>
                          )}
                          {permissions.canDelete && (
                            <button 
                              className="text-red-600 hover:text-red-800 text-sm"
                              onClick={() => handleDeleteApproval(approval.id)}
                              disabled={isDeleting}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-500 mb-4">
                <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Exchange Approvals</h3>
                <p className="text-gray-500 mb-4">
                  No exchange approvals have been added yet for this task.
                </p>
                {canManage && (
                  <button 
                    className="btn btn-primary"
                    onClick={() => setShowModal(true)}
                  >
                    Add First Exchange Entry
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Approval Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="exchange-modal" onClick={(e) => e.stopPropagation()}>
            <div className="exchange-modal-header">
              <h3 className="text-lg font-semibold text-gray-900">Add New Exchange Entry</h3>
              <button 
                className="text-gray-400 hover:text-gray-600"
                onClick={() => setShowModal(false)}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="exchange-modal-body space-y-4">
              <div className="exchange-form-group">
                <label className="exchange-form-label">Select Exchange *</label>
                <select 
                  className="exchange-form-select"
                  value={selectedExchange}
                  onChange={(e) => setSelectedExchange(e.target.value)}
                >
                  <option value="">Choose an exchange...</option>
                  {getAvailableExchanges().map(exchange => (
                    <option key={exchange.value} value={exchange.value}>
                      {exchange.label}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Note: Removed Type of Content field as per backend update */}
              
              <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded">
                <strong>Note:</strong> After adding the exchange entry, you can update the approval status, dates, and reference number in the table above.
              </div>
            </div>
            <div className="exchange-modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleAddApproval}
                disabled={!selectedExchange || isAdding}
              >
                {isAdding ? 'Adding...' : 'Add Exchange Entry'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Information Panel */}
      {approvals.length > 0 && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Exchange Approval Workflow:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Set status to "Pending" when submitted to exchange</li>
            <li>• Update to "Approved" only after receiving official approval</li>
            <li>• Enter reference numbers for approved submissions</li>
            <li>• Upload approval emails/documents for audit trail</li>
            <li>• All exchanges must be "Approved" before task can be approved</li>
            <li>• Set expiry dates to track when approvals expire</li>
          </ul>
          
          {!canManage && (
            <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
              <strong>Note:</strong> You can view exchange approvals but cannot modify them. Only assigned compliance users can make changes.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ExchangeApproval;