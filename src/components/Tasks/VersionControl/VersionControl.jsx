// src/components/Tasks/VersionControl/VersionControl.jsx - Fixed Latest Version Display
import React, { useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import { selectUserRole, selectCurrentUser } from '../../../redux/slices/authSlice';
import { 
  useUploadVersionMutation,
  useAddCommentMutation,
  useValidateFilesMutation,
} from '../../../redux/api/tasksApi';
import { 
  useUploadFileMutation,
  useUploadFilesMutation,
  useValidateUrlsMutation 
} from '../../../redux/api/uploadApi';
import { usePermissions } from '../../../components/PermissionWrapper';
import { CanValidateFiles } from '../../../components/PermissionWrapper';

const VersionControl = ({ task, onRefresh }) => {
  const fileInputRef = useRef();
  const currentUser = useSelector(selectCurrentUser);
  const userRole = useSelector(selectUserRole);
  const permissions = usePermissions();

  // Local state
  const [uploadData, setUploadData] = useState({
    files: [],
    remarks: '',
    comment: '',
    s3Urls: [] // Add this to track S3 URLs
  });
  const [versionComment, setVersionComment] = useState('');
  const [previewMode, setPreviewMode] = useState(false);
  const [validationResults, setValidationResults] = useState(null);
  const [showValidationResults, setShowValidationResults] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState(null); // For viewing version details
  const selectedVersionRef = useRef(null); // Ref for scrolling to selected version

  // API mutations - ALTERNATIVE PATTERN TO AVOID HOOK ISSUES
  const [uploadVersionTrigger, uploadVersionResult] = useUploadVersionMutation();
  const [addComment, { isLoading: isAddingComment }] = useAddCommentMutation();
  const [uploadFiles, { isLoading: isUploadingFiles }] = useUploadFilesMutation();
  const [validateUrls, { isLoading: isValidating }] = useValidateUrlsMutation();

  // Track loading state manually
  const isUploadingVersion = uploadVersionResult.isLoading;

  // FIXED: Get latest version from currentVersion field in API response
  const latestVersion = task?.currentVersion || null;

  // Check if user can upload based on role and task status
  const canUserUploadVersion = () => {
    if (!permissions.canUploadVersion) return false;
    
    // Product users can upload when task is in Product Review or Open
    if (permissions.isProductUser) {
      const canActOnTask = task.createdBy === currentUser?.id ||
                          task.assignedProductIds?.includes(currentUser?.id) ||
                          (task.assignedProducts && task.assignedProducts.some(user => 
                            typeof user === 'object' ? user.id === currentUser?.id : false
                          ));
      
      // Allow upload in OPEN or PRODUCT_REVIEW status
      return canActOnTask && ['OPEN', 'PRODUCT_REVIEW'].includes(task.status);
    }
    
    // Admins can upload anytime
    if (permissions.isAdmin) return true;
    
    return false;
  };

  // Get upload guidance based on current status
  const getUploadGuidance = () => {
    if (!task.taskType) {
      return {
        message: 'Task must be classified before uploading versions',
        type: 'warning'
      };
    }

    switch (task.status) {
      case 'OPEN':
        return {
          message: 'Upload initial version and manually update status to Compliance Review',
          type: 'info'
        };
      case 'PRODUCT_REVIEW':
        return {
          message: 'Upload revised version addressing compliance feedback, then manually update status to Compliance Review',
          type: 'info'
        };
      case 'COMPLIANCE_REVIEW':
        return {
          message: 'Task is under compliance review. Product team cannot upload at this time.',
          type: 'warning'
        };
      case 'APPROVED':
        return {
          message: 'Task is approved. No further versions can be uploaded.',
          type: 'success'
        };
      case 'PUBLISHED':
        return {
          message: 'Task is published. Version control is locked.',
          type: 'success'
        };
      default:
        if (task.status?.includes('CLOSED')) {
          return {
            message: 'Task is closed. No further changes allowed.',
            type: 'error'
          };
        }
        return {
          message: 'Contact administrator for assistance',
          type: 'warning'
        };
    }
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    
    // Validate file count (max 5 as per documentation)
    if (files.length > 5) {
      alert('Maximum 5 files allowed per version');
      return;
    }
    
    setUploadData(prev => ({
      ...prev,
      files: files,
      s3Urls: [] // Clear previous S3 URLs when new files selected
    }));
    
    // Clear previous validation results
    setValidationResults(null);
    setShowValidationResults(false);

    // Auto-validate files if any are selected
    if (files.length > 0) {
      await handleValidateFiles(files);
    }
  };

  const handleInputChange = (field, value) => {
    setUploadData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // UPDATED: Auto-validation with optional files parameter
  const handleValidateFiles = async (filesToValidate = null) => {
    const files = filesToValidate || uploadData.files;
    
    try {
      console.log('Starting file validation...', files.length, 'files');
      
      // Step 1: Prepare FormData for upload
      const formData = new FormData();
      files.forEach((file) => {
        formData.append("files", file);
      });

      // Step 2: Upload to S3
      console.log('Uploading files to S3...');
      const uploadRes = await uploadFiles(formData).unwrap();
      console.log('Upload response:', uploadRes);
      
      if (!uploadRes.files || uploadRes.files.length === 0) {
        throw new Error('No files were uploaded successfully');
      }

      // Step 3: Extract S3 URLs
      const s3Urls = uploadRes.files.map(f => f.url);
      console.log('Extracted S3 URLs:', s3Urls);

      // Step 4: Validate S3 URLs using the validate-urls endpoint
      console.log('Validating S3 URLs...');
      const validationRes = await validateUrls(s3Urls).unwrap();
      console.log('Validation response:', validationRes);
      
      // Step 5: Update state with results
      setValidationResults(validationRes);
      setShowValidationResults(true);

      // Step 6: Store the validated S3 URLs for version creation
      setUploadData(prev => ({ 
        ...prev, 
        s3Urls: s3Urls,
        uploadedFiles: uploadRes.files // Store full file details
      }));

      console.log('File validation completed successfully');
      return true;

    } catch (err) {
      console.error("Validation error:", err);
      const errorMessage = err?.data?.message || err?.message || 'Validation failed';
      setValidationResults({ 
        valid: false, 
        message: errorMessage,
        error: err?.data?.error || 'Unknown error'
      });
      setShowValidationResults(true);
      
      // Clear S3 URLs on error
      setUploadData(prev => ({ ...prev, s3Urls: [] }));
      return false;
    }
  };

  // UPDATED: Create version with auto-validation if needed
  const handleFileUpload = async () => {
  console.log("Starting version upload...");  
    
  try {
    // Check permissions first
    if (!canUserUploadVersion()) {
      alert("You do not have permission to upload versions at this time");
      return;
    }

    if (!uploadData.files || uploadData.files.length === 0) {
      alert("Please select files before creating a version.");
      return;
    }

    // Auto-validate if not already validated or validation failed
    if (!uploadData.s3Urls || uploadData.s3Urls.length === 0 || 
        !validationResults || validationResults.invalid > 0) {
      console.log('Auto-validating files before version creation...');
      const validationSuccess = await handleValidateFiles();
      if (!validationSuccess) {
        alert("File validation failed. Please check your files and try again.");
        return;
      }
    }

    console.log('Creating version with S3 URLs:', uploadData.s3Urls);

    // Prepare payload for version creation
    const versionPayload = {
      id: task.id,
      files: uploadData.s3Urls,
      remarks: uploadData.remarks?.trim() || `New version with ${uploadData.s3Urls.length} file(s)`
    };

    console.log('Version payload:', versionPayload);

    // Create version - FIXED: Just await the result, API success means no error was thrown
    const result = await uploadVersionTrigger(versionPayload).unwrap();
    console.log('Version upload result:', result);

    // If we get here, the upload was successful (no error thrown)
    // Show success message with guidance
    const guidance = getUploadGuidance();
    alert(`Version uploaded successfully! ${guidance.message}`);

    // Reset form
    setUploadData({
      files: [],
      remarks: '',
      comment: '',
      s3Urls: []
    });
    setValidationResults(null);
    setShowValidationResults(false);
    setPreviewMode(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // Refresh task data
    onRefresh?.();

  } catch (error) {
    console.error("Version upload failed:", error);
    const errorMessage = error?.data?.message || error?.message || 'Failed to create version';
    alert(`Version upload failed: ${errorMessage}`);
  }
};

  const handleAddVersionComment = async () => {
    if (!versionComment.trim() || !latestVersion) return;

    try {
      await addComment({
        id: task.id,
        content: versionComment,
        versionId: latestVersion.id,
        isGlobal: false
      }).unwrap();
      
      setVersionComment('');
      onRefresh?.();
    } catch (error) {
      console.error('Failed to add comment:', error);
      alert(error?.data?.message || 'Failed to add comment');
    }
  };

  const handlePreview = () => {
    if (uploadData.files.length === 0) {
      alert('Please select files to preview');
      return;
    }
    setPreviewMode(!previewMode);
  };

  // Handle viewing version details
  const handleViewVersion = (version) => {
    setSelectedVersion(version);
    
    // Scroll to the selected version details card after state update
    setTimeout(() => {
      if (selectedVersionRef.current) {
        selectedVersionRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
          inline: 'nearest'
        });
      }
    }, 100); // Small delay to ensure the component has rendered
  };

  // Handle closing version details
  const handleCloseVersionView = () => {
    setSelectedVersion(null);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFileTypeIcon = (fileName) => {
    const extension = fileName?.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return (
          <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M4 18h12V6l-4-4H4v16zm8-14v4h4l-4-4z"/>
          </svg>
        );
      case 'doc':
      case 'docx':
        return (
          <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M4 2h12a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V4a2 2 0 012-2z"/>
          </svg>
        );
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return (
          <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"/>
          </svg>
        );
      case 'mp4':
      case 'avi':
      case 'mov':
        return (
          <svg className="w-4 h-4 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 6a2 2 0 012-2h6l2 2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM8 9a1 1 0 100-2 1 1 0 000 2z"/>
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4z"/>
          </svg>
        );
    }
  };

  const uploadGuidance = getUploadGuidance();
  const canUpload = canUserUploadVersion();

  // Check if files are ready for version upload - FIXED: Handle numeric valid count
  const filesReadyForUpload = uploadData.s3Urls.length > 0 && 
    validationResults && 
    (validationResults.valid === true || 
     (typeof validationResults.valid === 'number' && validationResults.valid > 0)) &&
    validationResults.invalid === 0;

  return (
    <div>
      {/* Latest Version Card */}
      <div className="info-section">
        <div className="info-card bg-green-50">
          <div className="info-card-header">
            <span className="info-badge-new">
              {latestVersion ? 'CURRENT' : 'NEW'}
            </span>
            <span className="text-heading-2">
              {latestVersion ? 'Latest Version' : 'No Versions'}
            </span>
          </div>
          <div className="card-body">
            {latestVersion ? (
              <>
                <div className="info-row">
                  <span className="info-label">Version:</span>
                  <span className="info-value">
                    {latestVersion.versionNumber || '1.0'}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">Uploaded By:</span>
                  <span className="info-value">
                    {latestVersion.uploadedBy?.fullName || 
                     currentUser?.fullName || 
                     'Unknown'}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">On:</span>
                  <span className="info-value">
                    {formatDate(latestVersion.uploadedAt)}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">Remarks:</span>
                  <span className="info-value info-remark-box">
                    {latestVersion.remarks || 'No remarks'}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">Files:</span>
                  <span className="info-value info-file-list">
                    {latestVersion.fileUrls && latestVersion.fileUrls.length > 0 ? (
                      <div className="space-y-1">
                        {latestVersion.fileUrls.map((fileUrl, index) => {
                          const fileName = fileUrl.split('/').pop();
                          return (
                            <div key={index} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {getFileTypeIcon(fileName)}
                                <span className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer truncate">
                                  {fileName}
                                </span>
                              </div>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => window.open(fileUrl, '_blank')}
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
                    ) : (
                      'No files'
                    )}
                  </span>
                </div>
                
                {/* Version Comments */}
                <div className="mt-4">
                  {latestVersion.comments && latestVersion.comments.length > 0 && (
                    <div className="mb-3">
                      <div className="text-sm font-medium text-gray-700 mb-2">
                        Comments ({latestVersion.comments.length})
                      </div>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {latestVersion.comments.map((comment, index) => (
                          <div key={index} className="text-sm bg-white p-2 rounded border">
                            <div className="flex justify-between items-start mb-1">
                              <span className="font-medium text-gray-700">
                                {comment.createdBy?.fullName || comment.author?.fullName || 'User'}
                              </span>
                              <span className="text-xs text-gray-500">
                                {formatDate(comment.createdAt)}
                              </span>
                            </div>
                            <p className="text-gray-600">{comment.content}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <textarea 
                    className="info-comment-box" 
                    placeholder="Add a comment..."
                    value={versionComment}
                    onChange={(e) => setVersionComment(e.target.value)}
                  />
                  <button 
                    className="btn btn-primary mt-2"
                    onClick={handleAddVersionComment}
                    disabled={isAddingComment || !versionComment.trim()}
                  >
                    {isAddingComment ? 'Adding...' : 'Add Comment'}
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-gray-600">No versions uploaded yet</p>
                <p className="text-sm text-gray-500 mt-1">Upload your first version below</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Selected Version Details Card */}
      {selectedVersion && (
        <div className="info-section" ref={selectedVersionRef}>
          <div className="info-card bg-purple-50">
            <div className="info-card-header flex-between">
              <div className="flex items-center gap-2">
                <span className="info-badge-new bg-purple-500 text-white">
                  VIEWING
                </span>
                <span className="text-heading-2">
                  Version Details
                </span>
              </div>
              <button 
                onClick={handleCloseVersionView}
                className="btn btn-ghost btn-sm"
                title="Close version details"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Close
              </button>
            </div>
            <div className="card-body">
              <div className="info-row">
                <span className="info-label">Version:</span>
                <span className="info-value">
                  {selectedVersion.versionNumber || '1.0'}
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">Uploaded By:</span>
                <span className="info-value">
                  {selectedVersion.uploadedBy?.fullName || 
                   currentUser?.fullName || 
                   'Unknown'}
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">On:</span>
                <span className="info-value">
                  {formatDate(selectedVersion.uploadedAt)}
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">Remarks:</span>
                <span className="info-value info-remark-box">
                  {selectedVersion.remarks || 'No remarks'}
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">Files:</span>
                <span className="info-value info-file-list">
                  {selectedVersion.fileUrls && selectedVersion.fileUrls.length > 0 ? (
                    <div className="space-y-1">
                      {selectedVersion.fileUrls.map((fileUrl, index) => {
                        const fileName = fileUrl.split('/').pop();
                        return (
                          <div key={index} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {getFileTypeIcon(fileName)}
                              <span className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer truncate">
                                {fileName}
                              </span>
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={() => window.open(fileUrl, '_blank')}
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
                  ) : (
                    'No files'
                  )}
                </span>
              </div>
              
              {/* Version Comments */}
              {selectedVersion.comments && selectedVersion.comments.length > 0 && (
                <div className="mt-4">
                  <div className="text-sm font-medium text-gray-700 mb-2">
                    Comments ({selectedVersion.comments.length})
                  </div>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {selectedVersion.comments.map((comment, index) => (
                      <div key={index} className="text-sm bg-white p-2 rounded border">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-medium text-gray-700">
                            {comment.author?.fullName || comment.createdBy?.fullName || 'User'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatDate(comment.createdAt)}
                          </span>
                        </div>
                        <p className="text-gray-600">{comment.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* NEW: Exchange Approvals Section - Only for Exchange Type Tasks */}
        {task?.taskType === 'EXCHANGE' && selectedVersion.exchangeApprovals && selectedVersion.exchangeApprovals.length > 0 && (
          <div className="mt-6 pt-4 border-t border-purple-200">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-base font-semibold text-purple-900">
                Exchange Approvals ({selectedVersion.exchangeApprovals.length})
              </span>
              {selectedVersion.exchangeApprovals.every(a => a.approvalStatus === 'APPROVED') && (
                <span className="badge badge-success ml-auto">All Approved</span>
              )}
            </div>

            <div className="space-y-3">
              {selectedVersion.exchangeApprovals.map((approval, index) => (
                <div key={approval.id || index} className="bg-white rounded-lg border border-purple-200 p-3">
                  {/* Exchange Header */}
                  <div className="flex-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{approval.exchangeName}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        approval.approvalStatus === 'APPROVED' ? 'bg-green-100 text-green-800' :
                        approval.approvalStatus === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                        approval.approvalStatus === 'REJECTED' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {approval.approvalStatus === 'NOT_SENT' ? 'Not Sent' :
                         approval.approvalStatus === 'PENDING' ? 'Pending' :
                         approval.approvalStatus === 'APPROVED' ? 'Approved' :
                         approval.approvalStatus === 'REJECTED' ? 'Rejected' :
                         approval.approvalStatus}
                      </span>
                    </div>
                  </div>

                  {/* Exchange Details */}
                  <div className="space-y-1 text-sm">
                    {approval.approvalDate && (
                      <div className="flex gap-2">
                        <span className="text-gray-600 min-w-[100px]">Approval Date:</span>
                        <span className="text-gray-900">
                          {new Date(approval.approvalDate).toLocaleDateString('en-US', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                    )}
                    
                    {approval.expiryDate && (
                      <div className="flex gap-2">
                        <span className="text-gray-600 min-w-[100px]">Expiry Date:</span>
                        <span className="text-gray-900">
                          {new Date(approval.expiryDate).toLocaleDateString('en-US', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                    )}
                    
                    {approval.referenceNumber && (
                      <div className="flex gap-2">
                        <span className="text-gray-600 min-w-[100px]">Reference No:</span>
                        <span className="text-gray-900 font-medium">{approval.referenceNumber}</span>
                      </div>
                    )}

                    {approval.approvalEmailUrl && (
                      <div className="flex gap-2">
                        <span className="text-gray-600 min-w-[100px]">Approval Doc:</span>
                        <a 
                          href={approval.approvalEmailUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                          {approval.emailFileName || 'Download'}
                        </a>
                      </div>
                    )}

                    {approval.updatedBy && (
                      <div className="flex gap-2">
                        <span className="text-gray-600 min-w-[100px]">Updated By:</span>
                        <span className="text-gray-900 text-xs">{approval.updatedBy.fullName}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

         
              
              {/* Version Statistics */}
              <div className="mt-4 p-3 bg-white rounded border">
                <div className="text-sm font-medium text-gray-700 mb-2">Version Statistics</div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Files:</span>
                    <span className="ml-2 font-medium">{selectedVersion.fileUrls?.length || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Comments:</span>
                    <span className="ml-2 font-medium">{selectedVersion.comments?.length || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Version ID:</span>
                    <span className="ml-2 font-mono text-xs">{selectedVersion.id}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Status:</span>
                    <span className="ml-2">
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                        {selectedVersion.id === latestVersion?.id ? 'Current' : 'Archived'}
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload New Version */}
      <div className="info-section">
        <div className="info-card bg-blue-50">
          <div className="info-card-header flex-between">
            <span className="card-title">Upload New Version</span>
            <div className="flex gap-2">
              <button 
                className="btn btn-primary btn-sm"
                onClick={handlePreview}
                disabled={uploadData.files.length === 0}
              >
                Preview
              </button>
            </div>
          </div>
          <div className="card-body">
            
            {canUpload ? (
              <>
                <input
                  type="file"
                  className="mb-3 w-full"
                  ref={fileInputRef}
                  multiple
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.mp4,.avi,.mov"
                />
                
                {/* File Preview */}
                {uploadData.files.length > 0 && (
                  <div className="mb-3 p-3 bg-white rounded border">
                    <div className="text-sm font-medium text-gray-700 mb-2">
                      Selected Files ({uploadData.files.length}/5):
                    </div>
                    <div className="space-y-1 max-h-24 overflow-y-auto">
                      {uploadData.files.map((file, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            {getFileTypeIcon(file.name)}
                            <span className="text-gray-600 truncate">{file.name}</span>
                          </div>
                          <span className="text-gray-500 ml-2">{formatFileSize(file.size)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Validation Results */}
                {showValidationResults && validationResults && (
                  <div className={`mb-3 p-3 border rounded ${
                    (validationResults.valid === true || 
                     (typeof validationResults.valid === 'number' && validationResults.valid > 0 && validationResults.invalid === 0))
                     ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                  }`}>
                    <div className={`text-sm font-medium mb-2 ${
                      (validationResults.valid === true || 
                       (typeof validationResults.valid === 'number' && validationResults.valid > 0 && validationResults.invalid === 0))
                       ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {(validationResults.valid === true || 
                        (typeof validationResults.valid === 'number' && validationResults.valid > 0 && validationResults.invalid === 0))
                        ? '✓ Files Validated Successfully' : '⚠ Validation Issues Found'}
                    </div>
                    <div className={`text-sm ${
                      (validationResults.valid === true || 
                       (typeof validationResults.valid === 'number' && validationResults.valid > 0 && validationResults.invalid === 0))
                       ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {validationResults.message || (
                        (validationResults.valid === true || 
                         (typeof validationResults.valid === 'number' && validationResults.valid > 0 && validationResults.invalid === 0))
                          ? `${typeof validationResults.valid === 'number' ? validationResults.valid : uploadData.files.length} files uploaded and validated` 
                          : 'Some files failed validation checks'
                      )}
                    </div>
                    {filesReadyForUpload && uploadData.s3Urls.length > 0 && (
                      <div className="text-xs text-green-600 mt-1">
                        Ready to create version with {uploadData.s3Urls.length} file(s)
                      </div>
                    )}
                    {validationResults.results && 
     validationResults.invalid === 0 && 
     validationResults.valid > 0 && (
      <div className="mt-3">
        <div className="text-sm font-medium text-green-800 mb-2">Validation Details:</div>
        <ul className="text-sm text-green-600 list-disc list-inside space-y-1">
          {validationResults.results.map((result, index) => (
            <li key={index}>
              ✓ {uploadData.files[index]?.name || `File ${index + 1}`} - {
                result.metadata ? 
                  `${result.metadata.contentType || 'Unknown type'} (${
                    result.metadata.size ? formatFileSize(result.metadata.size) : 'Unknown size'
                  })` : 
                  'Validated successfully'
              }
            </li>
          ))}
        </ul>
      </div>
    )}
                  </div>
                )}

                {/* Preview Mode */}
                {previewMode && uploadData.files.length > 0 && (
                  <div className="mb-3 p-3 bg-purple-50 border border-purple-200 rounded">
                    <div className="text-sm font-medium text-purple-800 mb-2">Preview Mode</div>
                    <div className="text-sm text-purple-700 space-y-1">
                      <div>Ready to upload {uploadData.files.length} file{uploadData.files.length !== 1 ? 's' : ''}</div>
                      {uploadData.remarks && (
                        <div>Remarks: "{uploadData.remarks}"</div>
                      )}
                      
                      {/* Validation Status */}
                      <div className="mt-2 pt-2 border-t border-purple-200">
                        {isValidating ? (
                          <div className="flex items-center gap-2 text-blue-700">
                            <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            <span className="font-medium">Validating files...</span>
                          </div>
                        ) : filesReadyForUpload ? (
                          <div className="flex items-center gap-2 text-green-700">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="font-medium">Files validated & ready</span>
                          </div>
                        ) : validationResults && validationResults.invalid > 0 ? (
                          <div className="flex items-center gap-2 text-red-700">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="font-medium">Validation failed</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-gray-600">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="font-medium">Auto-validation will run on upload</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                
                <textarea
                  className="input resize-none min-h-[48px] mb-3"
                  placeholder="Enter remarks for this version..."
                  value={uploadData.remarks}
                  onChange={(e) => handleInputChange('remarks', e.target.value)}
                />
                
                <button 
                  className="btn btn-primary w-full"
                  onClick={handleFileUpload}
                  disabled={isUploadingVersion || isValidating || uploadData.files.length === 0}
                >
                  {isUploadingVersion ? (
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Creating Version...
                    </div>
                  ) : isValidating ? (
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Validating Files...
                    </div>
                  ) : (
                    'Create Version'
                  )}
                </button>

                {/* Upload Instructions */}
                <div className="mt-3 text-xs text-gray-500">
                  <p className="mb-1">• Supported formats: PDF, DOC, DOCX, JPG, PNG, GIF, MP4, AVI, MOV</p>
                  <p className="mb-1">• Maximum 5 files per version</p>
                  <p className="mb-1">• Maximum file size: 50MB per file</p> 
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <svg className="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <p className="text-gray-600 mb-2">Upload Not Available</p>
                <p className="text-sm text-gray-500">
                  {uploadGuidance.message}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Version History - UPDATED: Use olderVersions from API response */}
      {task?.olderVersions && task.olderVersions.length > 0 && (
        <div className="info-section">
          <div className="info-card">
            <div className="info-card-header flex-between">
              <span className="text-heading-4">Version History</span>
              <span className="text-sm text-gray-500">
                Total versions: {task.olderVersions.length}
              </span>
            </div>
            <div className="card-body">
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {task.olderVersions.map((version, index) => (
                  <div key={index} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-900">
                          Version {version.versionNumber || `${task.olderVersions.length - index}.0`}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDate(version.uploadedAt)}
                        </span>
                        {version.comments && version.comments.length > 0 && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                            {version.comments.length} comment{version.comments.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-600">
                        By: {version.uploadedBy?.fullName || 'Unknown'}
                      </div>
                      {version.remarks && (
                        <div className="text-xs text-gray-500 mt-1 truncate">
                          {version.remarks}
                        </div>
                      )} 
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-xs text-gray-500">
                        {version.fileUrls?.length || 0} files
                      </div>
                      <button
                        onClick={() => handleViewVersion(version)}
                        className="btn btn-outline btn-sm text-xs"
                        title="View version details"
                      >
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Quick Actions for Version History */}
              <div className="mt-4 pt-3 border-t border-gray-200 flex justify-between items-center">
                <div></div>
                {selectedVersion && (
                  <button
                    onClick={handleCloseVersionView}
                    className="btn btn-ghost btn-sm text-xs"
                  >
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Close Details
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VersionControl;