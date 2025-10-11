import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { selectCurrentUser, selectUserRole } from '../../redux/slices/authSlice';
import { 
  useGetCurrentUserProfileQuery,
  useUpdateCurrentUserProfileMutation 
} from '../../redux/api/usersApi';
import { useChangePasswordMutation } from '../../redux/api/authApi';
import { USER_ROLES } from '../../utils/roles';

const ProfilePage = () => {
  const dispatch = useDispatch();
  const currentUser = useSelector(selectCurrentUser);
  const userRole = useSelector(selectUserRole);

  const { 
    data: profileData, 
    isLoading: isLoadingProfile,
    refetch: refetchProfile 
  } = useGetCurrentUserProfileQuery();
  
  const [updateProfile, { isLoading: isUpdating }] = useUpdateCurrentUserProfileMutation();
  const [changePassword, { isLoading: isChangingPassword }] = useChangePasswordMutation();

  const [profileForm, setProfileForm] = useState({
    fullName: '',
    email: '',
    mobileNumber: '',
    team: ''
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [activeTab, setActiveTab] = useState('profile');
  const [profileErrors, setProfileErrors] = useState({});
  const [passwordErrors, setPasswordErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  useEffect(() => {
    const userData = profileData || currentUser;
    if (userData) {
      setProfileForm({
        fullName: userData.fullName || '',
        email: userData.email || '',
        mobileNumber: userData.mobileNumber || '',
        team: userData.team || ''
      });
    }
  }, [profileData, currentUser]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRoleDisplayName = (role) => {
    const roleNames = {
      [USER_ROLES.ADMIN]: 'Administrator',
      [USER_ROLES.SENIOR_MANAGER]: 'Senior Manager',
      [USER_ROLES.COMPLIANCE_ADMIN]: 'Compliance Administrator',
      [USER_ROLES.COMPLIANCE_USER]: 'Compliance Officer',
      [USER_ROLES.PRODUCT_ADMIN]: 'Product Administrator',
      [USER_ROLES.PRODUCT_USER]: 'Product User'
    };
    return roleNames[role] || role;
  };

  const getRoleColor = (role) => {
    switch (role) {
      case USER_ROLES.ADMIN:
        return 'text-red-600 bg-red-50 border-red-200';
      case USER_ROLES.SENIOR_MANAGER:
        return 'text-purple-600 bg-purple-50 border-purple-200';
      case USER_ROLES.COMPLIANCE_ADMIN:
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case USER_ROLES.COMPLIANCE_USER:
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case USER_ROLES.PRODUCT_ADMIN:
        return 'text-green-600 bg-green-50 border-green-200';
      case USER_ROLES.PRODUCT_USER:
        return 'text-indigo-600 bg-indigo-50 border-indigo-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const validateProfileForm = () => {
    const errors = {};

    if (!profileForm.fullName.trim()) {
      errors.fullName = 'Full name is required';
    } else if (profileForm.fullName.trim().length < 2) {
      errors.fullName = 'Full name must be at least 2 characters';
    }

    if (!profileForm.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileForm.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (profileForm.mobileNumber && !/^[0-9+\-\s()]+$/.test(profileForm.mobileNumber)) {
      errors.mobileNumber = 'Please enter a valid mobile number';
    }

    return errors;
  };

  const handleProfileInputChange = (field, value) => {
    setProfileForm(prev => ({
      ...prev,
      [field]: value
    }));
    
    if (profileErrors[field]) {
      setProfileErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    
    const errors = validateProfileForm();
    if (Object.keys(errors).length > 0) {
      setProfileErrors(errors);
      return;
    }

    try {
      await updateProfile({
        fullName: profileForm.fullName.trim(),
        email: profileForm.email.trim().toLowerCase(),
        mobileNumber: profileForm.mobileNumber.trim() || undefined,
        team: profileForm.team.trim() || undefined
      }).unwrap();

      setSuccessMessage('Profile updated successfully!');
      setProfileErrors({});
      refetchProfile();
    } catch (error) {
      setProfileErrors({
        submit: error.data?.message || 'Failed to update profile. Please try again.'
      });
    }
  };

  const validatePasswordForm = () => {
    const errors = {};

    if (!passwordForm.currentPassword) {
      errors.currentPassword = 'Current password is required';
    }

    if (!passwordForm.newPassword) {
      errors.newPassword = 'New password is required';
    } else if (passwordForm.newPassword.length < 8) {
      errors.newPassword = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(passwordForm.newPassword)) {
      errors.newPassword = 'Password must contain uppercase, lowercase, and number';
    }

    if (!passwordForm.confirmPassword) {
      errors.confirmPassword = 'Please confirm your new password';
    } else if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (passwordForm.currentPassword === passwordForm.newPassword) {
      errors.newPassword = 'New password must be different from current password';
    }

    return errors;
  };

  const handlePasswordInputChange = (field, value) => {
    setPasswordForm(prev => ({
      ...prev,
      [field]: value
    }));
    
    if (passwordErrors[field]) {
      setPasswordErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    
    const errors = validatePasswordForm();
    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors);
      return;
    }

    try {
      await changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      }).unwrap();

      setSuccessMessage('Password changed successfully!');
      setPasswordErrors({});
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setShowPasswords({
        current: false,
        new: false,
        confirm: false
      });
    } catch (error) {
      setPasswordErrors({
        submit: error.data?.message || 'Failed to change password. Please try again.'
      });
    }
  };

  if (isLoadingProfile) {
    return (
      <div className="container-lg section-md">
        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading profile...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const userData = profileData || currentUser;

  return (
    <div className="container-lg section-md">
      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
          <div className="flex">
            <svg className="w-5 h-5 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-green-700">{successMessage}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="card">
            <div className="card-body text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl font-bold text-white">
                  {userData?.fullName?.charAt(0) || 'U'}
                </span>
              </div>

              <h3 className="text-xl font-semibold text-gray-900 mb-1">
                {userData?.fullName || 'User'}
              </h3>
              <p className="text-gray-600 mb-3">{userData?.email}</p>

              <div className="mb-4">
                <span className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-medium border ${getRoleColor(userData?.role)}`}>
                  {getRoleDisplayName(userData?.role)}
                </span>
              </div>

              <div className="border-t border-gray-100 pt-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Status</span>
                  <span className={`font-medium ${userData?.isActive ? 'text-green-600' : 'text-red-600'}`}>
                    {userData?.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Member Since</span>
                  <span className="text-gray-900">
                    {userData?.createdAt ? new Date(userData.createdAt).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">User ID</span>
                  <span className="text-gray-900 font-mono text-xs">
                    {userData?.id?.slice(-8) || 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="card">
            <div className="card-header border-b border-gray-100">
              <div className="flex space-x-6">
                <button
                  className={`pb-3 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'profile'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                  onClick={() => setActiveTab('profile')}
                >
                  Profile Settings
                </button>
                <button
                  className={`pb-3 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'password'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                  onClick={() => setActiveTab('password')}
                >
                  Change Password
                </button>
              </div>
            </div>

            <div className="card-body">
              {activeTab === 'profile' && (
                <form onSubmit={handleProfileSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        className={`input ${profileErrors.fullName ? 'border-red-300 focus:border-red-500' : ''}`}
                        value={profileForm.fullName}
                        onChange={(e) => handleProfileInputChange('fullName', e.target.value)}
                        disabled={isUpdating}
                        placeholder="Enter your full name"
                      />
                      {profileErrors.fullName && (
                        <p className="mt-1 text-sm text-red-600">{profileErrors.fullName}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        className={`input ${profileErrors.email ? 'border-red-300 focus:border-red-500' : ''}`}
                        value={profileForm.email}
                        onChange={(e) => handleProfileInputChange('email', e.target.value)}
                        disabled={isUpdating}
                        placeholder="your.email@company.com"
                      />
                      {profileErrors.email && (
                        <p className="mt-1 text-sm text-red-600">{profileErrors.email}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Username
                      </label>
                      <input
                        type="text"
                        className="input bg-gray-50 text-gray-500 cursor-not-allowed"
                        value={userData?.username || ''}
                        disabled
                      />
                      <p className="mt-1 text-xs text-gray-500">Username cannot be changed</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Mobile Number
                      </label>
                      <input
                        type="tel"
                        className={`input ${profileErrors.mobileNumber ? 'border-red-300 focus:border-red-500' : ''}`}
                        value={profileForm.mobileNumber}
                        onChange={(e) => handleProfileInputChange('mobileNumber', e.target.value)}
                        disabled={isUpdating}
                        placeholder="+1 (555) 123-4567"
                      />
                      {profileErrors.mobileNumber && (
                        <p className="mt-1 text-sm text-red-600">{profileErrors.mobileNumber}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Team
                      </label>
                      <input
                        type="text"
                        className="input"
                        value={profileForm.team}
                        onChange={(e) => handleProfileInputChange('team', e.target.value)}
                        disabled={isUpdating}
                        placeholder="Your team name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Role
                      </label>
                      <input
                        type="text"
                        className="input bg-gray-50 text-gray-500 cursor-not-allowed"
                        value={getRoleDisplayName(userData?.role)}
                        disabled
                      />
                      <p className="mt-1 text-xs text-gray-500">Role can only be changed by administrators</p>
                    </div>
                  </div>

                  {profileErrors.submit && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm text-red-700">{profileErrors.submit}</p>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={isUpdating}
                    >
                      {isUpdating ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Updating...
                        </>
                      ) : (
                        'Update Profile'
                      )}
                    </button>
                  </div>
                </form>
              )}

              {activeTab === 'password' && (
                <form onSubmit={handlePasswordSubmit} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Current Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.current ? 'text' : 'password'}
                        className={`input pr-10 ${passwordErrors.currentPassword ? 'border-red-300 focus:border-red-500' : ''}`}
                        value={passwordForm.currentPassword}
                        onChange={(e) => handlePasswordInputChange('currentPassword', e.target.value)}
                        disabled={isChangingPassword}
                        placeholder="Enter your current password"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => togglePasswordVisibility('current')}
                      >
                        {showPasswords.current ? (
                          <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                          </svg>
                        ) : (
                          <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                    {passwordErrors.currentPassword && (
                      <p className="mt-1 text-sm text-red-600">{passwordErrors.currentPassword}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      New Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.new ? 'text' : 'password'}
                        className={`input pr-10 ${passwordErrors.newPassword ? 'border-red-300 focus:border-red-500' : ''}`}
                        value={passwordForm.newPassword}
                        onChange={(e) => handlePasswordInputChange('newPassword', e.target.value)}
                        disabled={isChangingPassword}
                        placeholder="Enter your new password"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => togglePasswordVisibility('new')}
                      >
                        {showPasswords.new ? (
                          <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                          </svg>
                        ) : (
                          <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                    {passwordErrors.newPassword && (
                      <p className="mt-1 text-sm text-red-600">{passwordErrors.newPassword}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                      Password must be at least 8 characters and contain uppercase, lowercase, and numbers
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Confirm New Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.confirm ? 'text' : 'password'}
                        className={`input pr-10 ${passwordErrors.confirmPassword ? 'border-red-300 focus:border-red-500' : ''}`}
                        value={passwordForm.confirmPassword}
                        onChange={(e) => handlePasswordInputChange('confirmPassword', e.target.value)}
                        disabled={isChangingPassword}
                        placeholder="Confirm your new password"
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => togglePasswordVisibility('confirm')}
                      >
                        {showPasswords.confirm ? (
                          <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                          </svg>
                        ) : (
                          <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </div>
                    {passwordErrors.confirmPassword && (
                      <p className="mt-1 text-sm text-red-600">{passwordErrors.confirmPassword}</p>
                    )}
                  </div>

                  {passwordErrors.submit && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm text-red-700">{passwordErrors.submit}</p>
                    </div>
                  )}

                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <div className="flex">
                      <svg className="w-5 h-5 text-blue-400 mr-2 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <div className="text-sm text-blue-800">
                        <p className="font-medium mb-1">Security Tips:</p>
                        <ul className="list-disc list-inside space-y-1">
                          <li>Use a unique password that you don't use elsewhere</li>
                          <li>Consider using a password manager</li>
                          <li>You'll need to log in again after changing your password</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={isChangingPassword}
                    >
                      {isChangingPassword ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Changing...
                        </>
                      ) : (
                        'Change Password'
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;