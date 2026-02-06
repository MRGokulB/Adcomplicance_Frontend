import { isRejectedWithValue } from '@reduxjs/toolkit';
import { notify } from '../../utils/toast';

/**
 * Log a warning and show a toast!
 */
export const rtkQueryErrorLogger = (api) => (next) => (action) => {
    // RTK Query uses 'isRejectedWithValue' matcher
    if (isRejectedWithValue(action)) {
        const errorData = action.payload;
        const status = errorData?.status;
        const message = errorData?.data?.message || errorData?.error || 'An unexpected error occurred';

        // 1. Ignore 401s (Handled by auth redirect)
        // 2. Ignore 404s (Usually handled by UI placeholders)
        // 3. Ignore if explicitly suppressed (custom meta flag if we added one)
        if (status !== 401 && status !== 404) {
            console.warn('Middleware caught API Error:', message);
            // notify.error(`Error: ${message}`); // Disabled per user request
        }
    }

    return next(action);
};
