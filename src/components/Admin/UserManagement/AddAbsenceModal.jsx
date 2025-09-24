import React, { useState, useEffect } from 'react';
import { useGetUsersQuery } from '../../../redux/api/usersApi';
import { USER_ROLES } from '../../../utils/roles';

const AddAbsenceModal = ({ isOpen, onClose, onAddAbsence }) => {
  const [formData, setFormData] = useState({
    user: '',
    fromDate: '',
    toDate: '',
    reason: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get compliance users only
  const {
    data: usersData,
    isLoading: isLoadingUsers
  } = useGetUsersQuery({
    role: USER_ROLES.COMPLIANCE_USER,
    isActive: true,
    limit: 100 // Get all active compliance users
  });

  // Sample tasks for demo - in real app, this would come from tasks API
  const getSampleTasksForUser = (userId) => {
    const taskSets = {
      1: [
        { id: 1, title: 'Review Compliance Documents', status: 'In Progress', dueDate: '2025-01-30' },
        { id: 2, title: 'Update Policy Guidelines', status: 'Pending', dueDate: '2025-02-02' },
        { id: 3, title: 'Audit Report Preparation', status: 'Completed', dueDate: '2025-01-28' }
      ],
      2: [
        { id: 4, title: 'Code Review for Security', status: 'In Progress', dueDate: '2025-01-29' },
        { id: 5, title: 'Database Optimization', status: 'Pending', dueDate: '2025-02-05' }
      ],
      default: [
        { id: 6, title: 'General Compliance Review', status: 'In Progress', dueDate: '2025-01-31' }
      ]
    };
    return taskSets[userId] || taskSets.default;
  };

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        user: '',
        fromDate: '',
        toDate: '',
        reason: ''
      });
      setErrors({});
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'In Progress':
        return 'badge-status-process';
      case 'Pending':
        return 'badge-status-pending';
      case 'Completed':
        return 'badge-status-done';
      default:
        return 'badge-secondary';
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // User validation
    if (!formData.user) {
      newErrors.user = 'Please select a user';
    }

    // Date validations
    if (!formData.fromDate) {
      newErrors.fromDate = 'From date is required';
    }

    if (!formData.toDate) {
      newErrors.toDate = 'To date is required';
    }

    // Date range validation
    if (formData.fromDate && formData.toDate) {
      const fromDate = new Date(formData.fromDate);
      const toDate = new Date(formData.toDate);
      
      if (fromDate > toDate) {
        newErrors.toDate = 'To date must be after from date';
      }

      // Check if dates are in the past (optional business rule)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (fromDate < today) {
        newErrors.fromDate = 'From date cannot be in the past';
      }
    }

    return newErrors;
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSubmitting(true);
    
    try {
      await onAddAbsence({
        user: formData.user,
        fromDate: formData.fromDate,
        toDate: formData.toDate,
        reason: formData.reason.trim() || 'No reason provided'
      });
    } catch (error) {
      console.error('Failed to add absence:', error);
      setErrors({
        submit: error.message || 'Failed to add absence. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const complianceUsers = usersData?.users || [];
  const selectedUserTasks = formData.user ? getSampleTasksForUser(formData.user) : [];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="text-lg font-semibold text-gray-900">Add Absence Entry</h3>
          <button 
            className="text-gray-400 hover:text-gray-600"
            onClick={onClose}
            disabled={isSubmitting}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Submit Error */}
            {errors.submit && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-700">{errors.submit}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left Column - Form Fields */}
              <div className="space-y-4">
                {/* User Selection */}
                <div>
                  <label className="exchange-form-label">
                    Compliance User *
                  </label>
                  {isLoadingUsers ? (
                    <div className="exchange-form-select opacity-50">
                      Loading users...
                    </div>
                  ) : (
                    <select 
                      className={`exchange-form-select ${errors.user ? 'border-red-300 focus:border-red-500' : ''}`}
                      value={formData.user}
                      onChange={(e) => handleInputChange('user', e.target.value)}
                      disabled={isSubmitting}
                    >
                      <option value="">Select a user</option>
                      {complianceUsers.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.fullName} ({user.email})
                        </option>
                      ))}
                    </select>
                  )}
                  {errors.user && (
                    <p className="mt-1 text-sm text-red-600">{errors.user}</p>
                  )}
                </div>

                {/* From Date */}
                <div>
                  <label className="exchange-form-label">
                    From Date *
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      className={`exchange-date-input ${errors.fromDate ? 'border-red-300 focus:border-red-500' : ''}`}
                      value={formData.fromDate}
                      onChange={(e) => handleInputChange('fromDate', e.target.value)}
                      disabled={isSubmitting}
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  {errors.fromDate && (
                    <p className="mt-1 text-sm text-red-600">{errors.fromDate}</p>
                  )}
                </div>

                {/* To Date */}
                <div>
                  <label className="exchange-form-label">
                    To Date *
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      className={`exchange-date-input ${errors.toDate ? 'border-red-300 focus:border-red-500' : ''}`}
                      value={formData.toDate}
                      onChange={(e) => handleInputChange('toDate', e.target.value)}
                      disabled={isSubmitting}
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  {errors.toDate && (
                    <p className="mt-1 text-sm text-red-600">{errors.toDate}</p>
                  )}
                </div>

                {/* Reason */}
                <div>
                  <label className="exchange-form-label">
                    Reason (Optional)
                  </label>
                  <textarea
                    className="input resize-none min-h-[80px]"
                    placeholder="Brief reason for absence"
                    value={formData.reason}
                    onChange={(e) => handleInputChange('reason', e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* Right Column - Assigned Tasks */}
              <div>
                <label className="exchange-form-label">
                  Assigned Tasks
                </label>
                <div className="bg-gray-50 rounded-lg p-4 min-h-[200px] max-h-[300px] overflow-y-auto">
                  {formData.user ? (
                    selectedUserTasks.length > 0 ? (
                      <div className="space-y-3">
                        {selectedUserTasks.map(task => (
                          <div key={task.id} className="bg-white rounded-lg p-3 border border-gray-200">
                            <div className="flex-between items-start mb-2">
                              <h4 className="font-medium text-sm text-gray-900 line-clamp-2">
                                {task.title}
                              </h4>
                              <span className={`badge ${getStatusBadgeClass(task.status)}`}>
                                {task.status}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                              </svg>
                              <span>Due: {task.dueDate}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                        </svg>
                        <p className="text-sm text-gray-500">No tasks assigned to this user</p>
                      </div>
                    )
                  ) : (
                    <div className="text-center py-8">
                      <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                      </svg>
                      <p className="text-sm text-gray-500">Select a user to view assigned tasks</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button 
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting || !formData.user || !formData.fromDate || !formData.toDate}
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Adding...
                </>
              ) : (
                'Add Absence'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddAbsenceModal;