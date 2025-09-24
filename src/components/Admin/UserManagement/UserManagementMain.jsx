import React, { useState } from 'react';
import UserManagement from './UserManagement';
import AbsenceTracker from './AbsenceTracker';

const UserManagementMain = () => {
  const [activeTab, setActiveTab] = useState('user-management');

  const tabs = [
    {
      id: 'user-management',
      label: 'User Management',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
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
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'user-management':
        return <UserManagement />;
      case 'absence-tracker':
        return <AbsenceTracker />;
      default:
        return <UserManagement />;
    }
  };

  return (
    <div className="container-lg section-md">
      {/* Tabs Navigation */}
      <div className="tabs mb-6">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`tab flex items-center gap-2 cursor-pointer ${
              activeTab === tab.id ? 'tab-active' : 'tab-inactive'
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </div>
        ))}
      </div>

      {/* Tab Content */}
      <div className="fade-in">
        {renderContent()}
      </div>
    </div>
  );
};

export default UserManagementMain;
