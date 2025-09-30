// src/components/Tasks/NewTask.jsx - OPTIMIZED VERSION
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { selectCurrentUser, selectUserRole } from '../../redux/slices/authSlice';
import { useCreateTaskMutation } from '../../redux/api/tasksApi';
import { useGetUsersQuery } from '../../redux/api/usersApi';
import { useUploadFilesMutation } from '../../redux/api/uploadApi';
import { hasPermission, PERMISSIONS, USER_ROLES } from '../../utils/roles';

// OPTIMIZED: Validation function memoized outside component
const validateFormField = (field, value, allValues) => {
  switch (field) {
    case 'title':
      if (!value.trim()) return 'Task title is required';
      if (value.length > 200) return 'Title must be less than 200 characters';
      return null;
    case 'description':
      if (!value.trim()) return 'Description is required';
      if (value.length > 1000) return 'Description must be less than 1000 characters';
      return null;
    case 'category':
      if (!value.trim()) return 'Product category is required';
      return null;
    case 'platform':
      if (!value.trim()) return 'Platform is required';
      return null;
    case 'assignedProductIds':
      if (!value || value.length === 0) return 'At least one product user must be assigned';
      return null;
    case 'selectedFiles':
      if (value && value.length > 5) return 'Maximum 5 files allowed';
      return null;
    default:
      return null;
  }
};

