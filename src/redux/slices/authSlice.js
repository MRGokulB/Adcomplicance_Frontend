import { createSlice } from '@reduxjs/toolkit'

// Helper functions for localStorage
const loadAuthFromStorage = () => {
  try {
    const token = localStorage.getItem('auth_token')
    const user = localStorage.getItem('auth_user')
    return {
      token: token || null,
      user: user ? JSON.parse(user) : null
    }
  } catch (error) {
    console.error('Error loading auth from storage:', error)
    return { token: null, user: null }
  }
}

const saveAuthToStorage = (token, user) => {
  try {
    if (token) {
      localStorage.setItem('auth_token', token)
    } else {
      localStorage.removeItem('auth_token')
    }
    
    if (user) {
      localStorage.setItem('auth_user', JSON.stringify(user))
    } else {
      localStorage.removeItem('auth_user')
    }
  } catch (error) {
    console.error('Error saving auth to storage:', error)
  }
}

const clearAuthFromStorage = () => {
  try {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
  } catch (error) {
    console.error('Error clearing auth from storage:', error)
  }
}

// Initial state
const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true, // Initially true to check for existing auth
  error: null,
  lastActivity: null,
  sessionExpiry: null,
}

// Initialize state with data from localStorage
const persistedAuth = loadAuthFromStorage()
if (persistedAuth.token && persistedAuth.user) {
  initialState.user = persistedAuth.user
  initialState.token = persistedAuth.token
  initialState.isAuthenticated = true
  initialState.isLoading = false
  initialState.lastActivity = new Date().toISOString()
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      const { user, token, rememberMe = false } = action.payload
      state.user = user
      state.token = token
      state.isAuthenticated = true
      state.isLoading = false
      state.error = null
      state.lastActivity = new Date().toISOString()
      state.sessionExpiry = rememberMe 
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
        : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 1 day

      // Persist to localStorage
      saveAuthToStorage(token, user)
    },

    updateUser: (state, action) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload }
        saveAuthToStorage(state.token, state.user)
      }
    },

    logout: (state) => {
      state.user = null
      state.token = null
      state.isAuthenticated = false
      state.isLoading = false
      state.error = null
      state.lastActivity = null
      state.sessionExpiry = null

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

    checkAuthExpiry: (state) => {
      if (state.sessionExpiry && new Date() > new Date(state.sessionExpiry)) {
        // Session expired, logout
        state.user = null
        state.token = null
        state.isAuthenticated = false
        state.isLoading = false
        state.error = 'Session expired'
        state.lastActivity = null
        state.sessionExpiry = null
        clearAuthFromStorage()
      }
    },

    initializeAuth: (state) => {
      // This is called on app startup to check for persisted auth
      const persistedAuth = loadAuthFromStorage()
      if (persistedAuth.token && persistedAuth.user) {
        state.user = persistedAuth.user
        state.token = persistedAuth.token
        state.isAuthenticated = true
        state.lastActivity = new Date().toISOString()
      }
      state.isLoading = false
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
  checkAuthExpiry,
  initializeAuth,
} = authSlice.actions

// Selectors
export const selectCurrentUser = (state) => state.auth.user
export const selectCurrentToken = (state) => state.auth.token
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated
export const selectAuthLoading = (state) => state.auth.isLoading
export const selectAuthError = (state) => state.auth.error
export const selectUserRole = (state) => state.auth.user?.role
export const selectUserPermissions = (state) => {
  const role = state.auth.user?.role
  // This will be used with the roles.js file
  return role || null
}

export default authSlice.reducer