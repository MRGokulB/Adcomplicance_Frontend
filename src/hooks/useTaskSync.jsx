// src/hooks/useTaskSync.js - Custom hook for managing task synchronization
import { useEffect, useCallback, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { tasksApi, invalidateTaskCache, updateTaskInCache } from '../redux/api/tasksApi';

/**
 * Custom hook for managing real-time task synchronization across components
 * @param {Object} options - Configuration options
 * @param {string} options.taskId - Task ID to sync
 * @param {boolean} options.autoRefresh - Enable automatic refresh
 * @param {number} options.refreshInterval - Refresh interval in milliseconds
 * @param {Function} options.onUpdate - Callback when task updates
 */
export const useTaskSync = ({
  taskId,
  autoRefresh = true,
  refreshInterval = 30000,
  onUpdate
} = {}) => {
  const dispatch = useDispatch();
  const intervalRef = useRef(null);
  const lastUpdateRef = useRef(null);

  // Clear intervals on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Listen for task update events from other components
  useEffect(() => {
    const handleTaskUpdate = (event) => {
      const { taskId: updatedTaskId, status, ...updates } = event.detail;
      
      if (taskId && updatedTaskId === taskId) {
        // Update cache immediately
        updateTaskInCache(dispatch, taskId, {
          status,
          ...updates,
          updatedAt: new Date().toISOString()
        });
        
        // Call update callback
        onUpdate?.(updates);
        
        // Track last update time
        lastUpdateRef.current = Date.now();
      }
    };

    window.addEventListener('taskUpdated', handleTaskUpdate);
    
    return () => {
      window.removeEventListener('taskUpdated', handleTaskUpdate);
    };
  }, [taskId, dispatch, onUpdate]);

  // Auto-refresh mechanism
  useEffect(() => {
    if (!autoRefresh || !taskId) return;

    intervalRef.current = setInterval(() => {
      // Only refresh if no recent updates
      const timeSinceUpdate = Date.now() - (lastUpdateRef.current || 0);
      
      if (timeSinceUpdate > refreshInterval / 2) {
        invalidateTaskCache(dispatch, taskId);
      }
    }, refreshInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh, taskId, refreshInterval, dispatch]);

  // Manual refresh function
  const refresh = useCallback(() => {
    if (taskId) {
      invalidateTaskCache(dispatch, taskId);
      lastUpdateRef.current = Date.now();
    }
  }, [taskId, dispatch]);

  // Broadcast update function for other components
  const broadcastUpdate = useCallback((updates) => {
    if (taskId) {
      window.dispatchEvent(new CustomEvent('taskUpdated', {
        detail: { taskId, ...updates }
      }));
    }
  }, [taskId]);

  // Optimistic update function
  const optimisticUpdate = useCallback((updates) => {
    if (taskId) {
      updateTaskInCache(dispatch, taskId, {
        ...updates,
        updatedAt: new Date().toISOString()
      });
    }
  }, [taskId, dispatch]);

  return {
    refresh,
    broadcastUpdate,
    optimisticUpdate
  };
};

/**
 * Hook for managing task list synchronization
 */
export const useTaskListSync = ({
  autoRefresh = true,
  refreshInterval = 60000,
  onUpdate
} = {}) => {
  const dispatch = useDispatch();
  const intervalRef = useRef(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Listen for any task updates that might affect the list
  useEffect(() => {
    const handleTaskUpdate = (event) => {
      // Invalidate list cache when any task updates
      dispatch(tasksApi.util.invalidateTags([
        { type: 'Task', id: 'LIST' }
      ]));
      
      onUpdate?.(event.detail);
    };

    window.addEventListener('taskUpdated', handleTaskUpdate);
    
    return () => {
      window.removeEventListener('taskUpdated', handleTaskUpdate);
    };
  }, [dispatch, onUpdate]);

  // Auto-refresh for task lists
  useEffect(() => {
    if (!autoRefresh) return;

    intervalRef.current = setInterval(() => {
      dispatch(tasksApi.util.invalidateTags([
        { type: 'Task', id: 'LIST' },
        { type: 'TaskBucket', id: 'LIST' },
        { type: 'TaskStats', id: 'DASHBOARD' }
      ]));
    }, refreshInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoRefresh, refreshInterval, dispatch]);

  const refreshList = useCallback(() => {
    dispatch(tasksApi.util.invalidateTags([
      { type: 'Task', id: 'LIST' },
      { type: 'TaskBucket', id: 'LIST' }
    ]));
  }, [dispatch]);

  return { refreshList };
};

/**
 * Hook for managing cache warming and preloading
 */
export const useTaskCacheManager = () => {
  const dispatch = useDispatch();

  const preloadTask = useCallback((taskId) => {
    // Trigger task fetch if not in cache
    dispatch(tasksApi.endpoints.getTaskById.initiate(taskId));
  }, [dispatch]);

  const warmCache = useCallback((taskIds) => {
    // Preload multiple tasks
    taskIds.forEach(id => {
      dispatch(tasksApi.endpoints.getTaskById.initiate(id));
    });
  }, [dispatch]);

  const clearTaskCache = useCallback((taskId) => {
    invalidateTaskCache(dispatch, taskId);
  }, [dispatch]);

  const clearAllCache = useCallback(() => {
    dispatch(tasksApi.util.resetApiState());
  }, [dispatch]);

  return {
    preloadTask,
    warmCache,
    clearTaskCache,
    clearAllCache
  };
};

export default useTaskSync;