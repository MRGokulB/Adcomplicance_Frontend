import React, { useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';

const Layout = ({ children }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const handleSidebarToggle = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onToggle={handleSidebarToggle}
      />

      <div className={`transition-all duration-300 min-h-screen flex flex-col ${isSidebarCollapsed
        ? 'lg:ml-20'
        : 'lg:ml-64'
        }`}>
        {/* Notification icon rendered as absolute-positioned */}
        <Header />

        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;