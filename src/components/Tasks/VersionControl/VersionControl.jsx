// src/components/Tasks/VersionControl/VersionControl.jsx - Fixed Upload New Version functionality
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

  // API mutations - ALTERNATIVE PATTERN TO AVOID HOOK ISSUES
  const [uploadVersionTrigger, uploadVersionResult] = useUploadVersionMutation();
  const [addComment, { isLoading: isAddingComment }] = useAddCommentMutation();
  const [uploadFiles, { isLoading: isUploadingFiles }] = useUploadFilesMutation();
  const [validateUrls, { isLoading: isValidating }] = useValidateUrlsMutation();

  // Track loading state manually
  const isUploadingVersion = uploadVersionResult.isLoading;

  // Get latest version
  const latestVersion = task?.versions && task.versions.length > 0 
    ? task.versions[task.versions.length - 1] 
    : null;

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

  const handleFileChange = (e) => {
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
  };

  const handleInputChange = (field, value) => {
    setUploadData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // FIXED: Proper file validation flow
  const handleValidateFiles = async () => {
    try {
      console.log('Starting file validation...', uploadData.files.length, 'files');
      
      // Step 1: Prepare FormData for upload
      const formData = new FormData();
      uploadData.files.forEach((file) => {
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
    }
  };

  // ENHANCED: Version upload with better error logging
  const handleFileUpload = async () => {
  console.log("Starting version upload...");  
    
  try {
    // Check permissions and validation first
    if (!canUserUploadVersion()) {
      alert("You do not have permission to upload versions at this time");
      return;
    }

    if (!uploadData.s3Urls || uploadData.s3Urls.length === 0) {
      alert("Please validate files before uploading a version.");
      return;
    }

    // Ensure we have validation results and they are valid
    if (!validationResults || validationResults.invalid > 0) {
      alert("Files must pass validation before creating a version.");
      return;
    }

    console.log('Creating version with S3 URLs:', uploadData.s3Urls);

    // Prepare payload for version creation
    const versionPayload = {
      id: task.id,
      files: uploadData.s3Urls,
      remarks: uploadData.remarks?.trim() || `New version with ${uploadData.s3Urls.length} file(s)`
    };

    console.log('Version payload:', versionPayload);

    // Create version
    const result = await uploadVersionTrigger(versionPayload).unwrap();

    if (result.success) {
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
    } else {
      throw new Error(result.message || 'Failed to create version');
    }

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
                    {latestVersion.version || latestVersion.versionNumber || '1.0'}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">Uploaded By:</span>
                  <span className="info-value">
                    {latestVersion.uploadedBy?.fullName || 
                     latestVersion.uploadedBy || 
                     currentUser?.fullName || 
                     'Unknown'}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">On:</span>
                  <span className="info-value">
                    {formatDate(latestVersion.createdAt || latestVersion.uploadedAt)}
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
                    {latestVersion.files && latestVersion.files.length > 0 ? (
                      <div className="space-y-1">
                        {latestVersion.files.map((file, index) => {
                          const fileName = typeof file === 'string' ? file.split('/').pop() : file.filename || `File ${index + 1}`;
                          const fileUrl = typeof file === 'string' ? file : file.url;
                          return (
                            <div key={index} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {getFileTypeIcon(fileName)}
                                <span className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer truncate">
                                  {fileName}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {file.size && (
                                  <span className="text-xs text-gray-500">
                                    {formatFileSize(file.size)}
                                  </span>
                                )}
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
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      latestVersion.fileUrls && latestVersion.fileUrls.length > 0 ? (
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
                      ) : 'No files'
                    )}
                  </span>
                </div>
                
                {/* Version Comments */}
                <div className="mt-4">
                  {latestVersion.comments && latestVersion.comments.length > 0 && (
                    <div className="mb-3 space-y-2 max-h-32 overflow-y-auto">
                      {latestVersion.comments.slice(-3).map((comment, index) => (
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

      {/* Upload New Version */}
      <div className="info-section">
        <div className="info-card bg-blue-50">
          <div className="info-card-header flex-between">
            <span className="card-title">Upload New Version</span>
            <div className="flex gap-2">
              <CanValidateFiles>
                {uploadData.files.length > 0 && (
                  <button 
                    className="btn btn-outline btn-sm"
                    onClick={handleValidateFiles}
                    disabled={isValidating || isUploadingFiles}
                  >
                    {isValidating ? 'Validating...' : isUploadingFiles ? 'Uploading...' : 'Validate Files'}
                  </button>
                )}
              </CanValidateFiles>
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
                    <div className="text-sm text-purple-700">
                      Ready to upload {uploadData.files.length} file{uploadData.files.length !== 1 ? 's' : ''} 
                      {uploadData.remarks && ` with remarks: "${uploadData.remarks}"`}
                      <br />
                      {filesReadyForUpload ? (
                        <span className="text-green-700 font-medium">✓ Files validated and ready for version creation</span>
                      ) : (
                        <span className="text-orange-700">⚠ Please validate files before creating version</span>
                      )}
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
                  className={`btn w-full ${
                    filesReadyForUpload ? 'btn-primary' : 'btn-secondary'
                  }`}
                  onClick={handleFileUpload}
                  disabled={isUploadingVersion || !filesReadyForUpload}
                >
                  {isUploadingVersion ? 'Creating Version...' : 
                   filesReadyForUpload ? 'Create Version' : 'Validate Files First'}
                </button>

                {/* Upload Instructions */}
                <div className="mt-3 text-xs text-gray-500">
                  <p className="mb-1">• Supported formats: PDF, DOC, DOCX, JPG, PNG, GIF, MP4, AVI, MOV</p>
                  <p className="mb-1">• Maximum 5 files per version</p>
                  <p className="mb-1">• Maximum file size: 50MB per file</p> 
                  <p className="mb-1">• Step 1: Select files → Step 2: Validate → Step 3: Create version</p>
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

      {/* Version History */}
      {task?.versions && task.versions.length > 1 && (
        <div className="info-section">
          <div className="info-card">
            <div className="info-card-header">
              <span className="text-heading-4">Version History</span>
              <span className="text-sm text-gray-500">({task.versions.length} versions)</span>
            </div>
            <div className="card-body">
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {task.versions.slice(0, -1).reverse().map((version, index) => (
                  <div key={index} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-gray-900">
                          Version {version.version || version.versionNumber || `${task.versions.length - index - 1}.0`}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDate(version.createdAt || version.uploadedAt)}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600">
                        By: {version.uploadedBy?.fullName || 'Unknown'}
                      </div>
                      {version.remarks && (
                        <div className="text-xs text-gray-500 mt-1">
                          {version.remarks}
                        </div>
                      )}
                      {/* Show file types in history */}
                      {(version.files || version.fileUrls) && (
                        <div className="flex gap-1 mt-1">
                          {(version.files || version.fileUrls).slice(0, 3).map((file, fileIndex) => {
                            const fileName = typeof file === 'string' ? file.split('/').pop() : file.filename;
                            return (
                              <div key={fileIndex} className="inline-flex items-center">
                                {getFileTypeIcon(fileName)}
                              </div>
                            );
                          })}
                          {(version.files || version.fileUrls).length > 3 && (
                            <span className="text-xs text-gray-500">+{(version.files || version.fileUrls).length - 3} more</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {(version.files || version.fileUrls)?.length || 0} files
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VersionControl;