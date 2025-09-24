import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

const ReportFilters = ({ filters, onFilterChange, filterFields, options = {} }) => {
  const [localFilters, setLocalFilters] = useState(filters);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Sync local filters with parent when filters prop changes
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleInputChange = (fieldId, value) => {
    setLocalFilters(prev => ({ ...prev, [fieldId]: value }));
  };

  const applyFilters = () => {
    onFilterChange(localFilters);
  };

  const resetFilters = () => {
    const emptyFilters = Object.keys(filters).reduce((acc, key) => {
      acc[key] = '';
      return acc;
    }, {});
    
    setLocalFilters(emptyFilters);
    onFilterChange(emptyFilters);
  };

  // Check if any filters are applied
  const hasActiveFilters = () => {
    return Object.values(localFilters).some(value => value && value !== '');
  };

  // Get quick filter presets for common date ranges
  const getDatePresets = () => [
    { 
      label: 'Today', 
      value: () => {
        const today = new Date().toISOString().split('T')[0];
        return { dateFrom: today, dateTo: today };
      }
    },
    { 
      label: 'This Week', 
      value: () => {
        const today = new Date();
        const firstDay = new Date(today.setDate(today.getDate() - today.getDay()));
        const lastDay = new Date(today.setDate(today.getDate() - today.getDay() + 6));
        return { 
          dateFrom: firstDay.toISOString().split('T')[0],
          dateTo: lastDay.toISOString().split('T')[0]
        };
      }
    },
    { 
      label: 'This Month', 
      value: () => {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        return { 
          dateFrom: firstDay.toISOString().split('T')[0],
          dateTo: lastDay.toISOString().split('T')[0]
        };
      }
    },
    { 
      label: 'Last 30 Days', 
      value: () => {
        const today = new Date();
        const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));
        return { 
          dateFrom: thirtyDaysAgo.toISOString().split('T')[0],
          dateTo: new Date().toISOString().split('T')[0]
        };
      }
    }
  ];

  const applyDatePreset = (preset) => {
    const dateValues = preset.value();
    const updatedFilters = { ...localFilters, ...dateValues };
    setLocalFilters(updatedFilters);
    onFilterChange(updatedFilters);
  };

  const renderFilterField = (field) => {
    switch (field.type) {
      case 'text':
        return (
          <div key={field.id}>
            <label className="exchange-form-label">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type="text"
              className="input"
              placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
              value={localFilters[field.id] || ''}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
            />
          </div>
        );

      case 'select':
        return (
          <div key={field.id}>
            <label className="exchange-form-label">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <select
              className="exchange-form-select"
              value={localFilters[field.id] || ''}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
            >
              <option value="">All {field.label}</option>
              {field.options?.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        );

      case 'date':
        return (
          <div key={field.id}>
            <label className="exchange-form-label">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <input
              type="date"
              className="exchange-date-input"
              value={localFilters[field.id] || ''}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              max={field.maxDate || new Date().toISOString().split('T')[0]}
            />
          </div>
        );

      case 'dateRange':
        return (
          <div key={field.id} className="md:col-span-2">
            <label className="exchange-form-label">{field.label}</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                className="exchange-date-input"
                placeholder="From"
                value={localFilters.dateFrom || ''}
                onChange={(e) => handleInputChange('dateFrom', e.target.value)}
                max={localFilters.dateTo || new Date().toISOString().split('T')[0]}
              />
              <input
                type="date"
                className="exchange-date-input"
                placeholder="To"
                value={localFilters.dateTo || ''}
                onChange={(e) => handleInputChange('dateTo', e.target.value)}
                min={localFilters.dateFrom}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>
        );

      case 'multiSelect':
        return (
          <div key={field.id}>
            <label className="exchange-form-label">{field.label}</label>
            <select
              className="exchange-form-select"
              multiple
              value={localFilters[field.id] || []}
              onChange={(e) => {
                const values = Array.from(e.target.selectedOptions, option => option.value);
                handleInputChange(field.id, values);
              }}
            >
              {field.options?.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        );

      case 'number':
        return (
          <div key={field.id}>
            <label className="exchange-form-label">{field.label}</label>
            <input
              type="number"
              className="input"
              placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
              value={localFilters[field.id] || ''}
              onChange={(e) => handleInputChange(field.id, e.target.value)}
              min={field.min}
              max={field.max}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="card mb-6">
      <div className="card-body">
        {/* Filter Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-medium text-gray-700">Filters</h3>
            {hasActiveFilters() && (
              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                {Object.values(localFilters).filter(v => v && v !== '').length} active
              </span>
            )}
          </div>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            {isCollapsed ? 'Show Filters' : 'Hide Filters'}
          </button>
        </div>

        {!isCollapsed && (
          <>
            {/* Date Range Presets */}
            {filterFields.some(field => field.type === 'date' || field.type === 'dateRange') && (
              <div className="mb-4">
                <p className="text-xs font-medium text-gray-600 mb-2">Quick Date Filters:</p>
                <div className="flex flex-wrap gap-2">
                  {getDatePresets().map(preset => (
                    <button
                      key={preset.label}
                      onClick={() => applyDatePreset(preset)}
                      className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Filter Fields Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {filterFields.map(field => renderFilterField(field))}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-100">
              <div className="text-xs text-gray-500">
                {hasActiveFilters() && 'Filters applied - click "Apply Filters" to update results'}
              </div>
              
              <div className="flex gap-3">
                <button 
                  className="btn btn-secondary"
                  onClick={resetFilters}
                  disabled={!hasActiveFilters()}
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Reset
                </button>
                <button 
                  className="btn btn-primary"
                  onClick={applyFilters}
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
                  </svg>
                  Apply Filters
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

ReportFilters.propTypes = {
  filters: PropTypes.object.isRequired,
  onFilterChange: PropTypes.func.isRequired,
  filterFields: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    type: PropTypes.oneOf(['text', 'select', 'date', 'dateRange', 'multiSelect', 'number']).isRequired,
    label: PropTypes.string.isRequired,
    placeholder: PropTypes.string,
    required: PropTypes.bool,
    options: PropTypes.arrayOf(PropTypes.shape({
      value: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired
    })),
    min: PropTypes.number,
    max: PropTypes.number,
    maxDate: PropTypes.string
  })).isRequired,
  options: PropTypes.object
};

export default ReportFilters;