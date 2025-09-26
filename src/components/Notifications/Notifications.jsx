import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  useGetNotificationsQuery,
  useGetCountsQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
} from '../../redux/api/notificationsApi';

const Notifications = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all'); // 'all', 'read', 'unread'
  const [page, setPage] = useState(1);
  const limit = 20;
  
  // API Queries with real-time updates
  const { 
    data: notificationsData, 
    isLoading, 
    error,
    refetch 
  } = useGetNotificationsQuery({
    page,
    limit,
    isRead: filter === 'all' ? undefined : filter === 'read' ? true : false
  }, {
    pollingInterval: 30000, // Real-time updates every 30 seconds
    refetchOnMountOrArgChange: true,
  });

  const { data: counts } = useGetCountsQuery(undefined, {
    pollingInterval: 30000,
  });

  // Mutations (removed unwanted ones)
  const [markAsRead] = useMarkAsReadMutation();
  const [markAllAsRead] = useMarkAllAsReadMutation();

  // Keep original data structure
  const notifications = notificationsData?.notifications || [];
  const summary = {
    total: counts?.total ?? notificationsData?.pagination?.totalCount ?? 0,
    unread: counts?.unread ?? notificationsData?.unreadCount ?? 0,
  };
  const pagination = notificationsData?.pagination || {};

  const handleMarkAsRead = async (id) => {
    try {
      await markAsRead(id).unwrap();
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleOpenNotification = async (notification) => {
    try {
      if (!notification.isRead) {
        // Optimistically mark as read
        await markAsRead(notification.id).unwrap();
      }
      // Navigate to task if available
      if (notification.taskId) {
        navigate(`/tasks/${notification.taskId}`);
      }
    } catch (e) {
      // Still try to navigate even if marking read fails
      if (notification.taskId) {
        navigate(`/tasks/${notification.taskId}`);
      }
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead().unwrap();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'TASK_ASSIGNED':
        return (
          <div className="card-icon">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
        );
      case 'TASK_APPROVED':
        return (
          <div className="card-icon-success">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        );
      case 'TASK_REJECTED':
        return (
          <div className="card-icon-error">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
        );
      case 'VERSION_UPLOADED':
        return (
          <div className="card-icon-warning">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
        );
      case 'COMMENT_ADDED':
        return (
          <div className="card-icon">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 bg-gray-100 rounded-lg text-gray-600 flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5-5-5h5V3h10z" />
            </svg>
          </div>
        );
    }
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const notificationTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now - notificationTime) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const getNotificationTypeLabel = (type) => {
    const labels = {
      'TASK_ASSIGNED': 'Task Assigned',
      'TASK_APPROVED': 'Task Approved',
      'TASK_REJECTED': 'Task Rejected',
      'VERSION_UPLOADED': 'Version Uploaded',
      'COMMENT_ADDED': 'Comment Added',
      'TASK_PUBLISHED': 'Task Published'
    };
    return labels[type] || 'Notification';
  };

  // Error state with consistent styling
  if (error) {
    return (
      <div className="container-lg section-md">
        <div className="text-center py-12">
          <div className="text-red-600 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load notifications</h3>
          <p className="text-gray-600 mb-4">Please try again</p>
          <button 
            onClick={refetch}
            className="btn btn-primary"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container-lg section-md">
      {/* Page Header */}
      <div className="flex-between items-center mb-6">
        <div>
          <h1 className="text-heading-2">Notifications</h1>
          <p className="text-caption mt-2">
            Stay updated with your task activities and system notifications
             
          </p>
        </div>
        <div className="flex gap-2">
          {summary.unread > 0 && (
            <button 
              onClick={handleMarkAllAsRead}
              className="btn btn-primary btn-sm"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Mark All Read
            </button>
          )}
          <button 
            onClick={refetch}
            className="btn btn-outline btn-sm"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      <div className="filter-panel">
        <div className="card-header">
          <h3 className="card-title">Filter Notifications</h3>
        </div>
        <div className="card-body">
          <div className="flex gap-2 mb-4 overflow-x-auto">
            {[
              { key: 'all', label: 'All Notifications', count: summary.total },
              { key: 'unread', label: 'Unread', count: summary.unread },
              { key: 'read', label: 'Read', count: summary.total - summary.unread }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => {
                  setFilter(tab.key);
                  setPage(1);
                }}
                className={`btn btn-sm whitespace-nowrap ${
                  filter === tab.key ? 'btn-primary' : 'btn-outline'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className="ml-2 bg-white bg-opacity-20 text-current px-2 py-0.5 rounded-full text-xs font-medium">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div> 
        </div>
      </div>

      {/* Notifications Container */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Notification Center</h3>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="card-body text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading notifications...</p>
          </div>
        ) : (
          <div className="card-body">
            {/* Empty State */}
            {notifications.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5-5-5h5V3h10z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {filter === 'unread' ? "You're all caught up!" : 'No notifications'}
                </h3>
                <p className="text-gray-500">
                  {filter === 'unread' 
                    ? "All your notifications have been read." 
                    : 'No notifications to display at the moment.'
                  }
                </p>
              </div>
            ) : (
              /* Notifications List */
              <div className="space-y-4">
                {notifications.map(notification => (
                  <div
                    key={notification.id}
                    className={`notification-item group ${
                      !notification.isRead ? 'notification-unread' : ''
                    } cursor-pointer`}
                    onClick={() => handleOpenNotification(notification)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleOpenNotification(notification); }}
                  >
                    <div className="flex items-start gap-4">
                      {/* Notification Icon */}
                      <div className="flex-shrink-0">
                        {getNotificationIcon(notification.type)}
                      </div>
                      
                      {/* Notification Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex-between items-start mb-2">
                          <div className="flex-1">
                            <h4 className={`text-sm font-semibold ${
                              !notification.isRead ? 'text-blue-900' : 'text-gray-900'
                            }`}>
                              {notification.title}
                            </h4>
                            <p className="text-xs text-gray-500 mt-1">
                              {getNotificationTypeLabel(notification.type)} • {formatTimeAgo(notification.createdAt)}
                            </p>
                          </div>
                          
                          {/* Action Button */}
                          {!notification.isRead && (
                            <button
                              onClick={() => handleMarkAsRead(notification.id)}
                              className="btn btn-ghost btn-icon-sm ml-2"
                              title="Mark as read"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                          )}
                        </div>
                        
                        {/* Notification Message */}
                        <p className={`text-sm mb-3 ${
                          !notification.isRead ? 'text-blue-800' : 'text-gray-700'
                        }`}>
                          {notification.message}
                        </p>
                        
                        {/* Notification Link */}
                        {notification.taskId && (
                          <div className="mt-3">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleOpenNotification(notification); }}
                              className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium"
                            >
                              View Task
                              <svg
                                className="w-4 h-4 ml-1"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                />
                              </svg>
                            </button>
                          </div>
                        )}

                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div className="card-footer">
            <div className="flex-between">
              <div className="text-sm text-gray-600">
                Page {pagination.page || page} of {pagination.totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="btn btn-secondary btn-sm"
                >
                  ⟨ Previous
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page === pagination.totalPages}
                  className="btn btn-secondary btn-sm"
                >
                  Next ⟩
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;