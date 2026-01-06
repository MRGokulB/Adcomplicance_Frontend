let isRefreshing = false;
let refreshPromise = null;

export const refreshCsrfToken = async (api) => {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;

  refreshPromise = (async () => {
    try {
      const csrfResponse = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/csrf-token`,
        { credentials: 'include' }
      );

      if (csrfResponse.ok) {
        const data = await csrfResponse.json();

        const { setCsrfToken } = await import('../slices/csrfSlice');

        // Removed dead cookie logic
        api.dispatch(setCsrfToken(data.csrfToken));

        return true;
      }

      console.error(' Failed to fetch CSRF token');
      return false;
    } catch (error) {
      console.error(' Error refreshing CSRF token:', error);
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};