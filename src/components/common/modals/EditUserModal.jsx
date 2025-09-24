import React, { useState, useEffect } from 'react';
import { hasPermission, PERMISSIONS, USER_ROLES } from '../../../utils/roles';

const EditUserModal = ({ isOpen, onClose, onUpdateUser, user, currentUserRole }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    role: '',
    team: '',
    mobileNumber: '',
    isActive: true
  });
  
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form data when user prop changes
  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.fullName || '',
        email: user.email || '',
        role: user.role || '',
        team: user.team || '',
        mobileNumber: user.mobileNumber || '',
        isActive: user.isActive !== undefined ? user.isActive : true
      });
    }
  }, [user]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setErrors({});
      setIsSubmitting(false);
    }
  }, [isOpen]);

  // Get allowed roles based on current user's permissions
  const getAllowedRoles = () => {
    if (!currentUserRole) return [];
    
    const allowedRoles = [];
    
    if (hasPermission(currentUserRole, PERMISSIONS.USER_UPDATE_ANY)) {
      return [
        { value: USER_ROLES.PRODUCT_USER, label: 'Product User' },
        { value: USER_ROLES.PRODUCT_ADMIN, label: 'Product Admin' },
        { value: USER_ROLES.COMPLIANCE_USER, label: 'Compliance User' },
        { value: USER_ROLES.COMPLIANCE_ADMIN, label: 'Compliance Admin' },
        { value: USER_ROLES.SENIOR_MANAGER, label: 'Senior Manager' },
        { value: USER_ROLES.ADMIN, label: 'Administrator' }
      ];
    }
    
    if (hasPermission(currentUserRole, PERMISSIONS.USER_UPDATE_TEAM)) {
      // Can only update users in same team with lower or equal roles
      if (currentUserRole === USER_ROLES.PRODUCT_ADMIN) {
        allowedRoles.push(
          { value: USER_ROLES.PRODUCT_USER, label: 'Product User' },
          { value: USER_ROLES.PRODUCT_ADMIN, label: 'Product Admin' }
        );
      }
      
      if (currentUserRole === USER_ROLES.COMPLIANCE_ADMIN) {
        allowedRoles.push(
          { value: USER_ROLES.COMPLIANCE_USER, label: 'Compliance User' },
          { value: USER_ROLES.COMPLIANCE_ADMIN, label: 'Compliance Admin' }
        );
      }
    }
    
    return allowedRoles;
  };

  const allowedRoles = getAllowedRoles();
  const canEditRole = allowedRoles.length > 0;
  const canEditStatus = hasPermission(currentUserRole, PERMISSIONS.USER_UPDATE_ANY);

  // Validation rules
  const validateForm = () => {
    const newErrors = {};

    // Full Name validation
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = 'Full name must be at least 2 characters';
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Role validation
    if (canEditRole && !formData.role) {
      newErrors.role = 'Role is required';
    } else if (canEditRole && !allowedRoles.find(role => role.value === formData.role)) {
      newErrors.role = 'Invalid role selected';
    }

    // Mobile number validation (optional but format check)
    if (formData.mobileNumber && !/^[0-9+\-\s()]+$/.test(formData.mobileNumber)) {
      newErrors.mobileNumber = 'Please enter a valid mobile number';
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
      // Only include fields that the user has permission to edit
      const updateData = {
        fullName: formData.fullName.trim(),
        email: formData.email.trim().toLowerCase(),
        team: formData.team.trim() || undefined,
        mobileNumber: formData.mobileNumber.trim() || undefined
      };

      // Add role only if user can edit roles
      if (canEditRole) {
        updateData.role = formData.role;
      }

      // Add status only if user can edit status
      if (canEditStatus) {
        updateData.isActive = formData.isActive;
      }

      await onUpdateUser(updateData);
    } catch (error) {
      console.error('Failed to update user:', error);
      setErrors({
        submit: error.message || 'Failed to update user. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !user) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="text-lg font-semibold text-gray-900">Edit User</h3>
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

            {/* User Info Display */}
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-blue-700">
                    {user.fullName?.charAt(0) || 'U'}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">{user.fullName}</p>
                  <p className="text-sm text-gray-600">@{user.username}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="exchange-form-label">
                  Full Name *
                </label>
                <input
                  type="text"
                  className={`input ${errors.fullName ? 'border-red-300 focus:border-red-500' : ''}`}
                  value={formData.fullName}
                  onChange={(e) => handleInputChange('fullName', e.target.value)}
                  disabled={isSubmitting}
                  placeholder="Enter full name"
                />
                {errors.fullName && (
                  <p className="mt-1 text-sm text-red-600">{errors.fullName}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="exchange-form-label">
                  Email Address *
                </label>
                <input
                  type="email"
                  className={`input ${errors.email ? 'border-red-300 focus:border-red-500' : ''}`}
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  disabled={isSubmitting}
                  placeholder="user@company.com"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                )}
              </div>

              {/* Role - Only show if user has permission */}
              {canEditRole ? (
                <div>
                  <label className="exchange-form-label">
                    Role *
                  </label>
                  <select 
                    className={`exchange-form-select ${errors.role ? 'border-red-300 focus:border-red-500' : ''}`}
                    value={formData.role}
                    onChange={(e) => handleInputChange('role', e.target.value)}
                    disabled={isSubmitting}
                  >
                    <option value="">Select a role</option>
                    {allowedRoles.map(role => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                  {errors.role && (
                    <p className="mt-1 text-sm text-red-600">{errors.role}</p>
                  )}
                </div>
              ) : (
                <div>
                  <label className="exchange-form-label">
                    Role
                  </label>
                  <div className="input bg-gray-50 text-gray-500">
                    {user.role?.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                    <span className="text-xs ml-2">(Cannot edit)</span>
                  </div>
                </div>
              )}

              {/* Status - Only show if user has permission */}
              {canEditStatus ? (
                <div>
                  <label className="exchange-form-label">
                    Status
                  </label>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="isActive"
                        value="true"
                        checked={formData.isActive === true}
                        onChange={() => handleInputChange('isActive', true)}
                        disabled={isSubmitting}
                        className="mr-2"
                      />
                      <span className="text-sm text-green-700">Active</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="isActive"
                        value="false"
                        checked={formData.isActive === false}
                        onChange={() => handleInputChange('isActive', false)}
                        disabled={isSubmitting}
                        className="mr-2"
                      />
                      <span className="text-sm text-red-700">Inactive</span>
                    </label>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="exchange-form-label">
                    Status
                  </label>
                  <div className="input bg-gray-50 text-gray-500">
                    {user.isActive ? 'Active' : 'Inactive'}
                    <span className="text-xs ml-2">(Cannot edit)</span>
                  </div>
                </div>
              )}

              {/* Team */}
              <div>
                <label className="exchange-form-label">
                  Team
                </label>
                <input
                  type="text"
                  className="input"
                  value={formData.team}
                  onChange={(e) => handleInputChange('team', e.target.value)}
                  disabled={isSubmitting}
                  placeholder="Team name (optional)"
                />
              </div>

              {/* Mobile Number */}
              <div>
                <label className="exchange-form-label">
                  Mobile Number
                </label>
                <input
                  type="tel"
                  className={`input ${errors.mobileNumber ? 'border-red-300 focus:border-red-500' : ''}`}
                  value={formData.mobileNumber}
                  onChange={(e) => handleInputChange('mobileNumber', e.target.value)}
                  disabled={isSubmitting}
                  placeholder="+1 (555) 123-4567"
                />
                {errors.mobileNumber && (
                  <p className="mt-1 text-sm text-red-600">{errors.mobileNumber}</p>
                )}
              </div>
            </div>

            {/* Permission Notice */}
            {!canEditRole && !canEditStatus && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-800">
                  <svg className="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  You can only edit basic profile information. Role and status changes require higher permissions.
                </p>
              </div>
            )}
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
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Updating...
                </>
              ) : (
                'Update User'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditUserModal;