import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { selectUserRole } from '../../../redux/slices/authSlice';
import { useGetAbsencesQuery, useCreateAbsenceMutation, useDeleteAbsenceMutation } from '../../../redux/api/usersApi';
import { hasPermission, PERMISSIONS } from '../../../utils/roles';
import AddAbsenceModal from './AddAbsenceModal';

const AbsenceTracker = () => {
  const [showAddAbsenceModal, setShowAddAbsenceModal] = useState(false);
  const [page, setPage] = useState(1);
  
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
    limit: 20 
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
 
  const absences = useMemo(() => 
    Array.isArray(absencesData) ? absencesData : (absencesData?.absences || []), 
    [absencesData]
  );

  const pagination = useMemo(() => 
    absencesData?.pagination, 
    [absencesData?.pagination]
  );
 
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
     } catch (error) {
      console.error('Failed to create absence:', error);
      throw error;
    }
  }, [createAbsence]);

  const handleDeleteAbsence = useCallback(async (absenceId) => {
    if (!canManageAbsences) return;
    
    if (window.confirm('Are you sure you want to delete this absence record?')) {
      try {
        await deleteAbsence(absenceId).unwrap();
       } catch (error) {
        console.error('Failed to delete absence:', error);
      }
    }
  }, [canManageAbsences, deleteAbsence]);

  const handleCloseModal = useCallback(() => {
    setShowAddAbsenceModal(false);
  }, []);

  const handlePageChange = useCallback((newPage) => {
    setPage(newPage);
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
      <div className="filter-panel mb-5">
        <div className="card-header">
          <div className="flex-between">
            <h2 className="card-title">Compliance User Absence Tracker</h2>
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

        {pagination && (
          <div className="card-body pt-4 border-b border-gray-100">
            <div className="text-sm text-gray-600">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.totalCount)} of {pagination.totalCount} absence records
            </div>
          </div>
        )}

        <div className="table-container">
          <table className="table table-modern">
            <thead className="table-header">
              <tr>
                <th>User</th>
                <th>From Date</th>
                <th>To Date</th>
                <th>Reason</th>
                <th>Created By</th>
                <th>Created At</th>
              </tr>
            </thead>
            <tbody className="table-body">
              {absences.length > 0 ? (
                absences.map((absence) => (
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
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center py-12">
                    <div className="table-empty">
                      <svg className="table-empty-icon" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                      </svg>
                      <h3 className="table-empty-title">No Absence Records</h3>
                      <p className="table-empty-description">
                        No absence records found. 
                        {canManageAbsences && ' Click "Add Absence" to create a new record.'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {pagination && pagination.totalPages > 1 && (
          <div className="card-body border-t border-gray-100">
            <div className="flex-between">
              <div className="text-sm text-gray-600">
                Page {pagination.page} of {pagination.totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => handlePageChange(page - 1)}
                  disabled={!pagination.hasPrev}
                >
                  Previous
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => handlePageChange(page + 1)}
                  disabled={!pagination.hasNext}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
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