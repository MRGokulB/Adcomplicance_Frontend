import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useGetUsersQuery, useGetAbsencesQuery } from '../../../redux/api/usersApi';
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
  const [overlapWarning, setOverlapWarning] = useState(null);

  const usersQueryParams = useMemo(() => ({
    role: USER_ROLES.COMPLIANCE_USER,
    isActive: true,
    limit: 100,
      includeWorkload: true
  }), []);

  const {
    data: usersData,
    isLoading: isLoadingUsers
  } = useGetUsersQuery(usersQueryParams, {
    skip: !isOpen,
    refetchOnMountOrArgChange: 600,
  });

  const {
    data: absencesData,
    isLoading: isLoadingAbsences
  } = useGetAbsencesQuery(
    { userId: formData.user, limit: 100 },
    {
      skip: !formData.user || !isOpen,
      refetchOnMountOrArgChange: 60,
    }
  );

  const complianceUsers = useMemo(() => 
    usersData?.users || [], 
    [usersData?.users]
  );

  const userAbsences = useMemo(() => {
    if (!absencesData) return [];
    return Array.isArray(absencesData) ? absencesData : (absencesData.absences || []);
  }, [absencesData]);

  const activeAbsences = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return userAbsences.filter(absence => {
      const fromDate = new Date(absence.fromDate);
      const toDate = new Date(absence.toDate);
      fromDate.setHours(0, 0, 0, 0);
      toDate.setHours(23, 59, 59, 999);
      
      return fromDate <= today && toDate >= today;
    });
  }, [userAbsences]);

  const upcomingAbsences = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return userAbsences.filter(absence => {
      const fromDate = new Date(absence.fromDate);
      fromDate.setHours(0, 0, 0, 0);
      return fromDate > today;
    }).sort((a, b) => new Date(a.fromDate) - new Date(b.fromDate));
  }, [userAbsences]);

  const checkDateOverlap = useCallback((newFromDate, newToDate) => {
    if (!newFromDate || !newToDate || !formData.user) return null;

    const newFrom = new Date(newFromDate);
    const newTo = new Date(newToDate);
    newFrom.setHours(0, 0, 0, 0);
    newTo.setHours(23, 59, 59, 999);

    const overlappingAbsences = userAbsences.filter(absence => {
      const existingFrom = new Date(absence.fromDate);
      const existingTo = new Date(absence.toDate);
      existingFrom.setHours(0, 0, 0, 0);
      existingTo.setHours(23, 59, 59, 999);

      return (
        (newFrom >= existingFrom && newFrom <= existingTo) ||
        (newTo >= existingFrom && newTo <= existingTo) ||
        (newFrom <= existingFrom && newTo >= existingTo)
      );
    });

    return overlappingAbsences.length > 0 ? overlappingAbsences : null;
  }, [userAbsences, formData.user]);

  useEffect(() => {
    if (formData.fromDate && formData.toDate && formData.user) {
      const overlaps = checkDateOverlap(formData.fromDate, formData.toDate);
      if (overlaps) {
        setOverlapWarning({
          count: overlaps.length,
          absences: overlaps
        });
      } else {
        setOverlapWarning(null);
      }
    } else {
      setOverlapWarning(null);
    }
  }, [formData.fromDate, formData.toDate, formData.user, checkDateOverlap]);

  const getSampleTasksForUser = useCallback((userId) => {
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
  }, []);

  const selectedUserTasks = useMemo(() => {
    if (!formData.user) return [];
    const allTasks = getSampleTasksForUser(formData.user);
    return allTasks.filter(task => task.status !== 'Completed');
  }, [formData.user, getSampleTasksForUser]);

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
      setOverlapWarning(null);
    }
  }, [isOpen]);

  const getStatusBadgeClass = useCallback((status) => {
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
  }, []);

  const validateForm = useCallback(() => {
    const newErrors = {};

    if (!formData.user) {
      newErrors.user = 'Please select a user';
    }

    if (!formData.fromDate) {
      newErrors.fromDate = 'From date is required';
    }

    if (!formData.toDate) {
      newErrors.toDate = 'To date is required';
    }

    if (formData.fromDate && formData.toDate) {
      const fromDate = new Date(formData.fromDate);
      const toDate = new Date(formData.toDate);
      
      if (fromDate > toDate) {
        newErrors.toDate = 'To date must be after from date';
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (fromDate < today) {
        newErrors.fromDate = 'From date cannot be in the past';
      }

      if (overlapWarning) {
        newErrors.dateRange = 'The selected dates overlap with existing absence(s)';
      }
    }

    return newErrors;
  }, [formData, overlapWarning]);

  const handleInputChange = useCallback((field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }

    if (field === 'fromDate' || field === 'toDate') {
      setErrors(prev => ({
        ...prev,
        dateRange: ''
      }));
    }
  }, [errors]);

  const handleSubmit = useCallback(async (e) => {
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
  }, [formData, validateForm, onAddAbsence]);

  const handleClose = useCallback(() => {
    if (!isSubmitting) {
      onClose();
    }
  }, [isSubmitting, onClose]);

  const isSubmitDisabled = useMemo(() => 
    isSubmitting || !formData.user || !formData.fromDate || !formData.toDate || overlapWarning !== null,
    [isSubmitting, formData.user, formData.fromDate, formData.toDate, overlapWarning]
  );

  const formatDate = useCallback((dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }, []);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal max-w-5xl" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="text-lg font-semibold text-gray-900">Add Absence Entry</h3>
          <button 
            className="text-gray-400 hover:text-gray-600"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {errors.submit && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-700">{errors.submit}</p>
              </div>
            )}

            {overlapWarning && (
              <div className="mb-4 p-4 bg-red-50 border-l-4 border-l-red-500 rounded-md">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-red-800 mb-1">
                      Date Overlap Detected
                    </h4>
                    <p className="text-sm text-red-700 mb-2">
                      The selected dates overlap with {overlapWarning.count} existing absence{overlapWarning.count > 1 ? 's' : ''}:
                    </p>
                    <div className="space-y-2">
                      {overlapWarning.absences.map((absence, index) => (
                        <div key={absence.id || index} className="bg-white rounded p-2 border border-red-200">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-red-900">
                              {formatDate(absence.fromDate)} - {formatDate(absence.toDate)}
                            </span>
                            <span className="badge badge-error text-xs">Overlap</span>
                          </div>
                          {absence.reason && (
                            <p className="text-xs text-red-700 mt-1">{absence.reason}</p>
                          )}
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-red-600 mt-2 font-medium">
                      Please select different dates or modify the existing absence.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
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

                <div>
                  <label className="exchange-form-label">From Date *</label>
                  <div className="relative">
                    <input
                      type="date"
                      className={`exchange-date-input ${errors.fromDate || errors.dateRange ? 'border-red-300 focus:border-red-500' : ''}`}
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

                <div>
                  <label className="exchange-form-label">To Date *</label>
                  <div className="relative">
                    <input
                      type="date"
                      className={`exchange-date-input ${errors.toDate || errors.dateRange ? 'border-red-300 focus:border-red-500' : ''}`}
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
                  {errors.dateRange && (
                    <p className="mt-1 text-sm text-red-600">{errors.dateRange}</p>
                  )}
                </div>

                <div>
                  <label className="exchange-form-label">Reason (Optional)</label>
                  <textarea
                    className="input resize-none min-h-[80px]"
                    placeholder="Brief reason for absence"
                    value={formData.reason}
                    onChange={(e) => handleInputChange('reason', e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="exchange-form-label">Absence Summary</label>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    {formData.user ? (
                      isLoadingAbsences ? (
                        <div className="text-center py-4">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                          <p className="text-sm text-gray-500 mt-2">Loading absences...</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                            <div className="flex items-center gap-2">
                              <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                              </svg>
                              <span className="text-sm font-medium text-gray-700">Total Absences</span>
                            </div>
                            <span className="text-lg font-bold text-gray-900">{userAbsences.length}</span>
                          </div>

                          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                            <div className="flex items-center gap-2">
                              <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              <span className="text-sm font-medium text-green-700">Active Absences</span>
                            </div>
                            <span className="text-lg font-bold text-green-900">{activeAbsences.length}</span>
                          </div>

                          <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                            <div className="flex items-center gap-2">
                              <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                              </svg>
                              <span className="text-sm font-medium text-yellow-700">Upcoming Absences</span>
                            </div>
                            <span className="text-lg font-bold text-yellow-900">{upcomingAbsences.length}</span>
                          </div>

                          {upcomingAbsences.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <p className="text-xs font-medium text-gray-600 mb-2">Next Upcoming:</p>
                              <div className="bg-white rounded-lg p-2 border border-gray-200">
                                <p className="text-xs text-gray-700">
                                  {formatDate(upcomingAbsences[0].fromDate)} - {formatDate(upcomingAbsences[0].toDate)}
                                </p>
                                {upcomingAbsences[0].reason && (
                                  <p className="text-xs text-gray-500 mt-1">{upcomingAbsences[0].reason}</p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    ) : (
                      <div className="text-center py-8">
                        <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                        </svg>
                        <p className="text-sm text-gray-500">Select a user to view absence summary</p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="exchange-form-label">Active Tasks</label>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 max-h-[280px] overflow-y-auto">
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
                          <p className="text-sm text-gray-500">No active tasks for this user</p>
                        </div>
                      )
                    ) : (
                      <div className="text-center py-8">
                        <svg className="w-8 h-8 text-gray-400 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                        </svg>
                        <p className="text-sm text-gray-500">Select a user to view active tasks</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button 
              type="button"
              className="btn btn-secondary"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitDisabled}
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