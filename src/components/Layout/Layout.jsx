import React, { useState } from 'react';
import Sidebar from './Sidebar';

const Layout = ({ children }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const handleSidebarToggle = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  return (
    <div className="min-h-screen">
      <Sidebar 
        isCollapsed={isSidebarCollapsed}
        onToggle={handleSidebarToggle}
      />

      <div className={`main-content transition-all duration-300 ${
        isSidebarCollapsed 
          ? 'main-content-with-collapsed-sidebar' 
          : 'main-content-with-sidebar'
      }`}>
        <div className="lg:hidden bg-white border-b border-gray-200 p-4">
          <div className="flex-center">
            <button 
              className="btn btn-ghost btn-sm"
              onClick={handleSidebarToggle}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-600 rounded"></div>
              <span className="font-semibold text-gray-900">AdTrack</span>
            </div>
            <div className="w-8"></div>  
          </div>
        </div>

        <main className="min-h-screen">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout; 