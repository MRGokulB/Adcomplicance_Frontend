// src/components/Tasks/TaskMain.jsx - Cleaned UI with better action placement
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectUserRole } from "../../redux/slices/authSlice";
import { useGetTaskByIdQuery } from "../../redux/api/tasksApi";
import { hasPermission, PERMISSIONS } from "../../utils/roles";
import TaskHeader from "./TaskHeader/TaskHeader";
import VersionControl from "./VersionControl/VersionControl";
import ExchangeApproval from "./ExchangeApproval/ExchangeApproval";

const TaskMain = () => {
  const { taskId } = useParams();
  const userRole = useSelector(selectUserRole);
  const [comment, setComment] = useState('');
  
  // Local state for connection status
  const [isConnected, setIsConnected] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState(null);

  // Enhanced task query with better error handling
  const {
  data: task,
  isLoading,
  isError,
  error,
  refetch,
  isFetching
} = useGetTaskByIdQuery(taskId, {
  skip: !taskId,
  refetchOnMountOrArgChange: true,
  refetchOnFocus: true,
  refetchOnReconnect: true
});
 

  // Permission checks
  const canViewTask = hasPermission(userRole, PERMISSIONS.TASK_READ_ALL) ||
                     hasPermission(userRole, PERMISSIONS.TASK_READ_TEAM) ||
                     hasPermission(userRole, PERMISSIONS.TASK_READ_OWN) ||
                     hasPermission(userRole, PERMISSIONS.TASK_READ_ASSIGNED);

  // Enhanced error handling
  const getErrorMessage = () => {
    if (error?.status === 404) {
      return 'Task not found or you do not have permission to view it.';
    }
    if (error?.status === 403) {
      return 'You do not have permission to access this task.';
    }
    if (error?.status >= 500) {
      return 'Server error occurred. Please try again later.';
    }
    if (error?.name === 'NetworkError' || error?.message?.includes('fetch')) {
      setIsConnected(false);
      return 'Connection lost. Check your internet connection.';
    }
    return error?.data?.message || 'An error occurred while fetching task details';
  };

  // Monitor connection status
  useEffect(() => {
  const handleOnline = () => {
    setIsConnected(true);
    refetch(); // Use refetch instead
  };
  
  const handleOffline = () => setIsConnected(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}, [refetch]);

  // Enhanced refresh with better error handling
  const handleRefresh = async () => {
  try {
    setLastSyncTime(new Date());
    const result = await refetch();
    if (result.data) {
      setIsConnected(true);
    }
  } catch (error) {
    console.error('Failed to refresh task:', error);
    setIsConnected(false);
  }
};

  // Auto-retry mechanism for failed requests
  useEffect(() => {
    if (isError && !isConnected) {
      const retryTimer = setTimeout(() => {
        console.log('Attempting to reconnect...');
        handleRefresh();
      }, 5000); // Retry after 5 seconds

      return () => clearTimeout(retryTimer);
    }
  }, [isError, isConnected]);

  // Check if task classification is needed
  const needsClassification = task && !task.taskType && task.status === 'OPEN';

  // Enhanced loading state with connection status
  if (isLoading && !task) {
    return (
      <div className="container-lg section-md">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <span className="text-gray-600">Loading task details...</span>
            <div className="text-xs text-gray-500 mt-2">
              {taskId && `Task ID: ${taskId}`}
            </div>
            {!isConnected && (
              <div className="text-xs text-red-500 mt-2">
                Connection issues detected
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Enhanced error state with retry functionality
  if (isError) {
    return (
      <div className="container-lg section-md">
        <div className="text-center py-12">
          {/* Connection status indicator */}
          {!isConnected && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center justify-center gap-2 text-red-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium">Connection Lost</span>
              </div>
              <p className="text-xs text-red-500 mt-1">
                Attempting to reconnect automatically...
              </p>
            </div>
          )}
          
          <div className="text-red-600 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load task</h3>
          <p className="text-gray-600 mb-4 max-w-md mx-auto">
            {getErrorMessage()}
          </p>
          
          <div className="flex gap-2 justify-center">
            <button 
              onClick={handleRefresh} 
              className="btn btn-primary"
              disabled={isFetching}
            >
              {isFetching ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Retrying...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Try Again
                </>
              )}
            </button>
            <button 
              onClick={() => window.history.back()} 
              className="btn btn-secondary"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Permission check
  if (!canViewTask) {
    return (
      <div className="container-lg section-md">
        <div className="text-center py-12">
          <div className="text-yellow-600 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Restricted</h3>
          <p className="text-gray-600 mb-4">
            You don't have permission to view this task. Contact your administrator if you believe this is an error.
          </p>
          <button onClick={() => window.history.back()} className="btn btn-primary">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // No task found state
  if (!task) {
    return (
      <div className="container-lg section-md">
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Task Not Found</h3>
          <p className="text-gray-600 mb-4">
            The requested task could not be found. It may have been deleted or moved.
          </p>
          <div className="flex gap-2 justify-center">
            <button onClick={handleRefresh} className="btn btn-secondary">
              Retry
            </button>
            <button onClick={() => window.history.back()} className="btn btn-primary">
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-lg section-md">

      {/* Connection Status Banner - Only show when offline */}
      {!isConnected && (
        <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-red-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium">Connection Lost</span>
              <span className="text-xs text-red-500">- Attempting to reconnect...</span>
            </div>
            <button 
              onClick={handleRefresh}
              className="btn btn-outline btn-sm text-red-600 border-red-300 hover:bg-red-100"
              disabled={isFetching}
            >
              {isFetching ? 'Retrying...' : 'Retry Now'}
            </button>
          </div>
        </div>
      )}

      {/* Classification Notice */}
      {needsClassification && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div>
              <div className="font-medium text-yellow-800">Task Classification Required</div>
              <div className="text-sm text-yellow-700">
                This task needs to be classified as Internal or Exchange type before proceeding.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Task Header with integrated actions */}
      <TaskHeader 
        task={task} 
        refetch={refetch} 
        comment={comment} 
        setComment={setComment} 
        onRefresh={handleRefresh}
        // Pass additional props for integrated actions
        isConnected={isConnected}
        isFetching={isFetching}
        lastSyncTime={lastSyncTime}
      />
      
      {/* Version Control Section - Show for all classified tasks */}
      {task.taskType && (
        <div className="mt-8">
          <VersionControl task={task} onRefresh={handleRefresh} />
        </div>
      )}
      
      {/* Exchange Approval Section - Only for EXCHANGE tasks */}
      {task.taskType === 'EXCHANGE' && (
        <div className="mt-8">
          <ExchangeApproval task={task} onRefresh={handleRefresh} />
        </div>
      )}

      {/* Clean Task Footer - Essential info only */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Task ID: {task.uin || task.id}</span>
            </div>
            
            <span>• Created: {new Date(task.createdAt).toLocaleDateString()}</span>
            
            {/* Connection Status Indicator */}
            <div className="flex items-center gap-1">
              <span>•</span>
              {isConnected ? (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-green-600">Online</span>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span className="text-red-600">Offline</span>
                </div>
              )}
            </div>
            
            {lastSyncTime && (
              <span className="text-green-600">• Last synced: {lastSyncTime.toLocaleTimeString()}</span>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={handleRefresh}
              className={`flex items-center gap-1 text-xs ${
                isConnected ? 'text-blue-600 hover:text-blue-800' : 'text-gray-400'
              } transition-colors duration-200`}
              title="Refresh task data"
              disabled={!isConnected || isFetching}
            >
              <svg className={`w-3 h-3 ${isFetching ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {isFetching ? 'Syncing...' : 'Refresh'}
            </button>
            
            <button 
              onClick={() => window.history.back()}
              className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800 transition-colors duration-200"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Tasks
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskMain;