import React, { useRef } from 'react';

const VersionControl = () => {
  const fileInputRef = useRef();

  return (
    <div className="">
      {/* Latest Version Card */}
      <div className="info-section">
        <div className="info-card bg-green-50">
          <div className="info-card-header">
            <span className="info-badge-new">NEW</span>
            <span className="text-heading-2">Latest Version</span>
          </div>
          <div className="card-body">
            <div className="info-row">
              <span className="info-label">Version</span>
              <span className="info-value">1.0</span>
            </div>
            <div className="info-row">
              <span className="info-label">Uploaded By:</span>
              <span className="info-value">-</span>
            </div>
            <div className="info-row">
              <span className="info-label">On:</span>
              <span className="info-value">-</span>
            </div>
            <div className="info-row">
              <span className="info-label">Remarks:</span>
              <span className="info-value info-remark-box">none</span>
            </div>
            <div className="info-row">
              <span className="info-label">Files:</span>
              <span className="info-value info-file-list">windows screen recorder - Google Search - Google Chrome 2025-06-20 00-35-05.mp4</span>
            </div>
            <textarea className="info-comment-box" placeholder="Add a comment..." />
            <button className="btn btn-primary mt-2">Add Comment</button>
          </div>
        </div>
      </div>

      {/* Upload New Version */}
      <div className="info-section">
        <div className="info-card bg-blue-50">
          <div className="info-card-header flex-between ">
            <span className="card-title">Upload New Version</span>
            <button className = "btn btn-primary">Preview</button>
          </div>
          <div className="card-body">
            <input
              type="file"
              className="mb-3"
              ref={fileInputRef}
              multiple
            />
            <textarea
              className="input resize-none min-h-[48px] mb-3"
              placeholder="Enter remarks..."
            />
            <button className="btn btn-primary">Upload & Create</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VersionControl; 