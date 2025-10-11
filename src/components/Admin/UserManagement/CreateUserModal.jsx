import React, { useState, useEffect } from 'react';
import { hasPermission, PERMISSIONS, USER_ROLES } from '../../../utils/roles';

const CreateUserModal = ({ isOpen, onClose, onCreateUser, currentUserRole }) => {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    username: '',
    password: '',
    role: '',
    team: '',
    mobileNumber: ''
  });
  
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
 
const getAllowedRoles = () => {
  if (!currentUserRole) return [];
  
  const allowedRoles = [];
  
  if (hasPermission(currentUserRole, PERMISSIONS.USER_CREATE_ANY)) {
    return [
      { value: USER_ROLES.PRODUCT_USER, label: 'Product User' },
      { value: USER_ROLES.PRODUCT_ADMIN, label: 'Product Admin' },
      { value: USER_ROLES.COMPLIANCE_USER, label: 'Compliance User' },
      { value: USER_ROLES.COMPLIANCE_ADMIN, label: 'Compliance Admin' },
      { value: USER_ROLES.SENIOR_MANAGER, label: 'Senior Manager' },
      { value: USER_ROLES.ADMIN, label: 'Administrator' }
    ];
  }
  
  if (hasPermission(currentUserRole, PERMISSIONS.USER_CREATE_PRODUCT)) {
    allowedRoles.push(
      { value: USER_ROLES.PRODUCT_USER, label: 'Product User' },
      { value: USER_ROLES.PRODUCT_ADMIN, label: 'Product Admin' }
    );
  }
  
  if (hasPermission(currentUserRole, PERMISSIONS.USER_CREATE_COMPLIANCE)) {
    allowedRoles.push(
      { value: USER_ROLES.COMPLIANCE_USER, label: 'Compliance User' },
      { value: USER_ROLES.COMPLIANCE_ADMIN, label: 'Compliance Admin' }
    );
  }
 
  return allowedRoles.filter((role, index, self) => 
    self.findIndex(r => r.value === role.value) === index
  );
};

  const allowedRoles = getAllowedRoles();
    
useEffect(() => {
  if (isOpen && allowedRoles.length > 0) {
    setFormData(prev => ({
      ...prev,
      role: prev.role || allowedRoles[0].value
    }));
  }
}, [isOpen]);
 
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        fullName: '',
        email: '',
        username: '',
        password: '',
        role: '',
        team: '',
        mobileNumber: ''
      });
      setErrors({});
      setIsSubmitting(false);
    }
  }, [isOpen]);
 
  const validateForm = () => {
    const newErrors = {};
 
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = 'Full name must be at least 2 characters';
    }
 
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
 
    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.trim().length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.username = 'Username can only contain letters, numbers, and underscores';
    }
 
    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one uppercase letter, lowercase letter, and number';
    }
 
    if (!formData.role) {
      newErrors.role = 'Role is required';
    } else if (!allowedRoles.find(role => role.value === formData.role)) {
      newErrors.role = 'Invalid role selected';
    }
 
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
     
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const generateUsername = (fullName) => { 
    return fullName
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, 15);
  };

  const handleFullNameChange = (value) => {
    handleInputChange('fullName', value);
 
    if (!formData.username && value.trim()) {
      const generatedUsername = generateUsername(value);
      handleInputChange('username', generatedUsername);
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
      await onCreateUser({
        fullName: formData.fullName.trim(),
        email: formData.email.trim().toLowerCase(),
        username: formData.username.trim().toLowerCase(),
        password: formData.password,
        role: formData.role,
        team: formData.team.trim() || undefined,
        mobileNumber: formData.mobileNumber.trim() || undefined
      });
    } catch (error) {
      console.error('Failed to create user:', error);
      setErrors({
        submit: error.message || 'Failed to create user. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="text-lg font-semibold text-gray-900">Create New User</h3>
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
            {errors.submit && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-700">{errors.submit}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="exchange-form-label">
                  Full Name *
                </label>
                <input
                  type="text"
                  className={`input ${errors.fullName ? 'border-red-300 focus:border-red-500' : ''}`}
                  value={formData.fullName}
                  onChange={(e) => handleFullNameChange(e.target.value)}
                  disabled={isSubmitting}
                  placeholder="Enter full name"
                />
                {errors.fullName && (
                  <p className="mt-1 text-sm text-red-600">{errors.fullName}</p>
                )}
              </div>
 
              <div>
                <label className="exchange-form-label">
                  Email ID *
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
 
              <div>
                <label className="exchange-form-label">
                  Username *
                </label>
                <input
                  type="text"
                  className={`input ${errors.username ? 'border-red-300 focus:border-red-500' : ''}`}
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                  disabled={isSubmitting}
                  placeholder="username"
                />
                {errors.username && (
                  <p className="mt-1 text-sm text-red-600">{errors.username}</p>
                )}
              </div>
 
              <div>
                <label className="exchange-form-label">
                  Temporary Password *
                </label>
                <input
                  type="password"
                  className={`input ${errors.password ? 'border-red-300 focus:border-red-500' : ''}`}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  disabled={isSubmitting}
                  placeholder="Minimum 8 characters"
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  User will be required to change password on first login
                </p>
              </div>
 
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
              disabled={isSubmitting || allowedRoles.length === 0}
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </>
              ) : (
                'Create User'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateUserModal;