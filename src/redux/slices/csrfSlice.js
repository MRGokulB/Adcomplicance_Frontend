// src/redux/slices/csrfSlice.js
import { createSlice } from '@reduxjs/toolkit';

const csrfSlice = createSlice({
  name: 'csrf',
  initialState: {
    token: null,
    isLoading: false,
    error: null,
    lastFetched: null
  },
  reducers: {
    setCsrfToken: (state, action) => {
      state.token = action.payload;
      state.lastFetched = Date.now();
      state.error = null;
    },
    clearCsrfToken: (state) => {
      state.token = null;
      state.lastFetched = null;
      state.error = null;
    },
    setCsrfLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    setCsrfError: (state, action) => {
      state.error = action.payload;
      state.isLoading = false;
    }
  }
});

export const { 
  setCsrfToken, 
  clearCsrfToken, 
  setCsrfLoading, 
  setCsrfError 
} = csrfSlice.actions;

export default csrfSlice.reducer;

// Selectors
export const selectCsrfToken = (state) => state.csrf.token;
export const selectCsrfLoading = (state) => state.csrf.isLoading;
export const selectCsrfError = (state) => state.csrf.error;
export const selectCsrfLastFetched = (state) => state.csrf.lastFetched;
