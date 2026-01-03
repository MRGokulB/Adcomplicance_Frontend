import React from 'react';
import PropTypes from 'prop-types';

const Badge = ({ children, variant = 'primary', size = 'md', className = '', ...props }) => {
    const baseClass = 'badge';
    const variantClass = `badge-${variant}`;
    const sizeClass = size === 'md' ? '' : `badge-${size}`;

    return (
        <span className={`${baseClass} ${variantClass} ${sizeClass} ${className}`} {...props}>
            {children}
        </span>
    );
};

Badge.propTypes = {
    children: PropTypes.node,
    variant: PropTypes.string,
    size: PropTypes.oneOf(['sm', 'md', 'lg']),
    className: PropTypes.string,
};

export default Badge;
