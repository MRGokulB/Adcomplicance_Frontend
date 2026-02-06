import React from 'react';

/**
 * PageHeader - Standardized header component for all pages
 * Provides consistent spacing, typography, and layout across the application
 */
const PageHeader = ({ title, subtitle, actions, loading = false }) => {
    return (
        <div className="flex-between items-center mb-6">
            <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900">
                    {title}
                </h1>
                {subtitle && (
                    <p className="text-sm text-gray-600 mt-2">
                        {subtitle}
                        {loading && <span className="ml-2 text-blue-600">• Loading...</span>}
                    </p>
                )}
            </div>

            {actions && (
                <div className="flex gap-2 ml-4">
                    {actions}
                </div>
            )}
        </div>
    );
};

export default PageHeader;
