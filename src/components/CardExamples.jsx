import React from 'react';

const CardExamples = () => {
  return (
    <div className="container-lg section-md">
      <h1 className="text-heading-1 mb-8">Responsive Card Examples</h1>
      
      <section className="mb-12">
        <h2 className="text-heading-2 mb-6">Basic Card Variants</h2>
        <div className="card-grid">
          <div className="card">
            <div className="card-body">
              <h3 className="card-title">Default Card</h3>
              <p className="card-description">A simple card with clean design and subtle shadow.</p>
            </div>
          </div>

          <div className="card-hover">
            <div className="card-body">
              <h3 className="card-title">Hover Card</h3>
              <p className="card-description">Hover over me to see the lift effect and enhanced shadow.</p>
            </div>
          </div>

          <div className="card-elevated">
            <div className="card-body">
              <h3 className="card-title">Elevated Card</h3>
              <p className="card-description">Card with prominent shadow for important content.</p>
            </div>
          </div>

          <div className="card-outlined">
            <div className="card-body">
              <h3 className="card-title">Outlined Card</h3>
              <p className="card-description">Clean outline design without background shadow.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-heading-2 mb-6">Cards with Images</h2>
        <div className="card-grid">
          <div className="card-with-image">
            <img 
              src="https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400&h=200&fit=crop" 
              alt="Code" 
              className="card-image"
            />
            <div className="card-body">
              <h3 className="card-title">Card with Image</h3>
              <p className="card-description">Beautiful card with featured image and responsive design.</p>
              <div className="card-actions">
                <button className="btn btn-primary btn-sm">Learn More</button>
              </div>
            </div>
          </div>

          <div className="card-with-image card-hover">
            <img 
              src="https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400&h=200&fit=crop" 
              alt="Development" 
              className="card-image"
            />
            <div className="card-body">
              <h3 className="card-title">Interactive Image Card</h3>
              <p className="card-description">Hover over this card to see smooth animations.</p>
              <div className="card-actions">
                <button className="btn btn-secondary btn-sm">View Details</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-heading-2 mb-6">Cards with Icons</h2>
        <div className="card-grid">
          <div className="card-with-icon">
            <div className="card-body">
              <div className="card-icon">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="card-title">Success Card</h3>
              <p className="card-description">Card with success icon and positive messaging.</p>
            </div>
          </div>

          <div className="card-with-icon">
            <div className="card-body">
              <div className="card-icon-warning">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="card-title">Warning Card</h3>
              <p className="card-description">Card with warning icon for important notices.</p>
            </div>
          </div>

          <div className="card-with-icon">
            <div className="card-body">
              <div className="card-icon-error">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="card-title">Error Card</h3>
              <p className="card-description">Card with error icon for critical issues.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-heading-2 mb-6">Statistic Cards</h2>
        <div className="card-grid-compact">
          <div className="card-stat">
            <div className="card-stat-number">2,847</div>
            <div className="card-stat-label">Total Users</div>
            <div className="card-stat-change positive">+12.5% from last month</div>
          </div>

          <div className="card-stat">
            <div className="card-stat-number">$45,231</div>
            <div className="card-stat-label">Revenue</div>
            <div className="card-stat-change positive">+8.2% from last month</div>
          </div>

          <div className="card-stat">
            <div className="card-stat-number">1,234</div>
            <div className="card-stat-label">Orders</div>
            <div className="card-stat-change negative">-2.1% from last month</div>
          </div>

          <div className="card-stat">
            <div className="card-stat-number">98.5%</div>
            <div className="card-stat-label">Uptime</div>
            <div className="card-stat-change positive">+0.3% from last month</div>
          </div>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-heading-2 mb-6">Accent Cards</h2>
        <div className="card-grid">
          <div className="card-accent-primary">
            <div className="card-body">
              <h3 className="card-title">Primary Accent</h3>
              <p className="card-description">Card with blue accent border for primary actions.</p>
            </div>
          </div>

          <div className="card-accent-success">
            <div className="card-body">
              <h3 className="card-title">Success Accent</h3>
              <p className="card-description">Card with green accent border for success states.</p>
            </div>
          </div>

          <div className="card-accent-warning">
            <div className="card-body">
              <h3 className="card-title">Warning Accent</h3>
              <p className="card-description">Card with yellow accent border for warnings.</p>
            </div>
          </div>

          <div className="card-accent-error">
            <div className="card-body">
              <h3 className="card-title">Error Accent</h3>
              <p className="card-description">Card with red accent border for errors.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-heading-2 mb-6">Special Effect Cards</h2>
        <div className="card-grid">
          <div className="card-hover-lift">
            <div className="card-body">
              <h3 className="card-title">Lift Effect</h3>
              <p className="card-description">Hover to see the card lift up with enhanced shadow.</p>
            </div>
          </div>

          <div className="card-hover-scale">
            <div className="card-body">
              <h3 className="card-title">Scale Effect</h3>
              <p className="card-description">Hover to see the card scale up slightly.</p>
            </div>
          </div>

          <div className="card-hover-glow">
            <div className="card-body">
              <h3 className="card-title">Glow Effect</h3>
              <p className="card-description">Hover to see a beautiful blue glow effect.</p>
            </div>
          </div>

          <div className="card-glass">
            <div className="card-body">
              <h3 className="card-title">Glass Effect</h3>
              <p className="card-description">Modern glass morphism design with backdrop blur.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-heading-2 mb-6">Complex Cards</h2>
        <div className="card-grid-wide">
          <div className="card-with-badge">
            <div className="card-badge">
              <span className="badge badge-success">New</span>
            </div>
            <div className="card-header">
              <div className="flex items-center gap-3">
                <div className="card-avatar">JD</div>
                <div>
                  <h3 className="card-title">John Doe</h3>
                  <p className="card-subtitle">Senior Developer</p>
                </div>
              </div>
            </div>
            <div className="card-body">
              <p className="card-description">
                Experienced full-stack developer with expertise in React, Node.js, and cloud technologies. 
                Passionate about creating scalable and maintainable applications.
              </p>
              <div className="flex gap-2 mt-4">
                <span className="badge badge-primary">React</span>
                <span className="badge badge-primary">Node.js</span>
                <span className="badge badge-primary">AWS</span>
              </div>
            </div>
            <div className="card-footer">
              <div className="card-actions">
                <div className="card-actions-left">
                  <button className="btn btn-ghost btn-sm">View Profile</button>
                </div>
                <div className="card-actions-right">
                  <button className="btn btn-primary btn-sm">Contact</button>
                </div>
              </div>
            </div>
          </div>

          <div className="card-pattern">
            <div className="card-header">
              <h3 className="card-title">Pattern Background</h3>
              <p className="card-subtitle">Card with subtle gradient pattern</p>
            </div>
            <div className="card-body">
              <p className="card-description">
                This card features a beautiful gradient pattern background that adds visual interest 
                without overwhelming the content. Perfect for highlighting important information.
              </p>
              <div className="mt-4">
                <button className="btn btn-primary">Learn More</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-heading-2 mb-6">Loading States</h2>
        <div className="card-grid">
          <div className="card-skeleton">
            <div className="card-body">
              <div className="card-skeleton-line short"></div>
              <div className="card-skeleton-line medium"></div>
              <div className="card-skeleton-line"></div>
            </div>
          </div>

          <div className="card-skeleton">
            <div className="card-body">
              <div className="card-skeleton-line short"></div>
              <div className="card-skeleton-line medium"></div>
              <div className="card-skeleton-line"></div>
            </div>
          </div>

          <div className="card-skeleton">
            <div className="card-body">
              <div className="card-skeleton-line short"></div>
              <div className="card-skeleton-line medium"></div>
              <div className="card-skeleton-line"></div>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-heading-2 mb-6">Responsive Grid Layouts</h2>
        
        <h3 className="text-heading-3 mb-4">Compact Grid (5 columns on XL)</h3>
        <div className="card-grid-compact mb-8">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="card">
              <div className="card-body">
                <h4 className="card-title">Item {i}</h4>
                <p className="card-description">Compact card in responsive grid.</p>
              </div>
            </div>
          ))}
        </div>

        <h3 className="text-heading-3 mb-4">Wide Grid (2 columns on LG+)</h3>
        <div className="card-grid-wide">
          <div className="card">
            <div className="card-body">
              <h4 className="card-title">Wide Card 1</h4>
              <p className="card-description">This card takes up more space in the wide grid layout.</p>
            </div>
          </div>
          <div className="card">
            <div className="card-body">
              <h4 className="card-title">Wide Card 2</h4>
              <p className="card-description">Perfect for detailed content that needs more room.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CardExamples; 