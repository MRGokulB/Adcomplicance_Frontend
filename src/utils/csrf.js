// getCsrfTokenFromCookie removed as it is ineffective for httpOnly cookies.
export const getCsrfTokenFromCookie = () => null;

export const hasCsrfToken = () => {
  return false;
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
