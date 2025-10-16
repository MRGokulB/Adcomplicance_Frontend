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

  const [uploadData, setUploadData] = useState({
    files: [],
    remarks: '',
    comment: '',
    s3Urls: []
  });
  
  const [versionComment, setVersionComment] = useState('');
  const [previewMode, setPreviewMode] = useState(false);
  const [validationResults, setValidationResults] = useState(null);
  const [showValidationResults, setShowValidationResults] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
const [uploadStatus, setUploadStatus] = useState('');
  const selectedVersionRef = useRef(null);

  const [uploadVersionTrigger, uploadVersionResult] = useUploadVersionMutation();
  
  const [addComment, { isLoading: isAddingComment }] = useAddCommentMutation();
  const [uploadFiles, { isLoading: isUploadingFiles }] = useUploadFilesMutation();
  const [validateUrls, { isLoading: isValidating }] = useValidateUrlsMutation();

  const isUploadingVersion = uploadVersionResult.isLoading;

  const latestVersion = task?.currentVersion || null;


  const canUserUploadVersion = () => {
    if (!permissions.canUploadVersion) return false;

    if (permissions.isProductUser) {
      const canActOnTask = task.createdBy === currentUser?.id ||
        task.assignedProductIds?.includes(currentUser?.id) ||
        (task.assignedProducts && task.assignedProducts.some(user =>
          typeof user === 'object' ? user.id === currentUser?.id : false
        ));

      return canActOnTask && ['OPEN', 'PRODUCT_REVIEW'].includes(task.status);
    }

    if (permissions.isAdmin) return true;

    return false;
  };

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
          message: 'now manually update status to Compliance Review',
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

    if (files.length > 5) {
      alert('Maximum 5 files allowed per version');
      return;
    }

    setUploadData(prev => ({
      ...prev,
      files: files,
      s3Urls: []
    }));

    setValidationResults(null);
    setShowValidationResults(false);

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

  const handleValidateFiles = async (filesToValidate = null) => {
  const files = filesToValidate || uploadData.files;

  try {
    setUploadStatus('uploading');
    setUploadProgress(10);

    const formData = new FormData();
    files.forEach((file) => {
      formData.append("files", file);
    });

    const totalSize = files.reduce((acc, file) => acc + file.size, 0);
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev < 70) return prev + 5;
        return prev;
      });
    }, 500);

    const uploadRes = await uploadFiles(formData).unwrap();
    
    clearInterval(progressInterval);
    setUploadProgress(75);

    if (!uploadRes.files || uploadRes.files.length === 0) {
      throw new Error('No files were uploaded successfully');
    }

    const s3Urls = uploadRes.files.map(f => f.url);

    setUploadStatus('validating');
    setUploadProgress(85);
    
    const validationRes = await validateUrls(s3Urls).unwrap();
    
    setUploadProgress(100);

    setValidationResults(validationRes);
    setShowValidationResults(true);

    setUploadData(prev => ({
      ...prev,
      s3Urls: s3Urls,
      uploadedFiles: uploadRes.files
    }));

    setTimeout(() => {
      setUploadStatus('');
      setUploadProgress(0);
    }, 500);

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

    setUploadData(prev => ({ ...prev, s3Urls: [] }));
    return false;
  } finally {
    setUploadStatus('');
    setUploadProgress(0);
  }
};

  const handleFileUpload = async () => {

    try {
      if (!canUserUploadVersion()) {
        alert("You do not have permission to upload versions at this time");
        return;
      }

      if (!uploadData.files || uploadData.files.length === 0) {
        alert("Please select files before creating a version.");
        return;
      }

      if (!uploadData.s3Urls || uploadData.s3Urls.length === 0 ||
        !validationResults || validationResults.invalid > 0) {
        const validationSuccess = await handleValidateFiles();
        if (!validationSuccess) {
          alert("File validation failed. Please check your files and try again.");
          return;
        }
      }

      const versionPayload = {
        id: task.id,
        files: uploadData.s3Urls,
        remarks: uploadData.remarks?.trim() || `New version with ${uploadData.s3Urls.length} file(s)`
      };

      const result = await uploadVersionTrigger(versionPayload).unwrap();
      const guidance = getUploadGuidance();
      alert(`Version uploaded successfully! ${guidance.message}`);

      setUploadData({
  files: [],
  remarks: '',
  comment: '',
  s3Urls: []
});
setValidationResults(null);
setShowValidationResults(false);
setPreviewMode(false);
setUploadProgress(0);
setUploadStatus('');
if (fileInputRef.current) {
  fileInputRef.current.value = '';
}

      onRefresh?.();

    } catch (error) {
      console.error("Version upload failed:", error);
      const errorMessage = error?.data?.message || error?.message || 'Failed to create version';
      alert(`Version upload failed: ${errorMessage}`);
    }
  };


  const handleViewFile = (fileUrl, fileName = '') => {
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

  const handleViewVersion = (version) => {
    setSelectedVersion(version);

    setTimeout(() => {
      if (selectedVersionRef.current) {
        selectedVersionRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
          inline: 'nearest'
        });
      }
    }, 100);
  };

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
  const formatDateForDisplay = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'APPROVED': return 'bg-green-100 text-green-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status) => {
    const statusMap = {
      'NOT_SENT': 'Not Sent',
      'PENDING': 'Pending',
      'APPROVED': 'Approved',
      'REJECTED': 'Rejected'
    };
    return statusMap[status] || status;
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
  };

  const uploadGuidance = getUploadGuidance();
  const canUpload = canUserUploadVersion();

  const filesReadyForUpload = uploadData.s3Urls.length > 0 &&
    validationResults &&
    (validationResults.valid === true ||
      (typeof validationResults.valid === 'number' && validationResults.valid > 0)) &&
    validationResults.invalid === 0;

  return (
    <div>
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
                    ) : (
                      'No files'
                    )}
                  </span>
                </div>

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
                  ) : (
                    'No files'
                  )}
                </span>
              </div>

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

                  <div className="bg-white rounded-lg overflow-x-auto">
                    <table className="exchange-table w-full">
                      <thead className="exchange-table-header">
                        <tr>
                          <th>Exchange</th>
                          <th>Status</th>
                          <th>Approval Date</th>
                          <th>Expiry Date</th>
                          <th>Reference No.</th>
                          <th>Approval Email</th>
                          <th>Updated By</th>
                        </tr>
                      </thead>
                      <tbody className="exchange-table-body">
                        {selectedVersion.exchangeApprovals.map((approval, index) => (
                          <tr key={approval.id || index}>
                            <td className="font-medium text-gray-900">{approval.exchangeName}</td>
                            <td>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(approval.approvalStatus)}`}>
                                {getStatusLabel(approval.approvalStatus)}
                              </span>
                            </td>
                            <td>
                              <span className="text-sm text-gray-600">
                                {formatDateForDisplay(approval.approvalDate)}
                              </span>
                            </td>
                            <td>
                              <span className="text-sm text-gray-600">
                                {formatDateForDisplay(approval.expiryDate)}
                              </span>
                            </td>
                            <td>
                              <span className="text-sm text-gray-600">
                                {approval.referenceNumber || '—'}
                              </span>
                            </td>
                            <td>
                              <div className="space-y-2">
                                {approval.approvalEmailUrl ? (
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
                                ) : (
                                  <span className="text-sm text-gray-500 italic">No file uploaded</span>
                                )}
                              </div>
                            </td>
                            <td className="text-sm text-gray-600">
                              {approval.updatedBy?.fullName ||
                                approval.submittedBy?.fullName ||
                                approval.submittedBy ||
                                '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
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

      <div className="info-section">
        <div className="info-card bg-blue-50 relative overflow-hidden">
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
  {uploadStatus && (
    <div className="absolute inset-0 bg-white bg-opacity-98 flex flex-col items-center justify-center z-20 rounded-lg">
      <div className="relative mb-6">
        <svg className="w-20 h-20 animate-spin text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-blue-600">{uploadProgress}%</span>
        </div>
      </div>
      
      <div className="text-center max-w-md px-4">
        <p className="text-xl font-semibold text-gray-800 mb-2">
          {uploadStatus === 'uploading' ? 'Uploading Files' : 'Validating Files'}
        </p>
        <p className="text-sm text-gray-600 mb-4">
          {uploadStatus === 'uploading' 
            ? 'This may take a few minutes for large files. Please do not close this window.' 
            : 'Running file validation checks...'}
        </p>
        
        <div className="w-80 bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
          <div 
            className="bg-gradient-to-r from-blue-400 to-blue-600 h-3 rounded-full transition-all duration-500 ease-out relative overflow-hidden"
            style={{ width: `${uploadProgress}%` }}
          >
            <div className="absolute inset-0 bg-white opacity-30 animate-pulse"></div>
          </div>
        </div>
        
        {uploadStatus === 'uploading' && uploadData.files.length > 0 && (
          <div className="mt-4 text-xs text-gray-500">
            <p>Uploading {uploadData.files.length} file{uploadData.files.length !== 1 ? 's' : ''}</p>
            <p className="mt-1">
              Total size: {formatFileSize(uploadData.files.reduce((acc, f) => acc + f.size, 0))}
            </p>
          </div>
        )}
      </div>

      <div className="mt-6 flex items-center gap-2 text-blue-600">
        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
      </div>
    </div>
  )}

  {canUpload ? (
              <>
                <input
  type="file"
  className="mb-3 w-full"
  ref={fileInputRef}
  multiple
  onChange={handleFileChange}
  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.bmp,.svg,.mp3,.mp4,.avi,image/*,video/*,.mov,.webm,.mkv,.csv,.txt,.eml,.msg,.excel,.csv"
  disabled={isUploadingVersion || isValidating}
/>

{uploadData.files.length > 0 && (
  <div className="mb-3 p-3 bg-gray-50 rounded-lg">
    <div className="text-sm text-gray-600 mb-2">
      {uploadData.files.length} file(s) selected:
    </div>
    <div className="space-y-2 max-h-32 overflow-y-auto">
      {uploadData.files.map((file, index) => (
        <div key={index} className="flex items-center gap-2 text-xs bg-white p-2 rounded border">
          {getFileTypeIcon(file.name)}
          <div className="flex-1 min-w-0">
            <div className="font-medium text-gray-900 truncate">{file.name}</div>
            <div className="text-gray-500">
              {formatFileSize(file.size)} • {file.type || 'Unknown type'}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              const newFiles = uploadData.files.filter((_, i) => i !== index);
              setUploadData(prev => ({
                ...prev,
                files: newFiles,
                s3Urls: []
              }));
              setValidationResults(null);
              setShowValidationResults(false);
              if (fileInputRef.current && newFiles.length === 0) {
                fileInputRef.current.value = '';
              }
            }}
            className="text-red-500 hover:text-red-700 p-1"
            disabled={isUploadingVersion || isValidating}
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

                {showValidationResults && validationResults && (
                  <div className={`mb-3 p-3 border rounded ${(validationResults.valid === true ||
                      (typeof validationResults.valid === 'number' && validationResults.valid > 0 && validationResults.invalid === 0))
                      ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                    }`}>

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
                                    `${result.metadata.contentType || 'Unknown type'} (${result.metadata.size ? formatFileSize(result.metadata.size) : 'Unknown size'
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

                {previewMode && uploadData.files.length > 0 && (
                  <div className="mb-3 p-3 bg-purple-50 border border-purple-200 rounded">
                    <div className="text-sm font-medium text-purple-800 mb-2">Preview Mode</div>
                    <div className="text-sm text-purple-700 space-y-1">
                      <div>Ready to upload {uploadData.files.length} file{uploadData.files.length !== 1 ? 's' : ''}</div>
                      {uploadData.remarks && (
                        <div>Remarks: "{uploadData.remarks}"</div>
                      )}

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

                <div className="mt-3 text-xs text-gray-500">
                  <p className="mb-1">• Supported formats: PDF, Word (DOC/DOCX), Excel (XLS/XLSX), PowerPoint (PPT/PPTX), Images (JPG/PNG/GIF/SVG), Videos (MP4/AVI/MOV), Text files</p>
                  <p className="mb-1">• Maximum 5 files per version</p>
                  <p className="mb-1">• Maximum file size: 200MB per file</p>
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