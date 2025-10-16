import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectCurrentUser, selectUserRole } from '../../redux/slices/authSlice';
import { useLogoutUserMutation } from '../../redux/api/authApi';
import { 
  useGetCountsQuery, 
  useGetNotificationsQuery 
} from '../../redux/api/notificationsApi';
import { 
  hasPermission, 
  canAccessReports, 
  canManageUsers,
  PERMISSIONS,
  USER_ROLES
} from '../../utils/roles';

function toggleTheme() {
  const html = document.documentElement;
  const currentTheme = html.classList.contains('dark') ? 'dark' : 'light';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  
  if (newTheme === 'dark') {
    html.classList.add('dark');
  } else {
    html.classList.remove('dark');
  }
  
  localStorage.setItem('theme', newTheme);
}

document.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('theme') || 'light';
  if (savedTheme === 'dark') {
    document.documentElement.classList.add('dark');
  }
});

const Sidebar = ({ isCollapsed, onToggle }) => {
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const currentUser = useSelector(selectCurrentUser);
  const userRole = useSelector(selectUserRole);
  
  const [logoutUser] = useLogoutUserMutation();
  
  const { 
    data: counts, 
    isLoading: isCountsLoading,
    error: countsError 
  } = useGetCountsQuery(undefined, {
    pollingInterval: 30000,  
    refetchOnFocus: true,     
    refetchOnReconnect: true, 
    refetchOnMountOrArgChange: true,
  });

  const { 
    data: notificationsData 
  } = useGetNotificationsQuery({
    page: 1,
    limit: 20,
    isRead: undefined  
  }, {
    pollingInterval: 30000,  
    refetchOnMountOrArgChange: true,
  });

  const summary = {
    total: counts?.total ?? notificationsData?.pagination?.totalCount ?? 0,
    unread: counts?.unread ?? notificationsData?.unreadCount ?? 0,
  };

  const unreadNotificationsCount = summary.unread;

  const getNavigationItems = () => {
    const items = [];

    items.push({
      id: 'dashboard',
      label: 'Dashboard',
      path: '/dashboard',
      icon: (
        <svg className="sidebar-nav-icon" fill="currentColor" viewBox="0 0 20 20">
          <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
        </svg>
      ),
      badge: null,
      show: true
    });

    const canViewTasks = hasPermission(userRole, PERMISSIONS.TASK_READ_ALL) ||
                         hasPermission(userRole, PERMISSIONS.TASK_READ_TEAM) ||
                         hasPermission(userRole, PERMISSIONS.TASK_READ_OWN) ||
                         hasPermission(userRole, PERMISSIONS.TASK_READ_ASSIGNED);
    
    if (canViewTasks) {
      items.push({
        id: 'tasks',
        label: 'Tasks',
        path: '/tasks',
        icon: (
          <svg className="sidebar-nav-icon" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>
        ),
        badge: null,  
        show: true
      });
    }

    items.push({
      id: 'notifications',
      label: 'Notifications',
      path: '/notifications',
      icon: (
        <svg className="sidebar-nav-icon" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
        </svg>
      ),
      badge: unreadNotificationsCount > 0 ? unreadNotificationsCount : null,  
      show: true
    });

    if (canManageUsers(userRole)) {
      items.push({
        id: 'user-management',
        label: 'User Management',
        path: '/admin/user-management',
        icon: (
          <svg className="sidebar-nav-icon" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
          </svg>
        ),
        show: true
      });
    }

    if (hasPermission(userRole, PERMISSIONS.ABSENCE_MANAGE) || 
        hasPermission(userRole, PERMISSIONS.ABSENCE_READ_ALL)) {
      items.push({
        id: 'absence-tracker',
        label: 'Absence Tracker',
        path: '/admin/absence-tracker',
        icon: (
          <svg className="sidebar-nav-icon" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
          </svg>
        ),
        show: true
      });
    }

    if (hasPermission(userRole, PERMISSIONS.AUDIT_READ_ALL) || 
        hasPermission(userRole, PERMISSIONS.AUDIT_READ_LIMITED)) {
      items.push({
        id: 'audit-log',
        label: 'Audit Log',
        path: '/audit-log',
        icon: (
          <svg className="sidebar-nav-icon" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>
        ),
        show: true
      });
    }

    if (canAccessReports(userRole)) {
      items.push({
        id: 'reports',
        label: 'Reports (MIS)',
        path: '/reports',
        icon: (
          <svg className="sidebar-nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        ),
        show: true
      });
    }

    return items.filter(item => item.show);
  };

  const navigationItems = getNavigationItems();

  const profileMenuItems = [
    {
      id: 'profile',
      label: 'Profile',
      icon: (
        <svg className="sidebar-profile-dropdown-icon" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
        </svg>
      )
    },
    {
      id: 'logout',
      label: 'Logout',
      icon: (
        <svg className="sidebar-profile-dropdown-icon" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
        </svg>
      )
    }
  ];

  const handleProfileClick = () => {
    setShowProfileDropdown(!showProfileDropdown);
  };

  const handleProfileMenuItemClick = async (itemId) => {
    setShowProfileDropdown(false);
    
    if (itemId === 'logout') {
      try {
      await logoutUser().unwrap();
      navigate("/login", { replace: true });   
    } catch (error) {
      console.error('Logout failed:', error);
      navigate("/login", { replace: true });
    }
    } else if (itemId === 'settings') { 
    } else if (itemId === 'profile') {
      navigate('/profile');
    } else if (itemId === 'theme') {
      toggleTheme();
    }
  };

  const handleNavigationClick = (item) => {
    navigate(item.path);
    if (window.innerWidth < 1024) {
      onToggle();
    }
  };

  const isActiveItem = (item) => {
    if (item.path === '/tasks') {
      return location.pathname === '/tasks' || location.pathname.startsWith('/tasks/');
    }
    return location.pathname === item.path;
  };

  const getUserInitials = () => {
    if (!currentUser?.fullName) return 'U';
    return currentUser.fullName
      .split(' ')
      .map(name => name[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleDisplayName = (role) => {
    const roleNames = {
      [USER_ROLES.ADMIN]: 'Administrator',
      [USER_ROLES.SENIOR_MANAGER]: 'Senior Manager',
      [USER_ROLES.COMPLIANCE_ADMIN]: 'Compliance Admin',
      [USER_ROLES.COMPLIANCE_USER]: 'Compliance Officer',
      [USER_ROLES.PRODUCT_ADMIN]: 'Product Admin',
      [USER_ROLES.PRODUCT_USER]: 'Product User'
    };
    return roleNames[role] || role;
  };

  return (
    <>
      {!isCollapsed && (
        <div className="sidebar-overlay lg:hidden" onClick={onToggle} />
      )}

      <div className={`sidebar sidebar-theme-primary flex flex-col ${isCollapsed ? 'sidebar-collapsed' : 'sidebar-expanded'}`}>
        <div className="sidebar-header flex-shrink-0">
          {!isCollapsed && (
            <div className="sidebar-logo">
              <div className="sidebar-logo-icon">
                <svg fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="sidebar-logo-text">AdTrack</span>
            </div>
          )}
          <button
            className="sidebar-toggle"
            onClick={onToggle}
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="sidebar-nav flex-1 overflow-y-auto overflow-x-hidden">
          <div className="sidebar-nav-section">
            <div className="sidebar-nav-list">
              {navigationItems.map((item) => (
                <div key={item.id} className="relative group">
                  <div
                    className={`sidebar-nav-item ${isActiveItem(item) ? 'active' : ''}`}
                    onClick={() => handleNavigationClick(item)}
                  >
                    {item.icon}
                    <span className="sidebar-nav-text">{item.label}</span>
                    {item.badge && (
                      <span className="sidebar-nav-badge">{item.badge}</span>
                    )}
                  </div>
                  {isCollapsed && (
                    <div className="sidebar-tooltip">
                      {item.label}
                      {item.badge && (
                        <span className="ml-2 text-red-400">({item.badge} unread)</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="sidebar-footer flex-shrink-0 mt-auto">
          <div className="relative">
            <div
              className="sidebar-profile"
              onClick={handleProfileClick}
            >
              <div className="sidebar-profile-avatar">
                {getUserInitials()}
              </div>
              {!isCollapsed && (
                <>
                  <div className="sidebar-profile-info">
                    <div className="sidebar-profile-name">
                      {currentUser?.fullName || 'User'}
                    </div>
                    <div className="sidebar-profile-email text-xs text-gray-500">
                      {getRoleDisplayName(userRole)}
                    </div>
                  </div>
                  <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </>
              )}
            </div>

            {isCollapsed && (
              <div className="sidebar-tooltip">
                <div className="font-medium">{currentUser?.fullName || 'User'}</div>
                <div className="text-xs text-gray-400">{getRoleDisplayName(userRole)}</div>
              </div>
            )}

            {showProfileDropdown && !isCollapsed && (
              <div className="sidebar-profile-dropdown">
                {profileMenuItems.map((item) => (
                  <div
                    key={item.id}
                    className="sidebar-profile-dropdown-item"
                    onClick={() => handleProfileMenuItemClick(item.id)}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;