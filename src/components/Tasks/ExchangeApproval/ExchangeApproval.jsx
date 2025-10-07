// src/components/Tasks/ExchangeApproval/ExchangeApproval.jsx - With integrated file upload
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
  
  // NEW: Local editing state for each approval
  const [editingData, setEditingData] = useState({});
  
  // NEW: Pending files state (stores File objects before upload)
  const [pendingFiles, setPendingFiles] = useState({});

  // API mutations
  const [addExchangeApproval, { isLoading: isAdding }] = useAddExchangeApprovalMutation();
  const [updateExchangeApproval, { isLoading: isUpdating }] = useUpdateExchangeApprovalMutation();
  const [deleteExchangeApproval, { isLoading: isDeleting }] = useDeleteExchangeApprovalMutation();
  const [uploadFile, { isLoading: isUploading }] = useUploadFileMutation();

  // Get existing approvals from task data
  const approvals = task?.exchangeApprovals || [];

  // Initialize editing data when approvals change
  useEffect(() => {
    const initialData = {};
    approvals.forEach(approval => {
      initialData[approval.id] = {
        approvalStatus: approval.approvalStatus || 'NOT_SENT',
        approvalDate: approval.approvalDate || '',
        expiryDate: approval.expiryDate || '',
        referenceNumber: approval.referenceNumber || '',
        approvalEmailUrl: approval.approvalEmailUrl || '',
        emailFileName: approval.emailFileName || ''
      };
    });
    setEditingData(initialData);
  }, [approvals]);

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
      }).unwrap();

      setSelectedExchange('');
      setShowModal(false);
      onRefresh();

    } catch (error) {
      console.error('Failed to add exchange approval:', error);
      alert(error?.data?.message || 'Failed to add exchange approval. Please try again.');
    }
  };

  // Update local state only
  const handleLocalFieldChange = (approvalId, field, value) => {
    setEditingData(prev => ({
      ...prev,
      [approvalId]: {
        ...prev[approvalId],
        [field]: value
      }
    }));
  };

  // NEW: Store file locally without uploading (following VersionControl pattern)
  const handleFileSelect = (approvalId, file) => {
    if (!file) return;
    
    if (!canUserManageThisTask()) {
      alert('You do not have permission to upload files.');
      return;
    }

    // Store the file object
    setPendingFiles(prev => ({
      ...prev,
      [approvalId]: file
    }));
    
    // Update local state with file name
    handleLocalFieldChange(approvalId, 'emailFileName', file.name);
  };

  // NEW: Submit approval with file upload (following VersionControl pattern)
  const handleSubmitApproval = async (approvalId) => {
    if (!canUserManageThisTask()) {
      alert('You do not have permission to update exchange approvals.');
      return;
    }

    const data = editingData[approvalId];
    
    // Validation for APPROVED status
    if (data.approvalStatus === 'APPROVED') {
      if (!data.approvalDate || !data.expiryDate || !data.referenceNumber) {
        alert('Approval date, expiry date, and reference number are required when status is Approved');
        return;
      }

      if (new Date(data.expiryDate) <= new Date(data.approvalDate)) {
        alert('Expiry date must be after approval date');
        return;
      }
    }

    try {
      let fileUrl = data.approvalEmailUrl;
      let fileName = data.emailFileName;
      
      // Step 1: Upload file first if there's a pending one (following VersionControl pattern)
      if (pendingFiles[approvalId]) {
        console.log('Uploading file to S3...', pendingFiles[approvalId].name);
        
        const formData = new FormData();
        formData.append('file', pendingFiles[approvalId]);
        
        const uploadResult = await uploadFile(formData).unwrap();
        console.log('Upload result:', uploadResult);
        
        fileUrl = uploadResult.file?.url || uploadResult.url;
        fileName = pendingFiles[approvalId].name;
        
        console.log('File uploaded successfully:', fileUrl);
      }

      // Step 2: Update approval with all data including file URL
      console.log('Submitting approval with data:', {
        ...data,
        approvalEmailUrl: fileUrl,
        emailFileName: fileName
      });

      await updateExchangeApproval({
        taskId: task.id,
        approvalId: approvalId,
        ...data,
        approvalEmailUrl: fileUrl || data.approvalEmailUrl,
        emailFileName: fileName || data.emailFileName
      }).unwrap();

      // Step 3: Clear pending file
      setPendingFiles(prev => {
        const newState = { ...prev };
        delete newState[approvalId];
        return newState;
      });

      alert('Exchange approval submitted successfully!');
      onRefresh();

    } catch (error) {
      console.error('Failed to submit approval:', error);
      alert(error?.data?.message || 'Failed to submit. Please try again.');
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
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
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

  // Check if approval has unsaved changes
  const hasUnsavedChanges = (approvalId) => {
    const approval = approvals.find(a => a.id === approvalId);
    const edited = editingData[approvalId];
    
    if (!approval || !edited) return false;

    // Check if there's a pending file
    if (pendingFiles[approvalId]) return true;

    return (
      edited.approvalStatus !== (approval.approvalStatus || 'NOT_SENT') ||
      edited.approvalDate !== (approval.approvalDate || '') ||
      edited.expiryDate !== (approval.expiryDate || '') ||
      edited.referenceNumber !== (approval.referenceNumber || '')
    );
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
          {allApprovalsApproved && approvals.length > 0 }
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
  {approvals.map((approval) => {
    const localData = editingData[approval.id] || {};
    const hasChanges = hasUnsavedChanges(approval.id);
    const hasPendingFile = !!pendingFiles[approval.id];
    
    return (
      <tr key={approval.id} className={hasChanges ? 'bg-yellow-50' : ''}>
        <td className="font-medium text-gray-900">{approval.exchangeName}</td>
        <td>
          {canManage ? (
            <select 
              className="exchange-status-dropdown"
              value={localData.approvalStatus || 'NOT_SENT'}
              onChange={(e) => handleLocalFieldChange(approval.id, 'approvalStatus', e.target.value)}
              disabled={isUpdating || isUploading}
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
                value={formatDateForInput(localData.approvalDate)}
                onChange={(e) => handleLocalFieldChange(approval.id, 'approvalDate', e.target.value)}
                disabled={isUpdating || isUploading}
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
                value={formatDateForInput(localData.expiryDate)}
                onChange={(e) => handleLocalFieldChange(approval.id, 'expiryDate', e.target.value)}
                disabled={isUpdating || isUploading}
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
              value={localData.referenceNumber || ''}
              onChange={(e) => handleLocalFieldChange(approval.id, 'referenceNumber', e.target.value)}
              placeholder="Enter ref number"
              disabled={isUpdating || isUploading}
            />
          ) : (
            <span className="text-sm text-gray-600">
              {approval.referenceNumber || '—'}
            </span>
          )}
        </td>
        <td>
          <div className="space-y-2">
            {/* UPDATED: Show file for everyone, not just when canManage */}
            {approval.approvalEmailUrl && (
              <div>
                <a 
                  href={approval.approvalEmailUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="exchange-file-link flex items-center gap-1 text-blue-600 hover:text-blue-800"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  {approval.emailFileName || 'Download File'}
                </a>
              </div>
            )}
            
            {/* Show "No file uploaded" message for non-managers if no file exists */}
            {!approval.approvalEmailUrl && !canManage && (
              <span className="text-sm text-gray-500 italic">No file uploaded</span>
            )}
            
            {/* Pending file indicator - only for managers */}
            {canManage && hasPendingFile && (
              <div className="flex items-center gap-2 text-sm text-orange-600">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8 4a3 3 0 00-3 3v4a5 5 0 0010 0V7a1 1 0 112 0v4a7 7 0 11-14 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z" clipRule="evenodd" />
                </svg>
                <span className="truncate">{pendingFiles[approval.id].name}</span>
                <span className="text-xs">(not saved yet)</span>
              </div>
            )}
            
            {/* File upload input - only for managers */}
            {canManage && (
              <div className="flex items-center gap-2">
                <label className="exchange-file-upload cursor-pointer">
                  {hasPendingFile ? 'Change File' : (approval.approvalEmailUrl ? 'Replace File' : 'Choose File')}
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => handleFileSelect(approval.id, e.target.files[0])}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.eml,.msg,.excel,.csv,.xls,.xlsx,.txt"
                    disabled={isUpdating || isUploading}
                  />
                </label>
                <span className="text-sm text-gray-500">
                  PDF, DOC, Image, Email
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
            <div className="flex gap-2 items-center">
              {hasChanges && (
                <button 
                  className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 text-sm font-medium"
                  onClick={() => handleSubmitApproval(approval.id)}
                  disabled={isUpdating || isUploading}
                >
                  {isUploading ? 'Uploading...' : isUpdating ? 'Submitting...' : 'Submit'}
                </button>
              )}
              {permissions.canDelete && !hasChanges && (
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
    );
  })}
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
              
              <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded">
                <strong>Note:</strong> After adding the exchange entry, you can fill in all the details and click Submit to save all changes together.
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
            <li>• Fill in all fields (status, dates, reference number, and upload file if needed)</li>
            <li>• Yellow highlight indicates unsaved changes</li>
            <li>• Orange "📎 not saved yet" indicates file selected but not uploaded</li>
            <li>• Click "Submit" button to upload file (if any) and save all changes together</li>
            <li>• Set status to "Approved" and Submit when officially approved</li>
            <li>• Upload approval emails/documents for audit trail</li>
            <li>• All exchanges must be "Approved" before task can be approved</li>
          </ul> 
        </div>
      )}
    </div>
  );
};

export default ExchangeApproval;