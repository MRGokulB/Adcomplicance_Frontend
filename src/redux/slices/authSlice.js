import { createSlice } from '@reduxjs/toolkit'

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

const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,  
  error: null,
  lastActivity: null,
  rememberMe: false,
}

const persistedAuth = loadAuthFromStorage()
if (persistedAuth.user && persistedAuth.rememberMe) {
  initialState.user = persistedAuth.user
  initialState.isAuthenticated = false  
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

      saveAuthToStorage(user, rememberMe)
    },

    updateUser: (state, action) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload }
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
      const persistedAuth = loadAuthFromStorage()
      if (persistedAuth.user && persistedAuth.rememberMe) {
        state.user = persistedAuth.user
        state.rememberMe = persistedAuth.rememberMe
        state.lastActivity = new Date().toISOString() 
      }
      state.isLoading = false
    },

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