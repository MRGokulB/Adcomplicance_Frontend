# Theme System Guide

This guide explains how to use the comprehensive theme system I've created for your React application. The theme system provides consistent styling across all components and makes it easy to maintain and update your design.

## 🎨 CSS Variables

All theme colors, spacing, and other design tokens are defined as CSS variables in `src/index.css`. You can easily change these to update your entire application's appearance.

### Colors
```css
:root {
  /* Primary Colors */
  --primary-50: #eff6ff;
  --primary-100: #dbeafe;
  --primary-500: #3b82f6;
  --primary-600: #2563eb;
  --primary-900: #1e3a8a;

  /* Status Colors */
  --success-500: #22c55e;
  --warning-500: #f59e0b;
  --error-500: #ef4444;
}
```

## 🧩 Component Classes

### Layout Utilities

#### Flexbox Layouts
```jsx
// Center content both horizontally and vertically
<div className="flex-center">
  <p>Centered content</p>
</div>

// Space items between
<div className="flex-between">
  <span>Left</span>
  <span>Right</span>
</div>

// Align items to start
<div className="flex-start">
  <span>Items aligned to start</span>
</div>

// Column layout centered
<div className="flex-col-center">
  <p>Vertical centered</p>
</div>
```

#### Container Layouts
```jsx
// Different container sizes
<div className="container-sm">Small container</div>
<div className="container-md">Medium container</div>
<div className="container-lg">Large container (recommended)</div>
<div className="container-xl">Extra large container</div>
```

#### Section Spacing
```jsx
// Different section padding
<section className="section-sm">Small padding</section>
<section className="section-md">Medium padding (recommended)</section>
<section className="section-lg">Large padding</section>
<section className="section-xl">Extra large padding</section>
```

### Button Components

#### Button Variants
```jsx
// Primary button (blue)
<button className="btn btn-primary">Primary Action</button>

// Secondary button (gray)
<button className="btn btn-secondary">Secondary Action</button>

// Outline button
<button className="btn btn-outline">Outline Button</button>

// Ghost button (transparent)
<button className="btn btn-ghost">Ghost Button</button>

// Status buttons
<button className="btn btn-success">Success</button>
<button className="btn btn-warning">Warning</button>
<button className="btn btn-error">Error</button>
```

#### Button Sizes
```jsx
<button className="btn btn-primary btn-sm">Small</button>
<button className="btn btn-primary">Default</button>
<button className="btn btn-primary btn-lg">Large</button>
<button className="btn btn-primary btn-xl">Extra Large</button>
```

#### Icon Buttons
```jsx
<button className="btn btn-primary btn-icon">
  <svg>...</svg>
</button>
```

### Badge Components

#### Badge Variants
```jsx
<span className="badge badge-primary">Primary</span>
<span className="badge badge-secondary">Secondary</span>
<span className="badge badge-success">Success</span>
<span className="badge badge-warning">Warning</span>
<span className="badge badge-error">Error</span>
<span className="badge badge-info">Info</span>
```

#### Status Badges
```jsx
<span className="badge badge-status-done">✓ Done</span>
<span className="badge badge-status-process">❄ In Process</span>
<span className="badge badge-status-pending">Pending</span>
<span className="badge badge-status-error">Error</span>
```

#### Badge Sizes
```jsx
<span className="badge badge-sm">Small</span>
<span className="badge">Default</span>
<span className="badge badge-lg">Large</span>
```

### Card Components

#### Basic Card Variants
```jsx
// Default card
<div className="card">
  <div className="card-body">Content</div>
</div>

// Card with hover effect
<div className="card-hover">
  <div className="card-body">Hover me</div>
</div>

// Interactive card
<div className="card-interactive">
  <div className="card-body">Click me</div>
</div>

// Elevated card
<div className="card-elevated">
  <div className="card-body">Elevated</div>
</div>

// Outlined card
<div className="card-outlined">
  <div className="card-body">Outlined</div>
</div>

// Glass morphism card
<div className="card-glass">
  <div className="card-body">Glass effect</div>
</div>

// Gradient card
<div className="card-gradient">
  <div className="card-body">Gradient background</div>
</div>
```

#### Card Sections
```jsx
<div className="card">
  <div className="card-header">
    <h3>Card Title</h3>
  </div>
  <div className="card-body">
    <p>Card content goes here</p>
  </div>
  <div className="card-footer">
    <button className="btn btn-primary">Action</button>
  </div>
</div>
```

#### Card Sizes
```jsx
<div className="card-sm">
  <div className="card-body">Small card</div>
</div>

<div className="card">
  <div className="card-body">Default card</div>
</div>

<div className="card-lg">
  <div className="card-body">Large card</div>
</div>

<div className="card-xl">
  <div className="card-body">Extra large card</div>
</div>
```

#### Responsive Card Grids
```jsx
// Standard responsive grid (1-4 columns)
<div className="card-grid">
  <div className="card">Item 1</div>
  <div className="card">Item 2</div>
  <div className="card">Item 3</div>
  <div className="card">Item 4</div>
</div>

// Compact grid (1-5 columns)
<div className="card-grid-compact">
  <div className="card">Compact 1</div>
  <div className="card">Compact 2</div>
  <div className="card">Compact 3</div>
  <div className="card">Compact 4</div>
  <div className="card">Compact 5</div>
</div>

// Wide grid (1-2 columns)
<div className="card-grid-wide">
  <div className="card">Wide 1</div>
  <div className="card">Wide 2</div>
</div>
```

#### Cards with Images
```jsx
<div className="card-with-image">
  <img src="image.jpg" alt="Description" className="card-image" />
  <div className="card-body">
    <h3 className="card-title">Card with Image</h3>
    <p className="card-description">Content with featured image</p>
  </div>
</div>

// Different image sizes
<img className="card-image-sm" /> // Small image
<img className="card-image" />    // Default image
<img className="card-image-lg" /> // Large image
```

#### Cards with Icons
```jsx
<div className="card-with-icon">
  <div className="card-body">
    <div className="card-icon">
      <svg>...</svg>
    </div>
    <h3 className="card-title">Icon Card</h3>
    <p className="card-description">Card with icon</p>
  </div>
</div>

// Different icon styles
<div className="card-icon">Default</div>
<div className="card-icon-success">Success</div>
<div className="card-icon-warning">Warning</div>
<div className="card-icon-error">Error</div>
```

#### Statistic Cards
```jsx
<div className="card-stat">
  <div className="card-stat-number">2,847</div>
  <div className="card-stat-label">Total Users</div>
  <div className="card-stat-change positive">+12.5% from last month</div>
</div>
```

#### Cards with Avatars
```jsx
<div className="card-avatar">JD</div>
<div className="card-avatar-sm">JD</div>
<div className="card-avatar-lg">JD</div>
```

#### Cards with Badges
```jsx
<div className="card-with-badge">
  <div className="card-badge">
    <span className="badge badge-success">New</span>
  </div>
  <div className="card-body">
    <h3 className="card-title">Card with Badge</h3>
    <p className="card-description">Content with badge</p>
  </div>
</div>
```

#### Accent Cards
```jsx
<div className="card-accent-primary">Primary accent</div>
<div className="card-accent-success">Success accent</div>
<div className="card-accent-warning">Warning accent</div>
<div className="card-accent-error">Error accent</div>
```

#### Special Hover Effects
```jsx
<div className="card-hover-lift">Lift effect on hover</div>
<div className="card-hover-scale">Scale effect on hover</div>
<div className="card-hover-glow">Glow effect on hover</div>
```

#### Pattern Background Cards
```jsx
<div className="card-pattern">
  <div className="card-body">
    <h3 className="card-title">Pattern Background</h3>
    <p className="card-description">Card with gradient pattern</p>
  </div>
</div>
```

#### Card Actions
```jsx
<div className="card">
  <div className="card-body">
    <h3 className="card-title">Card with Actions</h3>
    <p className="card-description">Content</p>
    <div className="card-actions">
      <div className="card-actions-left">
        <button className="btn btn-ghost btn-sm">Cancel</button>
      </div>
      <div className="card-actions-right">
        <button className="btn btn-primary btn-sm">Save</button>
      </div>
    </div>
  </div>
</div>
```

#### Loading States
```jsx
<div className="card-skeleton">
  <div className="card-body">
    <div className="card-skeleton-line short"></div>
    <div className="card-skeleton-line medium"></div>
    <div className="card-skeleton-line"></div>
  </div>
</div>
```

#### Responsive Text Classes
```jsx
<h3 className="card-title">Card Title (truncates after 2 lines)</h3>
<p className="card-subtitle">Card Subtitle (truncates after 2 lines)</p>
<p className="card-description">Card Description (truncates after 3 lines)</p>
```

### Input Components

#### Input Variants
```jsx
// Default input
<input className="input" placeholder="Enter text" />

// Error state
<input className="input input-error" placeholder="Error input" />

// Success state
<input className="input input-success" placeholder="Success input" />

// Select dropdown
<select className="select">
  <option>Choose option</option>
  <option>Option 1</option>
  <option>Option 2</option>
</select>
```

#### Input Sizes
```jsx
<input className="input input-sm" placeholder="Small" />
<input className="input" placeholder="Default" />
<input className="input input-lg" placeholder="Large" />
```

### Table Components

#### Table Structure
```jsx
<div className="table-container">
  <table className="table">
    <thead className="table-header">
      <tr>
        <th>Header 1</th>
        <th>Header 2</th>
      </tr>
    </thead>
    <tbody className="table-body">
      <tr>
        <td>Data 1</td>
        <td>Data 2</td>
      </tr>
    </tbody>
  </table>
</div>
```

