import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from "react-router-dom";
import { selectCurrentUser, selectUserRole } from '../../redux/slices/authSlice';
import { usePermissions, CanCreateTask, AdminOnly, ManagerAccess, ComplianceAccess } from '../PermissionWrapper';
import { 
  useGetDashboardQuery, 
  useGetQuickStatsQuery, 
  useGetTaskBucketsQuery,
  useGetWorkloadChartQuery,
  useGetActivityFeedQuery,
  useGetPerformanceMetricsQuery
} from '../../redux/api/dashboardApi';
import CreateNewAdTask from '../Tasks/NewTask';
import { USER_ROLES } from '../../utils/roles';
import AdvancedTable from './AdvancedTable';

const Dashboard = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastUserAction, setLastUserAction] = useState(Date.now());
  
  const currentUser = useSelector(selectCurrentUser);
  const userRole = useSelector(selectUserRole);
  const permissions = usePermissions();
  const navigate = useNavigate();

  useEffect(() => {
    const handleVisibilityChange = () => {
      const visible = document.visibilityState === 'visible';
      setIsVisible(visible);
      
      if (visible) {
        setLastUserAction(Date.now());
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const [userActive, setUserActive] = useState(true);
  
  useEffect(() => {
    const resetActivityTimer = () => {
      setLastUserAction(Date.now());
      setUserActive(true);
    };
    
    window.addEventListener('click', resetActivityTimer);
    window.addEventListener('keydown', resetActivityTimer);
    
    const idleCheckInterval = setInterval(() => {
      const timeSinceLastAction = Date.now() - lastUserAction;
      if (timeSinceLastAction > 120000) {  
        setUserActive(false);
      }
    }, 30000);  
    
    return () => {
      window.removeEventListener('click', resetActivityTimer);
      window.removeEventListener('keydown', resetActivityTimer);
      clearInterval(idleCheckInterval);
    };
  }, [lastUserAction]);

  const getPollingInterval = (baseInterval) => {
    if (!isVisible) return 0;  
    if (userActive) return baseInterval;  
    return baseInterval * 2;  
  };

  const criticalPolling = getPollingInterval(45000);
  
  const importantPolling = getPollingInterval(60000);
  
  const backgroundPolling = getPollingInterval(120000);

  const { 
    data: dashboardData, 
    isLoading: isDashboardLoading, 
    error: dashboardError,
    refetch: refetchDashboard 
  } = useGetDashboardQuery(undefined, {
    pollingInterval: importantPolling,
    skip: !isVisible,
  });

  const { 
    data: quickStats, 
    isLoading: isStatsLoading,
    refetch: refetchStats 
  } = useGetQuickStatsQuery(undefined, {
    pollingInterval: criticalPolling,  
    skip: !isVisible,
  });

  const { 
    data: taskBuckets, 
    isLoading: isBucketsLoading,
    refetch: refetchBuckets 
  } = useGetTaskBucketsQuery(undefined, {
    pollingInterval: 0,  
  });

  const { 
    data: workloadChart, 
    isLoading: isWorkloadLoading,
    refetch: refetchWorkload 
  } = useGetWorkloadChartQuery(undefined, {
    pollingInterval: backgroundPolling,  
    skip: !isVisible,
  });

  const activityParams = React.useMemo(() => {
    const params = { limit: 10 };
    
    if ([USER_ROLES.COMPLIANCE_USER, USER_ROLES.PRODUCT_USER].includes(userRole)) {
      params.assignedToMe = true;  
    }
    
    return params;
  }, [userRole]);

  const { 
    data: activityFeed, 
    isLoading: isActivityLoading,
    refetch: refetchActivity 
  } = useGetActivityFeedQuery(activityParams, {
    pollingInterval: criticalPolling,  
    skip: !isVisible,
  });

  const { 
    data: performanceMetrics, 
    isLoading: isMetricsLoading,
    refetch: refetchMetrics 
  } = useGetPerformanceMetricsQuery({}, {   
    pollingInterval: backgroundPolling,
    skip: !permissions.isAdmin || !isVisible,
  });

  const handleRefreshAll = useCallback(() => {
    setLastUserAction(Date.now());  
    refetchDashboard();
    refetchStats();
    refetchBuckets();
    refetchWorkload();
    refetchActivity();
    if (permissions.isAdmin) refetchMetrics();
  }, [refetchDashboard, refetchStats, refetchBuckets, refetchWorkload, refetchActivity, refetchMetrics, permissions.isAdmin]);

  const handleTaskCreated = useCallback(() => {
    refetchStats();
    refetchBuckets();
    refetchActivity();
  }, [refetchStats, refetchBuckets, refetchActivity]);

  const welcomeMessage = useCallback(() => {
    const roleMessages = {
      [USER_ROLES.ADMIN]: 'System Administrator Dashboard',
      [USER_ROLES.SENIOR_MANAGER]: 'Executive Dashboard',
      [USER_ROLES.COMPLIANCE_ADMIN]: 'Compliance Management Dashboard',
      [USER_ROLES.COMPLIANCE_USER]: 'Compliance Review Dashboard',
      [USER_ROLES.PRODUCT_ADMIN]: 'Product Team Dashboard',
      [USER_ROLES.PRODUCT_USER]: 'Content Creator Dashboard'
    };
    return roleMessages[userRole] || 'Dashboard';
  }, [userRole]);

  const metrics = React.useMemo(() => {
    const stats = quickStats || {};
    const buckets = taskBuckets || {};

    switch (userRole) {
      case USER_ROLES.ADMIN:
      case USER_ROLES.SENIOR_MANAGER:
        return [
          { title: isStatsLoading ? '...' : (stats.totalTasks || '0'), description: 'Total Active Tasks', color: 'card-accent-primary' },
          { title: isStatsLoading ? '...' : (stats.pendingApproval || '0'), description: 'Pending Approvals', color: 'card-accent-warning' },
          { title: isStatsLoading ? '...' : (stats.activeUsers || '0'), description: 'Users Online', color: 'card-accent-success' },
          { title: isStatsLoading ? '...' : (stats.expiringSoon || '0'), description: 'System Alerts', color: 'card-accent-error' }
        ];
      
      case USER_ROLES.COMPLIANCE_ADMIN:
      case USER_ROLES.COMPLIANCE_USER:
        return [
          { title: isStatsLoading ? '...' : (stats.pendingApproval || '0'), description: 'Pending Reviews', color: 'card-accent-warning' },
          { title: isBucketsLoading ? '...' : (buckets.completedThisMonth?.length || '0'), description: 'Approved Today', color: 'card-accent-success' },
          { title: isStatsLoading ? '...' : (stats.totalTasks || '0'), description: 'Exchange Approvals', color: 'card-accent-primary' },
          { title: isStatsLoading ? '...' : (stats.expiringSoon || '0'), description: 'Expiring Soon', color: 'card-accent-error' }
        ];
      
      case USER_ROLES.PRODUCT_ADMIN:
      case USER_ROLES.PRODUCT_USER:
        return [
          { title: isBucketsLoading ? '...' : (buckets.myTasks?.length || '0'), description: 'My Active Tasks', color: 'card-accent-primary' },
          { title: isStatsLoading ? '...' : (stats.pendingApproval || '0'), description: 'In Review', color: 'card-accent-warning' },
          { title: isBucketsLoading ? '...' : (buckets.completedThisMonth?.length || '0'), description: 'Approved', color: 'card-accent-success' },
          { title: '+', description: 'Create New Task', color: 'card-accent-error', isAction: true }
        ];
      
      default:
        return [
          { title: isBucketsLoading ? '...' : (buckets.myTasks?.length || '0'), description: 'My Tasks', color: 'card-accent-primary' },
          { title: isStatsLoading ? '...' : (dashboardData?.notifications?.length || '0'), description: 'Notifications', color: 'card-accent-warning' },
          { title: isBucketsLoading ? '...' : (buckets.completedThisMonth?.length || '0'), description: 'Completed', color: 'card-accent-success' },
          { title: 'Info', description: 'Welcome', color: 'card-accent-info' }
        ];
    }
  }, [userRole, isStatsLoading, isBucketsLoading, quickStats, taskBuckets, dashboardData]);

  const handleMetricClick = useCallback((metric) => {
    if (metric.isAction && metric.description === 'Create New Task') {
      if (permissions.canCreateTask) {
        setShowCreateModal(true);
      }
    }
  }, [permissions.canCreateTask]);

  const formatActivityItem = useCallback((item) => {
    const timeAgo = new Date(item.timestamp).toLocaleString();
    let displayText = '';
    const user = item.user || 'Someone';
    const taskInfo = item.task ? ` "${item.task.title}"` : '';
    
    switch (item.action) {
      case 'TASK_CREATED': displayText = `${user} created a new task${taskInfo}`; break;
      case 'TASK_UPDATED': displayText = `${user} updated task${taskInfo}`; break;
      case 'STATUS_CHANGED': displayText = `${user} changed status of${taskInfo}`; break;
      case 'COMMENT_ADDED': displayText = `${user} commented on${taskInfo}`; break;
      case 'VERSION_UPLOADED': displayText = `${user} uploaded a version for${taskInfo}`; break;
      case 'TASK_APPROVED': displayText = `${user} approved${taskInfo}`; break;
      case 'TASK_PUBLISHED': displayText = `${user} published${taskInfo}`; break;
      default: displayText = item.details || `${user} performed ${item.action}${taskInfo}`;
    }
    
    return { ...item, timeAgo, displayText };
  }, []);

  const getActivityType = useCallback((text) => {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('uploaded') || lowerText.includes('created')) {
      return {
        bgColor: 'bg-green-50', textColor: 'text-green-600',
        icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
      };
    } else if (lowerText.includes('comment') || lowerText.includes('added')) {
      return {
        bgColor: 'bg-blue-50', textColor: 'text-blue-600',
        icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
      };
    } else if (lowerText.includes('status') || lowerText.includes('changed') || lowerText.includes('updated')) {
      return {
        bgColor: 'bg-yellow-50', textColor: 'text-yellow-600',
        icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>,
        badge: 'Updated', badgeClass: 'badge-warning'
      };
    } else if (lowerText.includes('approved') || lowerText.includes('published')) {
      return {
        bgColor: 'bg-green-50', textColor: 'text-green-600',
        icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>,
        badge: 'Success', badgeClass: 'badge-success'
      };
    }
    return {
      bgColor: 'bg-gray-50', textColor: 'text-gray-600',
      icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    };
  }, []);

  return (
    <>
      <div className='container-lg'>
        <div className="flex-between items-center mb-6">
          <div className="flex-start items-center gap-4">
            <div>
              <h1 className="text-heading-2">{welcomeMessage()}</h1>
              <p className="text-caption mt-2">
                Welcome back, {currentUser?.fullName || 'User'}! 
                {userRole && (
                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    {userRole.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                )}
              </p>
            </div>
          </div>
          
          <button 
            onClick={handleRefreshAll}
            className="btn btn-secondary btn-sm"
            title="Refresh all dashboard data"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        {dashboardError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">Unable to load dashboard data. Please refresh the page.</p>
          </div>
        )}

        <div className='responsive-grid'>
          {metrics.map((metric, index) => (
            <div 
              key={index}
              className={`card-hover card-actions ${metric.color} ${metric.isAction ? 'cursor-pointer' : ''}`}
              onClick={() => handleMetricClick(metric)}
            >
              <div className="card-body">
                <h3 className="card-title">{metric.title}</h3>
                <p className="card-description">{metric.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-4">
            <CanCreateTask>
              <button 
                onClick={() => setShowCreateModal(true)}
                className="btn btn-primary"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Create New Task
              </button>
            </CanCreateTask>

            <ComplianceAccess>
              <button 
                className="btn btn-secondary"
                onClick={() => navigate('/tasks?status=COMPLIANCE_REVIEW')}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Review Pending ({isStatsLoading ? '...' : (quickStats?.pendingApproval || 0)})
              </button>
            </ComplianceAccess>

            <ManagerAccess>
              <button 
                className="btn btn-outline"
                onClick={() => navigate('/admin/user-management')}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Manage Team
              </button>
            </ManagerAccess>
 
          </div>
        </div>

        {activityFeed && activityFeed.length > 0 && (
          <div className="mt-8">
            <div className="flex-between items-center mb-4">
              <h2 className="text-heading-3">
                Recent Activity 
              </h2>
            </div>
            
            <div className="card">
              <div className="card-body">
                {isActivityLoading ? (
                  <div className="flex-col-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                    <p className="text-caption">Loading activity...</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activityFeed.slice(0, 5).map((item, index) => {
                      const formattedItem = formatActivityItem(item);
                      const activityType = getActivityType(formattedItem.displayText);
                      
                      return (
                        <div 
                          key={index} 
                          className="flex items-start gap-3 p-2 rounded-lg shadow-sm hover:bg-gray-50 transition-colors duration-200"
                        >
                          <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex-center ${activityType.bgColor} ${activityType.textColor}`}>
                            {activityType.icon}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900">{formattedItem.displayText}</p>
                            <p className="text-xs text-gray-500 mt-1">{formattedItem.timeAgo}</p>
                          </div>
                          
                          {activityType.badge && (
                            <span className={`badge ${activityType.badgeClass}`}>
                              {activityType.badge}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {permissions.isAdmin && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4">System Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm font-medium text-green-800">System Health</p>
                <p className="text-2xl font-bold text-green-900">
                  {isMetricsLoading ? '...' : 'Good'}
                </p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm font-medium text-blue-800">Active Users</p>
                <p className="text-2xl font-bold text-blue-900">
                  {isStatsLoading ? '...' : (quickStats?.activeUsers || '24')}
                </p>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-sm font-medium text-yellow-800">Pending Actions</p>
                <p className="text-2xl font-bold text-yellow-900">
                  {isStatsLoading ? '...' : (quickStats?.pendingApproval || '12')}
                </p>
              </div>
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <p className="text-sm font-medium text-red-800">Alerts</p>
                <p className="text-2xl font-bold text-red-900">
                  {isStatsLoading ? '...' : (quickStats?.expiringSoon || '3')}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8">
        <AdvancedTable/>
      </div>

      {showCreateModal && permissions.canCreateTask && (
        <CreateNewAdTask 
          onClose={() => setShowCreateModal(false)} 
          onSuccess={handleTaskCreated}
        />
      )}
    </>
  );
};

export default Dashboard;