import React from 'react';
import { USER_ROLES } from '../../../utils/roles';

const UserDetailModal = ({ isOpen, onClose, user }) => {
  if (!isOpen || !user) return null;

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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="text-lg font-semibold text-gray-900">User Details</h3>
          <button 
            className="text-gray-400 hover:text-gray-600"
            onClick={onClose}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="modal-body">
          {/* User Avatar and Basic Info */}
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl font-bold text-white">
                {user.fullName?.charAt(0) || 'U'}
              </span>
            </div>
            <h4 className="text-xl font-semibold text-gray-900">{user.fullName}</h4>
            <p className="text-gray-600">{user.email}</p>
          </div>

          {/* User Information Grid */}
          <div className="space-y-4">
            {/* Basic Information */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h5 className="font-medium text-gray-900 mb-3">Basic Information</h5>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Username</label>
                  <p className="text-gray-900">{user.username}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">User ID</label>
                  <p className="text-gray-900 font-mono text-sm">{user.id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Full Name</label>
                  <p className="text-gray-900">{user.fullName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <p className="text-gray-900">{user.email}</p>
                </div>
              </div>
            </div>

            {/* Role and Status */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h5 className="font-medium text-gray-900 mb-3">Role & Status</h5>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Role</label>
                  <div className="mt-1">
                    <span className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-medium border ${getRoleColor(user.role)}`}>
                      {getRoleDisplayName(user.role)}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <div className="mt-1">
                    <span className={`inline-flex items-center px-3 py-1 rounded-md text-sm font-medium ${
                      user.isActive 
                        ? 'text-green-700 bg-green-50 border border-green-200' 
                        : 'text-red-700 bg-red-50 border border-red-200'
                    }`}>
                      <div className={`w-2 h-2 rounded-full mr-2 ${user.isActive ? 'bg-green-400' : 'bg-red-400'}`}></div>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Team</label>
                  <p className="text-gray-900">{user.team || 'Not assigned'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Mobile</label>
                  <p className="text-gray-900">{user.mobileNumber || 'Not provided'}</p>
                </div>
              </div>
            </div>

            {/* Account Information */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h5 className="font-medium text-gray-900 mb-3">Account Information</h5>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Created At</label>
                  <p className="text-gray-900">{formatDate(user.createdAt)}</p>
                </div>
                {user.updatedAt && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Last Updated</label>
                    <p className="text-gray-900">{formatDate(user.updatedAt)}</p>
                  </div>
                )}
                {user.lastLogin && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Last Login</label>
                    <p className="text-gray-900">{formatDate(user.lastLogin)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Permissions Overview */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h5 className="font-medium text-gray-900 mb-3">Role Permissions</h5>
              <div className="text-sm text-gray-600">
                {user.role === USER_ROLES.ADMIN && (
                  <p>Full system access including user management, system configuration, and all data access.</p>
                )}
                {user.role === USER_ROLES.SENIOR_MANAGER && (
                  <p>Read access to all data, reports, and audit logs. Cannot modify user accounts.</p>
                )}
                {user.role === USER_ROLES.COMPLIANCE_ADMIN && (
                  <p>Manage compliance users, approve/reject tasks, create exchange approvals, and access compliance reports.</p>
                )}
                {user.role === USER_ROLES.COMPLIANCE_USER && (
                  <p>Review and approve assigned tasks, create exchange approvals, limited reporting access.</p>
                )}
                {user.role === USER_ROLES.PRODUCT_ADMIN && (
                  <p>Manage product team users, create and assign tasks, upload versions, team reporting access.</p>
                )}
                {user.role === USER_ROLES.PRODUCT_USER && (
                  <p>Create tasks, upload versions, add comments, view own tasks and notifications.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button 
            className="btn btn-secondary"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserDetailModal;