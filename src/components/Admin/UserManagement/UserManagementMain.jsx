import React, { useState, useMemo, useCallback } from 'react';
import UserManagement from './UserManagement';
import AbsenceTracker from './AbsenceTracker';

const UserManagementMain = () => {
  const [activeTab, setActiveTab] = useState('user-management');

  const tabs = useMemo(() => [
    {
      id: 'user-management',
      label: 'User Management',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
        </svg>
      )
    },
    {
      id: 'absence-tracker',
      label: 'Absence Tracker',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
        </svg>
      )
    }
  ], []);

  const handleTabChange = useCallback((tabId) => {
    setActiveTab(tabId);
  }, []);

  const renderContent = useMemo(() => {
    switch (activeTab) {
      case 'user-management':
        return <UserManagement />;
      case 'absence-tracker':
        return <AbsenceTracker />;
      default:
        return <UserManagement />;
    }
  }, [activeTab]);

  return (
    <div className="container-lg section-md">
      <div className="tabs mb-6">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`tab flex items-center gap-2 cursor-pointer ${
              activeTab === tab.id ? 'tab-active' : 'tab-inactive'
            }`}
            onClick={() => handleTabChange(tab.id)}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </div>
        ))}
      </div>

      <div className="fade-in">
        {renderContent}
      </div>
    </div>
  );
};

export default UserManagementMain;