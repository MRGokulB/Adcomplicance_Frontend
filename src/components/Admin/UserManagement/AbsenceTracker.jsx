import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { selectUserRole } from '../../../redux/slices/authSlice';
import { useGetAbsencesQuery, useCreateAbsenceMutation, useDeleteAbsenceMutation } from '../../../redux/api/usersApi';
import { hasPermission, PERMISSIONS } from '../../../utils/roles';
import AddAbsenceModal from './AddAbsenceModal';

const AbsenceTracker = () => {
  const [showAddAbsenceModal, setShowAddAbsenceModal] = useState(false);
  const [page, setPage] = useState(1);
  const [searchUser, setSearchUser] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  
  const currentUserRole = useSelector(selectUserRole);

  const [isPageVisible, setIsPageVisible] = useState(!document.hidden);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPageVisible(!document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const absenceParams = useMemo(() => ({ 
    page, 
    limit: 100 
  }), [page]);

  const {
    data: absencesData,
    isLoading,
    isError,
    error,
    refetch
  } = useGetAbsencesQuery(absenceParams, {
    refetchOnMountOrArgChange: 60,  
    skip: !hasPermission(currentUserRole, PERMISSIONS.ABSENCE_READ_ALL) && 
          !hasPermission(currentUserRole, PERMISSIONS.ABSENCE_MANAGE),
  });

  const [createAbsence, { isLoading: isCreating }] = useCreateAbsenceMutation();
  const [deleteAbsence, { isLoading: isDeleting }] = useDeleteAbsenceMutation();

  const canManageAbsences = useMemo(() => 
    hasPermission(currentUserRole, PERMISSIONS.ABSENCE_MANAGE), 
    [currentUserRole]
  );

  const canViewAbsences = useMemo(() => 
    hasPermission(currentUserRole, PERMISSIONS.ABSENCE_READ_ALL) || canManageAbsences, 
    [currentUserRole, canManageAbsences]
  );
 
  const allAbsences = useMemo(() => 
    Array.isArray(absencesData) ? absencesData : (absencesData?.absences || []), 
    [absencesData]
  );

  // Calculate absence summary statistics
  const absenceSummary = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let totalAbsences = 0;
    let activeAbsences = 0;
    let upcomingAbsences = 0;

    allAbsences.forEach(absence => {
      totalAbsences++;
      const absenceFrom = new Date(absence.fromDate);
      const absenceTo = new Date(absence.toDate);
      absenceFrom.setHours(0, 0, 0, 0);
      absenceTo.setHours(23, 59, 59, 999);

      if (absenceFrom <= today && absenceTo >= today) {
        activeAbsences++;
      } else if (absenceFrom > today) {
        upcomingAbsences++;
      }
    });

    return { totalAbsences, activeAbsences, upcomingAbsences };
  }, [allAbsences]);

  // Filter absences based on search and date filters
  const filteredAbsences = useMemo(() => {
    let filtered = [...allAbsences];

    // Search by user name or email
    if (searchUser.trim()) {
      const searchLower = searchUser.toLowerCase();
      filtered = filtered.filter(absence => {
        const userName = absence.user?.fullName?.toLowerCase() || '';
        const userEmail = absence.user?.email?.toLowerCase() || '';
        return userName.includes(searchLower) || userEmail.includes(searchLower);
      });
    }

    // Filter by date range
    if (fromDate) {
      const fromDateTime = new Date(fromDate);
      fromDateTime.setHours(0, 0, 0, 0);
      filtered = filtered.filter(absence => {
        const absenceToDate = new Date(absence.toDate);
        absenceToDate.setHours(23, 59, 59, 999);
        return absenceToDate >= fromDateTime;
      });
    }

    if (toDate) {
      const toDateTime = new Date(toDate);
      toDateTime.setHours(23, 59, 59, 999);
      filtered = filtered.filter(absence => {
        const absenceFromDate = new Date(absence.fromDate);
        absenceFromDate.setHours(0, 0, 0, 0);
        return absenceFromDate <= toDateTime;
      });
    }

    // Filter by status (active, inactive, all)
    if (statusFilter !== 'all') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      filtered = filtered.filter(absence => {
        const absenceFrom = new Date(absence.fromDate);
        const absenceTo = new Date(absence.toDate);
        absenceFrom.setHours(0, 0, 0, 0);
        absenceTo.setHours(23, 59, 59, 999);

        const isActive = absenceFrom <= today && absenceTo >= today;

        if (statusFilter === 'active') {
          return isActive;
        } else if (statusFilter === 'inactive') {
          return !isActive;
        }
        return true;
      });
    }

    return filtered;
  }, [allAbsences, searchUser, fromDate, toDate, statusFilter]);

  const handleAddAbsence = useCallback(() => {
    if (canManageAbsences) {
      setShowAddAbsenceModal(true);
    }
  }, [canManageAbsences]);

  const handleAddAbsenceSubmit = useCallback(async (absenceData) => {
    try {
      await createAbsence({
        userId: absenceData.user,
        fromDate: absenceData.fromDate,
        toDate: absenceData.toDate,
        reason: absenceData.reason || 'No reason provided'
      }).unwrap();

      setShowAddAbsenceModal(false);
      refetch();
    } catch (error) {
      console.error('Failed to create absence:', error);
      throw error;
    }
  }, [createAbsence, refetch]);

  const handleDeleteAbsence = useCallback(async (absenceId) => {
    if (!canManageAbsences) return;
    
    if (window.confirm('Are you sure you want to delete this absence record?')) {
      try {
        await deleteAbsence(absenceId).unwrap();
        refetch();
      } catch (error) {
        console.error('Failed to delete absence:', error);
      }
    }
  }, [canManageAbsences, deleteAbsence, refetch]);

  const handleCloseModal = useCallback(() => {
    setShowAddAbsenceModal(false);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchUser('');
    setFromDate('');
    setToDate('');
    setStatusFilter('all');
    setPage(1);
    setShowFilters(false);
  }, []);

  const formatDate = useCallback((dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }, []);

  const formatDateTime = useCallback((dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  const hasActiveFilters = useMemo(() => 
    searchUser.trim() !== '' || fromDate !== '' || toDate !== '' || statusFilter !== 'all',
    [searchUser, fromDate, toDate, statusFilter]
  );

  if (isLoading) {
    return (
      <div className="container-lg section-md">

        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading absences...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load absences</h3>
              <p className="text-gray-600 mb-4">{error?.data?.message || 'An error occurred while fetching absences'}</p>
              <button onClick={refetch} className="btn btn-primary">
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!canViewAbsences) {
    return (
      <div className="container-lg section-md">
        <div className="card">
          <div className="card-body">
            <div className="text-center py-12">
              <div className="text-yellow-600 mb-4">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Restricted</h3>
              <p className="text-gray-600">You don't have permission to view absence records.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-lg section-md">
      <div className="flex-between items-center mb-6">
        <div>
          <h1 className="text-heading-2">Compliance User Absence Tracker</h1>
        </div>
      </div>

      

      <div className="filter-panel">
        <div className="card-header">
          <div className="flex-between">
            <h2 className="card-title">Filters</h2>
            {canManageAbsences && (
              <button
                className="btn btn-primary"
                onClick={handleAddAbsence}
                disabled={isCreating}
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
                {isCreating ? 'Adding...' : 'Add Absence'}
              </button>
            )}
          </div>
        </div>

        <div className="card-body border-b border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="exchange-form-label">Search User</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Name..."
                  className="input pl-10"
                  value={searchUser}
                  onChange={(e) => {
                    setSearchUser(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
            </div>

            <div>
              <label className="exchange-form-label">From Date</label>
              <input
                type="date"
                className="exchange-date-input"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            <div>
              <label className="exchange-form-label">To Date</label>
              <input
                type="date"
                className="exchange-date-input"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            <div>
              <label className="exchange-form-label">Status</label>
              <select
                className="exchange-form-select"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="all">All Absences</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>

            <div className="flex items-end">
              {hasActiveFilters && (
                <button
                  className="btn btn-secondary w-full"
                  onClick={handleClearFilters}
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="card-body pt-4 border-b border-gray-100">
          <div className="text-sm text-gray-600">
            Showing {filteredAbsences.length} of {allAbsences.length} absence records
            {hasActiveFilters && ' (filtered)'}
          </div>
        </div>


      </div>

      <div className="table-container">
        <table className="table table-modern">
          <thead className="table-header">
            <tr>
              <th>User</th>
              <th>From Date</th>
              <th>To Date</th>
              <th>Status</th>
              <th>Reason</th>
              <th>Created By</th>
              <th>Created At</th>
            </tr>
          </thead>
          <tbody className="table-body">
            {filteredAbsences.length > 0 ? (
              filteredAbsences.map((absence) => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const absenceFrom = new Date(absence.fromDate);
                const absenceTo = new Date(absence.toDate);
                absenceFrom.setHours(0, 0, 0, 0);
                absenceTo.setHours(23, 59, 59, 999);
                const isActive = absenceFrom <= today && absenceTo >= today;

                return (
                  <tr key={absence.id}>
                    <td>
                      <span className="font-medium text-gray-900">
                        {absence.user?.fullName || absence.user?.username || 'Unknown User'}
                      </span>
                    </td>
                    <td>
                      <span className="text-sm text-gray-700">
                        {formatDate(absence.fromDate)}
                      </span>
                    </td>
                    <td>
                      <span className="text-sm text-gray-700">
                        {formatDate(absence.toDate)}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${isActive ? 'badge-success' : 'badge-secondary'}`}>
                        {isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <span className="text-sm text-gray-700">
                        {absence.reason || 'No reason provided'}
                      </span>
                    </td>
                    <td>
                      <span className="text-sm text-gray-700">
                        {absence.createdBy?.fullName || absence.createdBy?.username || 'System'}
                      </span>
                    </td>
                    <td>
                      <span className="text-sm text-gray-600">
                        {formatDateTime(absence.createdAt)}
                      </span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={canManageAbsences ? 8 : 7} className="text-center py-12">
                  <div className="table-empty">
                    <svg className="table-empty-icon" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                    <h3 className="table-empty-title">No Absence Records</h3>
                    <p className="table-empty-description">
                      {hasActiveFilters
                        ? 'No records match your filters. Try adjusting your search criteria.'
                        : 'No absence records found.'}
                      {canManageAbsences && !hasActiveFilters && ' Click "Add Absence" to create a new record.'}
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="card-body border-b border-gray-100 pb-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700">Total Absences</p>
                  <p className="text-2xl font-bold text-blue-900 mt-1">{absenceSummary.totalAbsences}</p>
                </div>
                <svg className="w-8 h-8 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700">Active Absences</p>
                  <p className="text-2xl font-bold text-green-900 mt-1">{absenceSummary.activeAbsences}</p>
                </div>
                <svg className="w-8 h-8 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            </div>

            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-4 border border-yellow-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-yellow-700">Upcoming Absences</p>
                  <p className="text-2xl font-bold text-yellow-900 mt-1">{absenceSummary.upcomingAbsences}</p>
                </div>
                <svg className="w-8 h-8 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          </div>
        </div>

      <AddAbsenceModal
        isOpen={showAddAbsenceModal}
        onClose={handleCloseModal}
        onAddAbsence={handleAddAbsenceSubmit}
      />
    </div>
  );
};

export default AbsenceTracker;