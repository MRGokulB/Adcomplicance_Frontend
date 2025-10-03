// src/context/CSRFContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';

const CSRFContext = createContext();

export const useCSRF = () => {
  const context = useContext(CSRFContext);
  if (!context) {
    throw new Error('useCSRF must be used within a CSRFProvider');
  }
  return context;
};

export const CSRFProvider = ({ children }) => {
  const [csrfToken, setCsrfToken] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchCSRFToken = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/csrf-token`,
        {
          credentials: 'include', // Important for cookies
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setCsrfToken(data.csrfToken);
        // Set global variable for RTK Query access
        window.csrfToken = data.csrfToken;
        console.log('✅ CSRF token fetched and set globally');
      } else {
        console.error('❌ Failed to fetch CSRF token:', response.status);
      }
    } catch (error) {
      console.error('❌ Error fetching CSRF token:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearCSRFToken = () => {
    setCsrfToken(null);
    window.csrfToken = null;
    console.log('🧹 CSRF token cleared');
  };

  useEffect(() => {
    // Fetch CSRF token on mount
    fetchCSRFToken();
  }, []);

  const value = {
    csrfToken,
    isLoading,
    // fetchCSRFToken,
    clearCSRFToken,
  };

  return (
    <CSRFContext.Provider value={value}>
      {children}
    </CSRFContext.Provider>
  );
};