#### Table Variants
```jsx
// Striped table
<table className="table table-striped">...</table>

// Bordered table
<table className="table table-bordered">...</table>

// Compact table
<table className="table table-compact">...</table>
```

### Navigation Components

#### Tabs
```jsx
<div className="tabs">
  <div className="tab-active">Active Tab</div>
  <div className="tab-inactive">Inactive Tab</div>
  <div className="tab-inactive">Another Tab</div>
</div>
```

#### Navigation Items
```jsx
<div className="nav-item">Regular Item</div>
<div className="nav-item-active">Active Item</div>
```

### Modal Components

```jsx
<div className="modal-overlay">
  <div className="modal">
    <div className="modal-header">
      <h3>Modal Title</h3>
      <button>×</button>
    </div>
    <div className="modal-body">
      <p>Modal content</p>
    </div>
    <div className="modal-footer">
      <button className="btn btn-secondary">Cancel</button>
      <button className="btn btn-primary">Save</button>
    </div>
  </div>
</div>
```

## 📝 Typography Utilities

```jsx
<h1 className="text-heading-1">Heading 1</h1>
<h2 className="text-heading-2">Heading 2</h2>
<h3 className="text-heading-3">Heading 3</h3>
<h4 className="text-heading-4">Heading 4</h4>
<p className="text-body">Body text</p>
<span className="text-caption">Caption text</span>
<small className="text-small">Small text</small>
```

## 📏 Spacing Utilities

```jsx
// Vertical spacing between children
<div className="space-y-xs">...</div>
<div className="space-y-sm">...</div>
<div className="space-y-md">...</div>
<div className="space-y-lg">...</div>
<div className="space-y-xl">...</div>

// Horizontal spacing between children
<div className="space-x-xs">...</div>
<div className="space-x-sm">...</div>
<div className="space-x-md">...</div>
<div className="space-x-lg">...</div>
<div className="space-x-xl">...</div>
```

## 🎭 Interactive States

```jsx
// Interactive element with hover and active states
<div className="interactive">
  Click me
</div>

// Loading state
<div className="loading">
  Loading content...
</div>

// Skeleton loading
<div className="skeleton h-4 w-full"></div>

// Focus ring
<button className="btn btn-primary focus-ring">
  Focus me
</button>
```

## 📱 Responsive Utilities

```jsx
// Responsive grid
<div className="responsive-grid">
  <div className="card">Item 1</div>
  <div className="card">Item 2</div>
  <div className="card">Item 3</div>
</div>

// Responsive flex
<div className="responsive-flex">
  <span>Label</span>
  <input className="input" />
</div>
```

## ✨ Animations

```jsx
// Fade in animation
<div className="fade-in">Content</div>

// Slide up animation
<div className="slide-up">Content</div>

// Slide down animation
<div className="slide-down">Content</div>

// Scale in animation
<div className="scale-in">Content</div>
```

## 🎨 Customizing the Theme

To change the theme colors, edit the CSS variables in `src/index.css`:

```css
:root {
  /* Change primary color */
  --primary-500: #your-color;
  --primary-600: #your-darker-color;
  
  /* Change success color */
  --success-500: #your-success-color;
  
  /* Change spacing */
  --spacing-md: 1.25rem;
  
  /* Change border radius */
  --radius-lg: 0.75rem;
}
```

## 🔄 Migration Guide

### Before (Old way)
```jsx
<div className="flex justify-between items-center p-4 border-b border-gray-200">
  <button className="px-4 py-2 bg-blue-600 text-white border-none rounded-lg text-sm cursor-pointer transition-colors duration-200 hover:bg-blue-700">
    Action
  </button>
</div>
```

### After (New way)
```jsx
<div className="flex-between p-4 border-b border-gray-200">
  <button className="btn btn-primary">
    Action
  </button>
</div>
```

## 🎯 Best Practices

1. **Use semantic class names**: Prefer `btn btn-primary` over `px-4 py-2 bg-blue-600`
2. **Combine layout and component classes**: Use `flex-between` with `btn btn-primary`
3. **Use consistent spacing**: Use `section-md` for consistent page sections
4. **Leverage responsive utilities**: Use `responsive-grid` for adaptive layouts
5. **Maintain consistency**: Use the same badge/button variants throughout your app

## 🚀 Benefits

- **Consistency**: All components use the same design tokens
- **Maintainability**: Change colors/spacing in one place
- **Performance**: Reduced CSS bundle size
- **Developer Experience**: Semantic class names are easier to understand
- **Accessibility**: Built-in focus states and proper contrast ratios
- **Responsive**: Mobile-first responsive design

This theme system will make your development faster and your application more consistent and maintainable! 