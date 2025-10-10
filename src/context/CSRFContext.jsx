// src/context/CSRFContext.jsx
import React, { createContext, useContext, useEffect, useRef } from 'react';
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
  
  // FIXED: Use ref to prevent duplicate fetches
  const isFetchingRef = useRef(false);
  const hasInitializedRef = useRef(false);

  const fetchToken = async () => {
    // FIXED: Prevent duplicate fetches
    if (isFetchingRef.current) {
      console.log('⏳ CSRF token fetch already in progress, skipping...');
      return;
    }

    isFetchingRef.current = true;
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
      isFetchingRef.current = false;
    }
  };

  const clearToken = () => {
    dispatch(clearCsrfToken());
    console.log('🧹 CSRF token cleared from Redux');
  };

  const refreshToken = async () => {
    // FIXED: Prevent duplicate refreshes
    if (isFetchingRef.current) {
      console.log('⏳ CSRF token refresh already in progress, skipping...');
      return;
    }

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
    // FIXED: Only initialize once
    if (hasInitializedRef.current) {
      return;
    }

    hasInitializedRef.current = true;

    // On mount, try to get token from cookie first
    const tokenFromCookie = getCsrfTokenFromCookie();
    if (tokenFromCookie) {
      dispatch(setCsrfToken(tokenFromCookie));
      console.log('✅ CSRF token loaded from cookie on mount');
    } else {
      // If no token in cookie, fetch from server
      fetchToken();
    }
  }, []); // Empty dependency array - only run once

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