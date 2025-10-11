import { useEffect, useCallback, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { tasksApi, invalidateTaskCache, updateTaskInCache } from '../redux/api/tasksApi';

 
export const useTaskSync = ({
  taskId,
  autoRefresh = true,
  refreshInterval = 30000,
  onUpdate
} = {}) => {
  const dispatch = useDispatch();
  const intervalRef = useRef(null);
  const lastUpdateRef = useRef(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleTaskUpdate = (event) => {
      const { taskId: updatedTaskId, status, ...updates } = event.detail;
      
      if (taskId && updatedTaskId === taskId) {
        updateTaskInCache(dispatch, taskId, {
          status,
          ...updates,
          updatedAt: new Date().toISOString()
        });
        
        onUpdate?.(updates);
        
        lastUpdateRef.current = Date.now();
      }
    };

    window.addEventListener('taskUpdated', handleTaskUpdate);
    
    return () => {
      window.removeEventListener('taskUpdated', handleTaskUpdate);
    };
  }, [taskId, dispatch, onUpdate]);

  useEffect(() => {
    if (!autoRefresh || !taskId) return;

    intervalRef.current = setInterval(() => {
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

  const refresh = useCallback(() => {
    if (taskId) {
      invalidateTaskCache(dispatch, taskId);
      lastUpdateRef.current = Date.now();
    }
  }, [taskId, dispatch]);

  const broadcastUpdate = useCallback((updates) => {
    if (taskId) {
      window.dispatchEvent(new CustomEvent('taskUpdated', {
        detail: { taskId, ...updates }
      }));
    }
  }, [taskId]);

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

  useEffect(() => {
    const handleTaskUpdate = (event) => {
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

 
export const useTaskCacheManager = () => {
  const dispatch = useDispatch();

  const preloadTask = useCallback((taskId) => {
    dispatch(tasksApi.endpoints.getTaskById.initiate(taskId));
  }, [dispatch]);

  const warmCache = useCallback((taskIds) => {
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