export default function CreateNewAdTask({ onClose, onSuccess }) {
  const currentUser = useSelector(selectCurrentUser);
  const currentUserRole = useSelector(selectUserRole);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    platform: '', 
    assignedProductIds: [],
    selectedFiles: [],
    remarks: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [taskCreationStatus, setTaskCreationStatus] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);

  // API hooks
  const [createTask] = useCreateTaskMutation();
  const [uploadFiles, { isLoading: isUploading }] = useUploadFilesMutation();
  
  // OPTIMIZED: Memoized user query parameters
  const userQueryParams = useMemo(() => ({
    isActive: true,
    limit: 100
  }), []);

  const { data: allUsersData } = useGetUsersQuery(userQueryParams);

  // Permission check
  const canCreateTasks = hasPermission(currentUserRole, PERMISSIONS.TASK_CREATE);

  // OPTIMIZED: Memoized product users filter
  const productUsers = useMemo(() => {
    if (!allUsersData?.users) return [];
    return allUsersData.users.filter(user => 
      user.role === USER_ROLES.PRODUCT_USER || user.role === USER_ROLES.PRODUCT_ADMIN
    );
  }, [allUsersData]);

  // OPTIMIZED: Auto-assign current user only once on mount
  useEffect(() => {
    if (currentUser && 
        (currentUser.role === USER_ROLES.PRODUCT_USER || currentUser.role === USER_ROLES.PRODUCT_ADMIN) &&
        formData.assignedProductIds.length === 0) {
      setFormData(prev => ({
        ...prev,
        assignedProductIds: [currentUser.id]
      }));
    }
  }, []); // Empty deps - only run once on mount

  useEffect(() => {
    if (!canCreateTasks) {
      onClose();
    }
  }, [canCreateTasks, onClose]);

  // OPTIMIZED: Validate all fields at once
  const validateForm = useCallback(() => {
    const newErrors = {};
    
    Object.keys(formData).forEach(field => {
      if (field === 'remarks') return; // Optional field
      const error = validateFormField(field, formData[field], formData);
      if (error) newErrors[field] = error;
    });

    return newErrors;
  }, [formData]);

  // OPTIMIZED: Debounced field validation
  const handleInputChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error immediately when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  }, [errors]);

  // OPTIMIZED: Memoized handlers
  const handleUserSelect = useCallback((userId) => {
    setFormData(prev => {
      if (prev.assignedProductIds.includes(userId)) {
        return prev;
      }
      return {
        ...prev,
        assignedProductIds: [...prev.assignedProductIds, userId]
      };
    });
    setShowUserDropdown(false);
    
    if (errors.assignedProductIds) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.assignedProductIds;
        return newErrors;
      });
    }
  }, [errors.assignedProductIds]);

  const removeUser = useCallback((userIdToRemove) => {
    setFormData(prev => ({
      ...prev,
      assignedProductIds: prev.assignedProductIds.filter(id => id !== userIdToRemove)
    }));
  }, []);

  // OPTIMIZED: File validation with better error handling
  const handleFileChange = useCallback((e) => {
    const files = Array.from(e.target.files);
    
    const validTypes = ['image/', 'video/', 'application/pdf', 'application/msword', 
                       'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                       'application/vnd.ms-powerpoint', 
                       'application/vnd.openxmlformats-officedocument.presentationml.presentation'];
    
    const validFiles = files.filter(file => {
      const isValidType = validTypes.some(type => file.type.startsWith(type));
      const isValidSize = file.size <= 50 * 1024 * 1024; // 50MB
      return isValidType && isValidSize;
    });

    if (validFiles.length !== files.length) {
      setErrors(prev => ({
        ...prev,
        selectedFiles: 'Some files were rejected. Only images, videos, PDF, Word, and PowerPoint files under 50MB are allowed.'
      }));
    } else if (errors.selectedFiles) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.selectedFiles;
        return newErrors;
      });
    }

    setFormData(prev => ({ ...prev, selectedFiles: validFiles }));
  }, [errors.selectedFiles]);

  const handleCancel = useCallback(() => {
    setFormData({
      title: '',
      description: '',
      category: '',
      platform: '',
      assignedProductIds: [],
      selectedFiles: [],
      remarks: ''
    });
    setErrors({});
    setTaskCreationStatus(null);
    setUploadedFiles([]);
    onClose();
  }, [onClose]);

  // OPTIMIZED: Streamlined task creation
  const handleCreateTask = useCallback(async () => {
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    setTaskCreationStatus({ status: 'uploading', message: 'Preparing task creation...' });

    try {
      let fileUrls = [];
      let uploadedFileDetails = [];
      
      // Upload files if any
      if (formData.selectedFiles.length > 0) {
        setTaskCreationStatus({ status: 'uploading', message: 'Uploading files...' });
        
        const fileFormData = new FormData();
        formData.selectedFiles.forEach(file => {
          fileFormData.append('files', file);
        });

        const uploadResult = await uploadFiles(fileFormData).unwrap();
        
        if (uploadResult.files && uploadResult.files.length > 0) {
          fileUrls = uploadResult.files.map(file => file.url);
          uploadedFileDetails = uploadResult.files;
          setUploadedFiles(uploadResult.files);
        }
      }

      setTaskCreationStatus({ status: 'creating', message: 'Creating task...' });

      // Create task with uploaded file URLs
      const taskData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        assignedProductIds: formData.assignedProductIds,
        platform: formData.platform.trim(),
        category: formData.category.trim(),
        remarks: formData.remarks.trim(),
        priority: 'LOW',
        files: fileUrls
      };

      const result = await createTask(taskData).unwrap();
      
      setTaskCreationStatus({ 
        status: 'success', 
        message: result.message || 'Task created successfully!',
        data: result.data,
        nextSteps: result.nextSteps,
        fileCount: fileUrls.length
      });

      if (onSuccess) {
        onSuccess({
          ...result,
          uploadedFiles: uploadedFileDetails
        });
      }

      // Auto-close after showing success
      setTimeout(() => {
        onClose();
      }, 3000);
      
    } catch (error) {
      console.error('Failed to create task:', error);
      setTaskCreationStatus(null);
      
      let errorMessage = 'Failed to create task. Please try again.';
      if (error?.data?.message) {
        errorMessage = error.data.message;
      } else if (error?.data?.errors) {
        const backendErrors = error.data.errors;
        if (Array.isArray(backendErrors)) {
          errorMessage = backendErrors.map(err => err.message).join(', ');
        } else if (typeof backendErrors === 'object') {
          setErrors(backendErrors);
          return;
        }
      } else if (error?.error) {
        errorMessage = 'Network error occurred. Please check your connection.';
      }
      
      setErrors({ submit: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validateForm, uploadFiles, createTask, onSuccess, onClose]);

  // OPTIMIZED: Memoized user lookup
  const getUserName = useCallback((userId) => {
    const user = productUsers.find(u => u.id === userId);
    return user ? user.fullName : 'Unknown User';
  }, [productUsers]);

  const getUserDetails = useCallback((userId) => {
    return productUsers.find(u => u.id === userId) || null;
  }, [productUsers]);

  // OPTIMIZED: Memoized available users for dropdown
  const availableUsers = useMemo(() => {
    return productUsers.filter(user => !formData.assignedProductIds.includes(user.id));
  }, [productUsers, formData.assignedProductIds]);

  if (!canCreateTasks) {
    return null;
  }

  return (
    <div className="modal-overlay">
      <div className="modal max-w-4xl">
        <div className="modal-header">
          <h2 className="text-heading-3">Create New Ad Task</h2>
          <button 
            className="text-gray-400 hover:text-gray-600"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="modal-body">
          {/* Task Creation Status */}
          {taskCreationStatus && (
            <div className={`mb-4 p-4 rounded-md ${
              taskCreationStatus.status === 'success' ? 'bg-green-50 border border-green-200' : 'bg-blue-50 border border-blue-200'
            }`}>
              <div className="flex items-start">
                {taskCreationStatus.status === 'success' ? (
                  <svg className="w-5 h-5 text-green-400 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="animate-spin w-5 h-5 text-blue-400 mr-3 mt-0.5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                <div className="flex-1">
                  <h4 className={`text-sm font-medium ${
                    taskCreationStatus.status === 'success' ? 'text-green-800' : 'text-blue-800'
                  }`}>
                    {taskCreationStatus.status === 'success' ? 'Task Created Successfully!' : 'Processing...'}
                  </h4>
                  <p className={`text-sm mt-1 ${
                    taskCreationStatus.status === 'success' ? 'text-green-700' : 'text-blue-700'
                  }`}>
                    {taskCreationStatus.message}
                  </p>
                  {taskCreationStatus.data?.uin && (
                    <p className="text-sm mt-1 font-medium text-gray-900">
                      Task UIN: {taskCreationStatus.data.uin}
                    </p>
                  )}
                  {taskCreationStatus.nextSteps && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-gray-800">Next Steps:</p>
                      <ul className="text-xs text-gray-700 list-disc list-inside mt-1">
                        {taskCreationStatus.nextSteps.map((step, index) => (
                          <li key={index}>{step}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Submit Error */}
          {errors.submit && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">{errors.submit}</p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Task Information</h3>
              
              {/* Task Title */}
              <div>
                <label className="exchange-form-label">Task Title *</label>
                <input
                  type="text"
                  className={`input ${errors.title ? 'border-red-300 focus:border-red-500' : ''}`}
                  placeholder="Enter task title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  disabled={isSubmitting}
                  maxLength={200}
                />
                <div className="flex justify-between items-center mt-1">
                  {errors.title && (
                    <p className="text-sm text-red-600">{errors.title}</p>
                  )}
                  <span className="text-xs text-gray-500 ml-auto">
                    {formData.title.length}/200
                  </span>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="exchange-form-label">Description *</label>
                <textarea
                  className={`input resize-none ${errors.description ? 'border-red-300 focus:border-red-500' : ''}`}
                  rows="4"
                  placeholder="Describe the task details"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  disabled={isSubmitting}
                  maxLength={1000}
                />
                <div className="flex justify-between items-center mt-1">
                  {errors.description && (
                    <p className="text-sm text-red-600">{errors.description}</p>
                  )}
                  <span className="text-xs text-gray-500 ml-auto">
                    {formData.description.length}/1000
                  </span>
                </div>
              </div>

              {/* Product Category */}
              <div>
                <label className="exchange-form-label">Product Category *</label>
                <input
                  type="text"
                  className={`input ${errors.category ? 'border-red-300 focus:border-red-500' : ''}`}
                  placeholder="e.g., Mutual Funds, Insurance, Banking"
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  disabled={isSubmitting}
                />
                {errors.category && (
                  <p className="mt-1 text-sm text-red-600">{errors.category}</p>
                )}
              </div>

              {/* Platform */}
              <div>
                <label className="exchange-form-label">Platform *</label>
                <input
                  type="text"
                  className={`input ${errors.platform ? 'border-red-300 focus:border-red-500' : ''}`}
                  placeholder="e.g., Facebook, Instagram, Website, Print"
                  value={formData.platform}
                  onChange={(e) => handleInputChange('platform', e.target.value)}
                  disabled={isSubmitting}
                />
                {errors.platform && (
                  <p className="mt-1 text-sm text-red-600">{errors.platform}</p>
                )}
              </div>

              {/* Remarks */}
              <div>
                <label className="exchange-form-label">Remarks (Optional)</label>
                <textarea
                  className="input resize-none"
                  rows="3"
                  placeholder="Any additional notes or requirements"
                  value={formData.remarks}
                  onChange={(e) => handleInputChange('remarks', e.target.value)}
                  disabled={isSubmitting}
                  maxLength={500}
                />
                <span className="text-xs text-gray-500">
                  {formData.remarks.length}/500
                </span>
              </div>
            </div>

            {/* Right Column - Assignments and Files */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Assignments & Files</h3>
              
              {/* Assign Product Users */}
              <div>
                <label className="exchange-form-label">
                  Assign Product Users *
                </label>
                
                {/* Selected Users */}
                {formData.assignedProductIds.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {formData.assignedProductIds.map((userId) => {
                      const user = getUserDetails(userId);
                      return (
                        <span key={userId} className="badge badge-primary flex items-center gap-1">
                          <div className="w-4 h-4 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                            <span className="text-xs font-medium">
                              {user?.fullName?.charAt(0) || 'U'}
                            </span>
                          </div>
                          {user?.fullName || 'Unknown User'}
                          <button
                            type="button"
                            onClick={() => removeUser(userId)}
                            className="text-blue-200 hover:text-white ml-1"
                            disabled={isSubmitting}
                          >
                            ×
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* User Selector */}
                <div className="relative">
                  <button
                    type="button"
                    className={`input text-left flex-between cursor-pointer ${
                      errors.assignedProductIds ? 'border-red-300' : ''
                    }`}
                    onClick={() => setShowUserDropdown(!showUserDropdown)}
                    disabled={isSubmitting}
                  >
                    <span className="text-gray-500">Select product users...</span>
                    <span className="text-gray-400">▼</span>
                  </button>
                  
                  {showUserDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                      {availableUsers.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm flex items-center gap-2"
                          onClick={() => handleUserSelect(user.id)}
                        >
                          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-xs font-medium text-blue-700">
                              {user.fullName?.charAt(0) || 'U'}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium">{user.fullName}</div>
                            <div className="text-xs text-gray-500">
                              {user.email} • {user.role === USER_ROLES.PRODUCT_ADMIN ? 'Product Admin' : 'Product User'}
                            </div>
                          </div>
                          {user.id === currentUser?.id && (
                            <span className="ml-auto text-xs text-blue-600 font-medium">(You)</span>
                          )}
                        </button>
                      ))}
                      {availableUsers.length === 0 && (
                        <div className="px-3 py-2 text-sm text-gray-500">
                          {productUsers.length === 0 ? 'No product users found' : 'No more users available'}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {errors.assignedProductIds && (
                  <p className="mt-1 text-sm text-red-600">{errors.assignedProductIds}</p>
                )}
              </div>

              {/* Upload Files */}
              <div>
                <label className="exchange-form-label">
                  Upload Files (Optional - Max 5 files, 50MB each)
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*,.pdf,.doc,.docx,.ppt,.pptx"
                  onChange={handleFileChange}
                  className={`input ${errors.selectedFiles ? 'border-red-300 focus:border-red-500' : ''}`}
                  style={{ padding: '8px' }}
                  disabled={isSubmitting || isUploading}
                />
                {formData.selectedFiles.length > 0 && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-600 mb-2">
                      {formData.selectedFiles.length} file(s) selected:
                    </div>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {Array.from(formData.selectedFiles).map((file, index) => (
                        <div key={index} className="flex items-center gap-2 text-xs bg-white p-2 rounded border">
                          <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 truncate">{file.name}</div>
                            <div className="text-gray-500">
                              {(file.size / 1024 / 1024).toFixed(2)} MB • {file.type || 'Unknown type'}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const newFiles = Array.from(formData.selectedFiles).filter((_, i) => i !== index);
                              setFormData(prev => ({ ...prev, selectedFiles: newFiles }));
                            }}
                            className="text-red-500 hover:text-red-700 p-1"
                            disabled={isSubmitting}
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
                {errors.selectedFiles && (
                  <p className="mt-1 text-sm text-red-600">{errors.selectedFiles}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Supported formats: Images, Videos, PDF, Word, PowerPoint
                </p>
              </div>

              {/* Uploaded Files Display */}
              {uploadedFiles.length > 0 && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="text-sm font-medium text-green-800 mb-2">
                    Files uploaded successfully:
                  </div>
                  <div className="space-y-1">
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="flex items-center gap-2 text-xs text-green-700">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span>{file.originalName}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button 
            className="btn btn-secondary"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button 
            className="btn btn-primary"
            onClick={handleCreateTask}
            disabled={isSubmitting || taskCreationStatus?.status === 'success'}
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {isUploading ? 'Uploading...' : 'Creating...'}
              </>
            ) : taskCreationStatus?.status === 'success' ? (
              'Task Created!'
            ) : (
              'Create Task'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}