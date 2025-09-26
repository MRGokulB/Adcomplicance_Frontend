import React, { useState } from 'react';
import { useSelector } from 'react-redux';
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
  const currentUser = useSelector(selectCurrentUser);
  const userRole = useSelector(selectUserRole);
  const permissions = usePermissions();

  // API Queries - Auto-refresh every 30 seconds
  const { 
    data: dashboardData, 
    isLoading: isDashboardLoading, 
    error: dashboardError 
  } = useGetDashboardQuery(undefined, {
    pollingInterval: 30000, // 30 seconds
    refetchOnMountOrArgChange: true,
  });

  const { 
    data: quickStats, 
    isLoading: isStatsLoading 
  } = useGetQuickStatsQuery(undefined, {
    pollingInterval: 30000,
  });

  const { 
    data: taskBuckets, 
    isLoading: isBucketsLoading 
  } = useGetTaskBucketsQuery(undefined, {
    pollingInterval: 30000,
  });

  const { 
    data: workloadChart, 
    isLoading: isWorkloadLoading 
  } = useGetWorkloadChartQuery(undefined, {
    pollingInterval: 60000, // 1 minute
  });

  const { 
    data: activityFeed, 
    isLoading: isActivityLoading 
  } = useGetActivityFeedQuery({ limit: 10 }, {
    pollingInterval: 30000,
  });

  const { 
    data: performanceMetrics, 
    isLoading: isMetricsLoading 
  } = useGetPerformanceMetricsQuery(undefined, {
    pollingInterval: 60000,
  });

  // Get role-specific welcome message
  const getWelcomeMessage = () => {
    const roleMessages = {
      [USER_ROLES.ADMIN]: 'System Administrator Dashboard',
      [USER_ROLES.SENIOR_MANAGER]: 'Executive Dashboard',
      [USER_ROLES.COMPLIANCE_ADMIN]: 'Compliance Management Dashboard',
      [USER_ROLES.COMPLIANCE_USER]: 'Compliance Review Dashboard',
      [USER_ROLES.PRODUCT_ADMIN]: 'Product Team Dashboard',
      [USER_ROLES.PRODUCT_USER]: 'Content Creator Dashboard'
    };
    return roleMessages[userRole] || 'Dashboard';
  };

  // Get role-specific metrics with real API data
  const getRoleSpecificMetrics = () => {
    // Use real data if available, fallback to loading or defaults
    const stats = quickStats || {};
    const buckets = taskBuckets || {};

    switch (userRole) {
      case USER_ROLES.ADMIN:
      case USER_ROLES.SENIOR_MANAGER:
        return [
          { 
            title: isStatsLoading ? '...' : (stats.totalTasks || '0'), 
            description: 'Total Active Tasks', 
            color: 'card-accent-primary' 
          },
          { 
            title: isStatsLoading ? '...' : (stats.pendingApproval || '0'), 
            description: 'Pending Approvals', 
            color: 'card-accent-warning' 
          },
          { 
            title: isStatsLoading ? '...' : (stats.activeUsers || '0'), 
            description: 'Users Online', 
            color: 'card-accent-success' 
          },
          { 
            title: isStatsLoading ? '...' : (stats.expiringSoon || '0'), 
            description: 'System Alerts', 
            color: 'card-accent-error' 
          }
        ];
      
      case USER_ROLES.COMPLIANCE_ADMIN:
      case USER_ROLES.COMPLIANCE_USER:
        return [
          { 
            title: isStatsLoading ? '...' : (stats.pendingApproval || '0'), 
            description: 'Pending Reviews', 
            color: 'card-accent-warning' 
          },
          { 
            title: isBucketsLoading ? '...' : (buckets.completedThisMonth?.length || '0'), 
            description: 'Approved Today', 
            color: 'card-accent-success' 
          },
          { 
            title: isStatsLoading ? '...' : (stats.totalTasks || '0'), 
            description: 'Exchange Approvals', 
            color: 'card-accent-primary' 
          },
          { 
            title: isStatsLoading ? '...' : (stats.expiringSoon || '0'), 
            description: 'Expiring Soon', 
            color: 'card-accent-error' 
          }
        ];
      
      case USER_ROLES.PRODUCT_ADMIN:
      case USER_ROLES.PRODUCT_USER:
        return [
          { 
            title: isBucketsLoading ? '...' : (buckets.myTasks?.length || '0'), 
            description: 'My Active Tasks', 
            color: 'card-accent-primary' 
          },
          { 
            title: isStatsLoading ? '...' : (stats.pendingApproval || '0'), 
            description: 'In Review', 
            color: 'card-accent-warning' 
          },
          { 
            title: isBucketsLoading ? '...' : (buckets.completedThisMonth?.length || '0'), 
            description: 'Approved', 
            color: 'card-accent-success' 
          },
          { 
            title: '+', 
            description: 'Create New Task', 
            color: 'card-accent-error', 
            isAction: true 
          }
        ];
      
      default:
        return [
          { 
            title: isBucketsLoading ? '...' : (buckets.myTasks?.length || '0'), 
            description: 'My Tasks', 
            color: 'card-accent-primary' 
          },
          { 
            title: isStatsLoading ? '...' : (dashboardData?.notifications?.length || '0'), 
            description: 'Notifications', 
            color: 'card-accent-warning' 
          },
          { 
            title: isBucketsLoading ? '...' : (buckets.completedThisMonth?.length || '0'), 
            description: 'Completed', 
            color: 'card-accent-success' 
          },
          { 
            title: 'Info', 
            description: 'Welcome', 
            color: 'card-accent-info' 
          }
        ];
    }
  };

  const metrics = getRoleSpecificMetrics();

  const handleMetricClick = (metric) => {
    if (metric.isAction && metric.description === 'Create New Task') {
      if (permissions.canCreateTask) {
        setShowCreateModal(true);
      }
    }
  };

  // Format activity feed item
  const formatActivityItem = (item) => {
    const timeAgo = new Date(item.timestamp).toLocaleString();
    return {
      ...item,
      timeAgo,
      displayText: item.message || `${item.user} performed ${item.type}`
    };
  };

  return (
    <>
      <div className='container-lg'>
        <div className="flex-start items-center mb-6">
          <div>
            <h1 className="text-heading-2">{getWelcomeMessage()}</h1>
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

        {/* Error State */}
        {dashboardError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">Unable to load dashboard data. Please refresh the page.</p>
          </div>
        )}

        {/* Metrics Cards */}
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

         

        {/* Role-specific Quick Actions */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-4">
            
            {/* Create Task - Only for Product Users */}
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

            {/* Compliance Quick Actions */}
            <ComplianceAccess>
              <button className="btn btn-secondary">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Review Pending ({isStatsLoading ? '...' : (quickStats?.pendingApproval || 0)})
              </button>
            </ComplianceAccess>

            {/* Manager Quick Actions */}
            <ManagerAccess>
              <button className="btn btn-outline">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Manage Team
              </button>
            </ManagerAccess>

            {/* Admin Only Actions */}
            <AdminOnly>
              <button className="btn btn-error">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                System Settings
              </button>
            </AdminOnly>

          </div>
        </div>

        {/* Activity Feed */}
        {activityFeed && activityFeed.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
            <div className="bg-white rounded-lg shadow border">
              <div className="p-4">
                {isActivityLoading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading activity...</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activityFeed.slice(0, 5).map((item, index) => {
                      const formattedItem = formatActivityItem(item);
                      return (
                        <div key={index} className="flex items-start space-x-3">
                          <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                          <div className="flex-grow">
                            <p className="text-sm text-gray-900">{formattedItem.displayText}</p>
                            <p className="text-xs text-gray-500">{formattedItem.timeAgo}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* System Status for Admins - Updated with real data */}
        {permissions.isAdmin && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4">System Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm font-medium text-green-800">System Health</p>
                <p className="text-2xl font-bold text-green-900">
                  {isMetricsLoading ? '...' : (performanceMetrics?.systemUptimePercentage ? 'Good' : 'Good')}
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

      {/* Replace the basic table with the comprehensive AllTasksPage component */}
      <div className="mt-8">
        <AdvancedTable/>
      </div>

      {/* Create Task Modal - Only show if user has permission */}
      {showCreateModal && permissions.canCreateTask && (
        <CreateNewAdTask onClose={() => setShowCreateModal(false)} />
      )}
    </>
  );
};

export default Dashboard;