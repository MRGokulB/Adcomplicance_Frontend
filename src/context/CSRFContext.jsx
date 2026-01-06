import React, { createContext, useContext, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setCsrfToken, clearCsrfToken, setCsrfLoading, setCsrfError } from '../redux/slices/csrfSlice';
import { fetchCsrfToken } from '../utils/csrf';

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

  const isFetchingRef = useRef(false);
  const hasInitializedRef = useRef(false);

  const fetchToken = async () => {
    if (isFetchingRef.current) {
      return;
    }

    isFetchingRef.current = true;
    dispatch(setCsrfLoading(true));

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const result = await fetchCsrfToken(apiUrl);

      if (result.success) {
        dispatch(setCsrfToken(result.token));
      } else {
        dispatch(setCsrfError(result.error));
        console.error(' Failed to fetch CSRF token:', result.error);
      }
    } catch (error) {
      dispatch(setCsrfError(error.message));
      console.error(' Error fetching CSRF token:', error);
    } finally {
      dispatch(setCsrfLoading(false));
      isFetchingRef.current = false;
    }
  };

  const clearToken = () => {
    dispatch(clearCsrfToken());
  };

  const refreshToken = async () => {
    if (isFetchingRef.current) {
      return;
    }
    await fetchToken();
  };

  useEffect(() => {
    if (hasInitializedRef.current) {
      return;
    }

    hasInitializedRef.current = true;
    fetchToken();
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