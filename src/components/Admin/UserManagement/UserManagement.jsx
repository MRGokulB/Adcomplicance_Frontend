import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import CreateUserModal from './CreateUserModal';
import UserDetailModal from '../../common/modals/UserDetailModal';
import EditUserModal from '../../common/modals/EditUserModal';
import ResetPasswordModal from '../../common/modals/ResetPasswordModal';
import { selectUserRole } from '../../../redux/slices/authSlice';
import { 
  useGetUsersQuery, 
  useCreateUserMutation,
  useUpdateUserMutation,
  useResetUserPasswordMutation,
  usePromoteUserMutation, // NEW
} from '../../../redux/api/usersApi';
import { hasPermission, PERMISSIONS, USER_ROLES } from '../../../utils/roles';

const UserManagement = () => {
  // State management
  const [filters, setFilters] = useState({
    search: '',
    role: '',
    team: '',
    isActive: '',
    page: 1,
    limit: 20
  });
  
  const [modals, setModals] = useState({
    createUser: false,
    editUser: false,
    userDetail: false,
    resetPassword: false
  });
  
  const [selectedUser, setSelectedUser] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  const currentUserRole = useSelector(selectUserRole);

  // API hooks - Updated to use new backend structure
  const { 
    data: usersResponse, 
    isLoading, 
    isError, 
    error,
    refetch 
  } = useGetUsersQuery(filters);

  const [createUser, { isLoading: isCreating }] = useCreateUserMutation();
  const [updateUser, { isLoading: isUpdating }] = useUpdateUserMutation();
  const [resetPassword, { isLoading: isResetting }] = useResetUserPasswordMutation();
  const [promoteUser, { isLoading: isPromoting }] = usePromoteUserMutation(); // NEW

  // Permission checks
  const canCreateUsers = hasPermission(currentUserRole, PERMISSIONS.USER_CREATE_ANY) ||
                        hasPermission(currentUserRole, PERMISSIONS.USER_CREATE_PRODUCT) ||
                        hasPermission(currentUserRole, PERMISSIONS.USER_CREATE_COMPLIANCE);
  
  const canUpdateUsers = hasPermission(currentUserRole, PERMISSIONS.USER_UPDATE_ANY) ||
                        hasPermission(currentUserRole, PERMISSIONS.USER_UPDATE_TEAM);
  
  const canResetPasswords = hasPermission(currentUserRole, PERMISSIONS.USER_RESET_PASSWORD);
  const canPromoteUsers = hasPermission(currentUserRole, PERMISSIONS.USER_PROMOTE); // NEW
  const canViewAllUsers = hasPermission(currentUserRole, PERMISSIONS.USER_READ_ALL);

  // Extract data from response
  const users = usersResponse?.users || [];
  const pagination = usersResponse?.pagination || {};

  // Auto-refresh data periodically
  useEffect(() => {
    const interval = setInterval(() => {
      refetch();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [refetch]);

  // Utility functions
  const getRoleBadgeClass = (role) => {
    switch (role) {
      case USER_ROLES.PRODUCT_USER:
        return 'badge-primary';
      case USER_ROLES.COMPLIANCE_USER:
        return 'badge-warning';
      case USER_ROLES.PRODUCT_ADMIN:
        return 'badge-success';
      case USER_ROLES.COMPLIANCE_ADMIN:
        return 'badge-info';
      case USER_ROLES.ADMIN:
        return 'badge-error';
      case USER_ROLES.SENIOR_MANAGER:
        return 'badge-secondary';
      default:
        return 'badge-ghost';
    }
  };

  const getStatusBadgeClass = (isActive) => {
    return isActive ? 'badge-success' : 'badge-error';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Filter handlers
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page when filtering
    }));
  };

  const handleSearch = (searchTerm) => {
    handleFilterChange('search', searchTerm);
  };

  const handleClearFilters = () => {
    setFilters({
      search: '',
      role: '',
      team: '',
      isActive: '',
      page: 1,
      limit: 20
    });
  };

  // CRUD operations - Updated to match new backend
  const handleCreateUser = async (userData) => {
    try {
      // Role-based user creation restrictions
      const allowedRoles = [];
      if (hasPermission(currentUserRole, PERMISSIONS.USER_CREATE_ANY)) {
        allowedRoles.push(...Object.values(USER_ROLES));
      } else {
        if (hasPermission(currentUserRole, PERMISSIONS.USER_CREATE_PRODUCT)) {
          allowedRoles.push(USER_ROLES.PRODUCT_USER, USER_ROLES.PRODUCT_ADMIN);
        }
        if (hasPermission(currentUserRole, PERMISSIONS.USER_CREATE_COMPLIANCE)) {
          allowedRoles.push(USER_ROLES.COMPLIANCE_USER, USER_ROLES.COMPLIANCE_ADMIN);
        }
      }

      if (!allowedRoles.includes(userData.role)) {
        throw new Error(`You don't have permission to create users with role: ${userData.role}`);
      }

      const result = await createUser({
        username: userData.username,
        email: userData.email,
        password: userData.password,
        fullName: userData.fullName,
        role: userData.role,
        team: userData.team || undefined
      }).unwrap();

      setModals(prev => ({ ...prev, createUser: false }));
      refetch();
    } catch (error) {
      console.error('Failed to create user:', error);
      throw error; // Re-throw to let modal handle error display
    }
  };

  const handleEditUser = async (userData) => {
    try {
      const result = await updateUser({ 
        id: selectedUser.id, 
        ...userData 
      }).unwrap();

      setModals(prev => ({ ...prev, editUser: false }));
      setSelectedUser(null);
      refetch();

      // Show promotion change notification if role changed
      if (result.changes?.roleChanged) {
        console.log(`User promoted from ${result.changes.previousRole} to ${result.changes.newRole}`);
      }
    } catch (error) {
      console.error('Failed to update user:', error);
      throw error;
    }
  };

  const handlePromoteUser = async (promotionData) => {
    try {
      const result = await promoteUser({
        id: selectedUser.id,
        newRole: promotionData.newRole,
        reason: promotionData.reason
      }).unwrap();

      setSelectedUser(null);
      refetch();

      console.log(`User promoted from ${result.changes.previousRole} to ${result.changes.newRole}`);
    } catch (error) {
      console.error('Failed to promote user:', error);
      throw error;
    }
  };

  const handleResetPassword = async (passwordData) => {
    try {
      await resetPassword({ 
        id: selectedUser.id, 
        newPassword: passwordData.newPassword 
      }).unwrap();
      
      setModals(prev => ({ ...prev, resetPassword: false }));
      setSelectedUser(null);
    } catch (error) {
      console.error('Failed to reset password:', error);
      throw error;
    }
  };

  // Export functionality - Updated for new response structure
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const csvContent = convertToCSV(users);
      downloadCSV(csvContent, `users_export_${new Date().toISOString().split('T')[0]}.csv`);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const convertToCSV = (data) => {
    if (!data.length) return '';
    
    const headers = ['Name', 'Email', 'Username', 'Role', 'Status', 'Team', 'Created At'];
    const csvRows = [headers.join(',')];
    
    data.forEach(user => {
      const row = [
        `"${user.fullName}"`,
        `"${user.email}"`,
        `"${user.username}"`,
        `"${user.role}"`,
        `"${user.isActive ? 'Active' : 'Inactive'}"`,
        `"${user.team || 'N/A'}"`,
        `"${formatDate(user.createdAt)}"`
      ];
      csvRows.push(row.join(','));
    });
    
    return csvRows.join('\n');
  };

  const downloadCSV = (content, filename) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Modal handlers
  const openModal = (modalName, user = null) => {
    setSelectedUser(user);
    setModals(prev => ({ ...prev, [modalName]: true }));
  };

  const closeModal = (modalName) => {
    setModals(prev => ({ ...prev, [modalName]: false }));
    setSelectedUser(null);
  };

  // Pagination handlers
  const handlePageChange = (newPage) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  // Loading state
  if (isLoading && !users.length) {
    return (
      <div className="container-lg section-md">
        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading users...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="container-lg section-md">
        <div className="card">
          <div className="card-body">
            <div className="text-center py-12">
              <div className="text-red-600 mb-4">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load users</h3>
              <p className="text-gray-600 mb-4">{error?.data?.message || 'An error occurred while fetching users'}</p>
              <button onClick={refetch} className="btn btn-primary">
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-lg section-md">
      <div className="card">
        {/* Header */}
        <div className="card-header">
          <div className="flex-between">
            <div>
              <h2 className="card-title">User Management</h2>
              <p className="text-sm text-gray-600 mt-1">
                Create and manage user accounts with role-based permissions
              </p>
            </div>
            {canCreateUsers && (
              <button
                className="btn btn-primary"
                onClick={() => openModal('createUser')}
                disabled={isCreating}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Create User
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="card-body border-b border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* Search */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
              <input
                type="text"
                className="input pl-10"
                placeholder="Search users..."
                value={filters.search}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>

            {/* Role Filter */}
            <select
              className="input"
              value={filters.role}
              onChange={(e) => handleFilterChange('role', e.target.value)}
            >
              <option value="">All Roles</option>
              <option value={USER_ROLES.PRODUCT_USER}>Product User</option>
              <option value={USER_ROLES.PRODUCT_ADMIN}>Product Admin</option>
              <option value={USER_ROLES.COMPLIANCE_USER}>Compliance User</option>
              <option value={USER_ROLES.COMPLIANCE_ADMIN}>Compliance Admin</option>
              <option value={USER_ROLES.SENIOR_MANAGER}>Senior Manager</option>
              <option value={USER_ROLES.ADMIN}>Administrator</option>
            </select>

            {/* Status Filter - Updated to match backend boolean format */}
            <select
              className="input"
              value={filters.isActive}
              onChange={(e) => handleFilterChange('isActive', e.target.value)}
            >
              <option value="">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>

            {/* Team Filter */}
            <input
              type="text"
              className="input"
              placeholder="Filter by team..."
              value={filters.team}
              onChange={(e) => handleFilterChange('team', e.target.value)}
            />
          </div>

          {/* Filter Actions */}
          <div className="flex-between">
            <div className="text-sm text-gray-600">
              {pagination.totalCount > 0 && (
                <>
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.totalCount)} of{' '}
                  {pagination.totalCount} users
                </>
              )}
            </div>
            <div className="flex gap-2">
              <button
                className="btn btn-ghost btn-sm"
                onClick={handleClearFilters}
              >
                Clear Filters
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleExport}
                disabled={isExporting}
              >
                {isExporting ? (
                  <>
                    <svg className="animate-spin w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Exporting...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    Export CSV
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* User Table */}
        <div className="table-container">
          <table className="table table-modern">
            <thead className="table-header">
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Username</th>
                <th>Role</th>
                <th>Status</th>
                <th>Team</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody className="table-body">
              {users.length > 0 ? (
                users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-700">
                            {user.fullName?.charAt(0) || 'U'}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{user.fullName}</div>
                          <div className="text-xs text-gray-500">ID: {user.id.slice(-8)}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="text-sm text-gray-700">{user.email}</span>
                    </td>
                    <td>
                      <span className="text-sm text-gray-700">{user.username}</span>
                    </td>
                    <td>
                      <span className={`badge ${getRoleBadgeClass(user.role)}`}>
                        {user.role?.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${getStatusBadgeClass(user.isActive)}`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <span className="text-sm text-gray-700">{user.team || '-'}</span>
                    </td>
                    <td>
                      <span className="text-sm text-gray-600">{formatDate(user.createdAt)}</span>
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => openModal('userDetail', user)}
                          title="View Details"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        
                        {canUpdateUsers && (
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => openModal('editUser', user)}
                            title="Edit User"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        )}
                        
                        {canResetPasswords && (
                          <button
                            className="btn btn-ghost btn-sm text-orange-600"
                            onClick={() => openModal('resetPassword', user)}
                            title="Reset Password"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="text-center py-12">
                    <div className="table-empty">
                      <svg className="table-empty-icon" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                      </svg>
                      <h3 className="table-empty-title">No Users Found</h3>
                      <p className="table-empty-description">
                        {filters.search || filters.role || filters.team || filters.isActive ? 
                          'No users match your current filters. Try adjusting your search criteria.' :
                          'No users have been created yet. Click "Create User" to add the first user.'
                        }
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="card-body border-t border-gray-100">
            <div className="flex-between">
              <div className="text-sm text-gray-600">
                Page {pagination.page} of {pagination.totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={!pagination.hasPrev}
                >
                  Previous
                </button>
                <div className="flex gap-1">
                  {[...Array(Math.min(5, pagination.totalPages))].map((_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button
                        key={pageNum}
                        className={`btn btn-sm ${pageNum === pagination.page ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => handlePageChange(pageNum)}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={!pagination.hasNext}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateUserModal
        isOpen={modals.createUser}
        onClose={() => closeModal('createUser')}
        onCreateUser={handleCreateUser}
        currentUserRole={currentUserRole}
      />

      {modals.editUser && selectedUser && (
        <EditUserModal
          isOpen={modals.editUser}
          onClose={() => closeModal('editUser')}
          onUpdateUser={handleEditUser}
          user={selectedUser}
          currentUserRole={currentUserRole}
        />
      )}

      {modals.userDetail && selectedUser && (
        <UserDetailModal
          isOpen={modals.userDetail}
          onClose={() => closeModal('userDetail')}
          user={selectedUser}
        />
      )}

      {modals.resetPassword && selectedUser && (
        <ResetPasswordModal
          isOpen={modals.resetPassword}
          onClose={() => closeModal('resetPassword')}
          onResetPassword={handleResetPassword}
          user={selectedUser}
        />
      )}
    </div>
  );
};

export default UserManagement;