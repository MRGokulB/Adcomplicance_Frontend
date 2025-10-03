// src/context/CSRFContext.jsx
import React, { createContext, useContext, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setCsrfToken, clearCsrfToken, setCsrfLoading, setCsrfError } from '../redux/slices/csrfSlice';
import { fetchCsrfToken, getCsrfTokenFromCookie } from '../utils/csrf';

const CSRFContext = createContext();

export const useCSRF = () => {
  const context = useContext(CSRFContext);
  if (!context) {
    throw new Error('useCSRF must be used within a CSRFProvider');
  }
  return context;
};

export const CSRFProvider = ({ children }) => {
  const dispatch = useDispatch();
  const csrfToken = useSelector((state) => state.csrf.token);
  const isLoading = useSelector((state) => state.csrf.isLoading);
  const error = useSelector((state) => state.csrf.error);

  const fetchToken = async () => {
    dispatch(setCsrfLoading(true));
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const result = await fetchCsrfToken(apiUrl);
      
      if (result.success) {
        // Token is now in cookie, read it from there
        const tokenFromCookie = getCsrfTokenFromCookie();
        if (tokenFromCookie) {
          dispatch(setCsrfToken(tokenFromCookie));
          console.log('✅ CSRF token fetched and stored in Redux from cookie');
        } else {
          // Fallback to token from response
          dispatch(setCsrfToken(result.token));
          console.log('✅ CSRF token fetched and stored in Redux from response');
        }
      } else {
        dispatch(setCsrfError(result.error));
        console.error('❌ Failed to fetch CSRF token:', result.error);
      }
    } catch (error) {
      dispatch(setCsrfError(error.message));
      console.error('❌ Error fetching CSRF token:', error);
    } finally {
      dispatch(setCsrfLoading(false));
    }
  };

  const clearToken = () => {
    dispatch(clearCsrfToken());
    console.log('🧹 CSRF token cleared from Redux');
  };

  const refreshToken = async () => {
    // Check if token exists in cookie first
    const tokenFromCookie = getCsrfTokenFromCookie();
    if (tokenFromCookie) {
      dispatch(setCsrfToken(tokenFromCookie));
      console.log('✅ CSRF token refreshed from cookie');
    } else {
      // If not in cookie, fetch from server
      await fetchToken();
    }
  };

  useEffect(() => {
    // On mount, try to get token from cookie first
    const tokenFromCookie = getCsrfTokenFromCookie();
    if (tokenFromCookie) {
      dispatch(setCsrfToken(tokenFromCookie));
      console.log('✅ CSRF token loaded from cookie on mount');
    } else {
      // If no token in cookie, fetch from server
      fetchToken();
    }
  }, []);

  const value = {
    csrfToken,
    isLoading,
    error,
    fetchToken,
    clearToken,
    refreshToken,
  };

  return (
    <CSRFContext.Provider value={value}>
      {children}
    </CSRFContext.Provider>
  );
};
