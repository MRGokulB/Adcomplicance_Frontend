// src/redux/slices/authSlice.js
import { createSlice } from '@reduxjs/toolkit'

// Helper functions for localStorage (only for user data now)
const loadAuthFromStorage = () => {
  try {
    const user = localStorage.getItem('auth_user')
    const rememberMe = localStorage.getItem('auth_remember_me') === 'true'
    return {
      user: user ? JSON.parse(user) : null,
      rememberMe: rememberMe || false
    }
  } catch (error) {
    console.error('Error loading auth from storage:', error)
    return { user: null, rememberMe: false }
  }
}

const saveAuthToStorage = (user, rememberMe) => {
  try {
    if (user && rememberMe) {
      localStorage.setItem('auth_user', JSON.stringify(user))
      localStorage.setItem('auth_remember_me', 'true')
    } else {
      // If not remembering, clear storage
      clearAuthFromStorage()
    }
  } catch (error) {
    console.error('Error saving auth to storage:', error)
  }
}

const clearAuthFromStorage = () => {
  try {
    localStorage.removeItem('auth_user')
    localStorage.removeItem('auth_remember_me')
  } catch (error) {
    console.error('Error clearing auth from storage:', error)
  }
}

// Initial state
const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: true, // Initially true to check for existing session
  error: null,
  lastActivity: null,
  rememberMe: false,
}

// Initialize state with data from localStorage (if remembered)
const persistedAuth = loadAuthFromStorage()
if (persistedAuth.user && persistedAuth.rememberMe) {
  initialState.user = persistedAuth.user
  initialState.isAuthenticated = false // Will be verified by session check
  initialState.rememberMe = persistedAuth.rememberMe
  initialState.lastActivity = new Date().toISOString()
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      const { user, rememberMe = false } = action.payload
      state.user = user
      state.isAuthenticated = true
      state.isLoading = false
      state.error = null
      state.lastActivity = new Date().toISOString()
      state.rememberMe = rememberMe

      // Persist to localStorage only if rememberMe is true
      saveAuthToStorage(user, rememberMe)
    },

    updateUser: (state, action) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload }
        // Update storage if rememberMe was enabled
        if (state.rememberMe) {
          saveAuthToStorage(state.user, state.rememberMe)
        }
      }
    },

    logout: (state) => {
      state.user = null
      state.isAuthenticated = false
      state.isLoading = false
      state.error = null
      state.lastActivity = null
      state.rememberMe = false

      // Clear from localStorage
      clearAuthFromStorage()
    },

    setAuthLoading: (state, action) => {
      state.isLoading = action.payload
    },

    setAuthError: (state, action) => {
      state.error = action.payload
      state.isLoading = false
    },

    clearAuthError: (state) => {
      state.error = null
    },

    updateLastActivity: (state) => {
      state.lastActivity = new Date().toISOString()
    },

    initializeAuth: (state) => {
      // This is called on app startup to check for persisted auth
      const persistedAuth = loadAuthFromStorage()
      if (persistedAuth.user && persistedAuth.rememberMe) {
        state.user = persistedAuth.user
        state.rememberMe = persistedAuth.rememberMe
        state.lastActivity = new Date().toISOString()
        // Note: isAuthenticated will be set to true only after session verification
        // This should trigger a session check API call
      }
      state.isLoading = false
    },

    // Session validation - set after successful session check
    setSessionValid: (state, action) => {
      state.isAuthenticated = true
      state.isLoading = false
      if (action.payload?.user) {
        state.user = action.payload.user
        if (state.rememberMe) {
          saveAuthToStorage(state.user, state.rememberMe)
        }
      }
    },

    // Session invalid - clear auth
    setSessionInvalid: (state) => {
      state.user = null
      state.isAuthenticated = false
      state.isLoading = false
      state.error = 'Session expired or invalid'
      state.lastActivity = null
      clearAuthFromStorage()
    },
  },
})

export const {
  setCredentials,
  updateUser,
  logout,
  setAuthLoading,
  setAuthError,
  clearAuthError,
  updateLastActivity,
  initializeAuth,
  setSessionValid,
  setSessionInvalid,
} = authSlice.actions

// Selectors
export const selectCurrentUser = (state) => state.auth.user
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated
export const selectAuthLoading = (state) => state.auth.isLoading
export const selectAuthError = (state) => state.auth.error
export const selectUserRole = (state) => state.auth.user?.role
export const selectRememberMe = (state) => state.auth.rememberMe
export const selectUserPermissions = (state) => {
  const role = state.auth.user?.role
  return role || null
}

export default authSlice.reducer