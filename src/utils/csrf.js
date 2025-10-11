 
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

 
export const hasCsrfToken = () => {
  return getCsrfTokenFromCookie() !== null;
};

 
export const fetchCsrfToken = async (apiUrl) => {
  try {
    const response = await fetch(`${apiUrl}/api/csrf-token`, {
      method: 'GET',
      credentials: 'include',  
    });
    
    if (response.ok) {
      const data = await response.json(); 
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

 
export const clearCsrfToken = () => { 
};
