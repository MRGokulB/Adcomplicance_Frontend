// src/utils/csrf.js

/**
 * Get CSRF token from cookie
 * The backend sets the CSRF token in a cookie named '_csrf'
 * This implements the Double Submit Cookie pattern
 */
export const getCsrfTokenFromCookie = () => {
  const name = '_csrf=';
  const decodedCookie = decodeURIComponent(document.cookie);
  const cookieArray = decodedCookie.split(';');
  
  for (let i = 0; i < cookieArray.length; i++) {
    let cookie = cookieArray[i].trim();
    if (cookie.indexOf(name) === 0) {
      return cookie.substring(name.length, cookie.length);
    }
  }
  
  return null;
};

/**
 * Check if CSRF token exists in cookie
 */
export const hasCsrfToken = () => {
  return getCsrfTokenFromCookie() !== null;
};

/**
 * Fetch CSRF token from server
 * This should be called on app initialization and after login
 */
export const fetchCsrfToken = async (apiUrl) => {
  try {
    const response = await fetch(`${apiUrl}/api/csrf-token`, {
      method: 'GET',
      credentials: 'include', // Important for cookies
    });
    
    if (response.ok) {
      const data = await response.json();
      // Token is automatically set in cookie by the server
      // We can also return it for Redux state
      return {
        success: true,
        token: data.csrfToken,
        message: 'CSRF token fetched successfully'
      };
    } else {
      return {
        success: false,
        error: `Failed to fetch CSRF token: ${response.status}`
      };
    }
  } catch (error) {
    return {
      success: false,
      error: `Error fetching CSRF token: ${error.message}`
    };
  }
};

/**
 * Clear CSRF token from memory
 * Note: Cookie will be cleared by server on logout
 */
export const clearCsrfToken = () => {
  // The cookie is httpOnly=false, but we let the server manage it
  // This function is mainly for clearing any in-memory references
  console.log('CSRF token cleared from memory');
};
