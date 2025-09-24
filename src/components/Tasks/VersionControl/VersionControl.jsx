// src/components/Tasks/VersionControl/VersionControl.jsx - Manual status workflow only
import React, { useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import { selectUserRole, selectCurrentUser } from '../../../redux/slices/authSlice';
import { 
  useUploadVersionMutation,
  useAddCommentMutation,
  useValidateFilesMutation
} from '../../../redux/api/tasksApi';
import { 
  useUploadFileMutation,
  useUploadFilesMutation 
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
    comment: ''
  });
  const [versionComment, setVersionComment] = useState('');
  const [previewMode, setPreviewMode] = useState(false);
  const [validationResults, setValidationResults] = useState(null);
  const [showValidationResults, setShowValidationResults] = useState(false);

  // API mutations
  const [uploadVersion, { isLoading: isUploadingVersion }] = useUploadVersionMutation();
  const [addComment, { isLoading: isAddingComment }] = useAddCommentMutation();
  const [uploadFiles, { isLoading: isUploadingFiles }] = useUploadFilesMutation();
  const [validateFiles, { isLoading: isValidating }] = useValidateFilesMutation();

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
      files: files
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

  const handleValidateFiles = async () => {
    if (uploadData.files.length === 0) {
      alert('Please select files to validate');
      return;
    }

    try {
      // Convert files to URLs for validation
      const fileUrls = uploadData.files.map(file => URL.createObjectURL(file));
      
      const result = await validateFiles(fileUrls).unwrap();
      setValidationResults(result);
      setShowValidationResults(true);
      
      // Clean up URLs
      fileUrls.forEach(url => URL.revokeObjectURL(url));

    } catch (error) {
      console.error('File validation failed:', error);
      setValidationResults({
        valid: false,
        message: error?.data?.message || 'Validation failed',
        errors: ['Validation service unavailable']
      });
      setShowValidationResults(true);
    }
  };

  // Version upload with NO automatic status change (per documentation)
  const handleFileUpload = async () => {
    if (!canUserUploadVersion()) {
      alert('You do not have permission to upload versions at this time');
      return;
    }

    if (uploadData.files.length === 0) {
      alert('Please select files to upload');
      return;
    }

    if (uploadData.files.length > 5) {
      alert('Maximum 5 files allowed per version');
      return;
    }

    // Pre-validation check if validation results exist and files are invalid
    if (validationResults && !validationResults.valid && !confirm('Files failed validation. Do you want to proceed anyway?')) {
      return;
    }

    try {
      // Step 1: Upload files to get URLs
      const formData = new FormData();
      uploadData.files.forEach(file => {
        formData.append('files', file);
      });

      const uploadResult = await uploadFiles(formData).unwrap();
      const fileUrls = uploadResult.files || uploadResult.urls || [];

      if (!fileUrls || fileUrls.length === 0) {
        throw new Error('No file URLs returned from upload');
      }

      // Step 2: Create version with file URLs (NO status change)
      const versionResult = await uploadVersion({
        id: task.id,
        files: fileUrls,
        remarks: uploadData.remarks || `Version upload by ${currentUser?.fullName || 'user'}`
      }).unwrap();

      // Show success message with manual status guidance
      const guidance = getUploadGuidance();
      alert(`Version uploaded successfully! ${guidance.message}`);

      // Clear form and refresh
      setUploadData({ files: [], remarks: '', comment: '' });
      setValidationResults(null);
      setShowValidationResults(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      onRefresh?.();

    } catch (error) {
      console.error('Failed to upload version:', error);
      
      let errorMessage = 'Failed to upload version.';
      if (error?.data?.message) {
        errorMessage += ` ${error.data.message}`;
      } else if (error?.message) {
        errorMessage += ` ${error.message}`;
      }
      errorMessage += ' Please try again.';
      
      alert(errorMessage);
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
                    disabled={isValidating}
                  >
                    {isValidating ? 'Validating...' : 'Validate Files'}
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
                    validationResults.valid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                  }`}>
                    <div className={`text-sm font-medium mb-2 ${
                      validationResults.valid ? 'text-green-800' : 'text-red-800'
                    }`}>
                      {validationResults.valid ? '✓ Files Validated Successfully' : '⚠ Validation Issues Found'}
                    </div>
                    <div className={`text-sm ${
                      validationResults.valid ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {validationResults.message || (
                        validationResults.valid 
                          ? `All ${uploadData.files.length} files passed validation` 
                          : 'Some files failed validation checks'
                      )}
                    </div>
                    {validationResults.errors && validationResults.errors.length > 0 && (
                      <ul className="text-sm text-red-600 mt-2 list-disc list-inside">
                        {validationResults.errors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
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
                  disabled={isUploadingVersion || isUploadingFiles || uploadData.files.length === 0}
                >
                  {isUploadingVersion || isUploadingFiles ? 'Uploading...' : 'Upload Version'}
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