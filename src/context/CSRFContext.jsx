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
        console.log('CSRF token fetched successfully');
      } else {
        console.error('Failed to fetch CSRF token');
      }
    } catch (error) {
      console.error('Error fetching CSRF token:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearCSRFToken = () => {
    setCsrfToken(null);
  };

  useEffect(() => {
    // Fetch CSRF token on mount
    fetchCSRFToken();
  }, []);

  const value = {
    csrfToken,
    isLoading,
    fetchCSRFToken,
    clearCSRFToken,
  };

  return (
    <CSRFContext.Provider value={csrfToken}>
      {children}
    </CSRFContext.Provider>
  );
};