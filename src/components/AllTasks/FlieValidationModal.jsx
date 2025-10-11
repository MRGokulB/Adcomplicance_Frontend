import React, { useState } from 'react';

const FileValidationModal = ({ onClose, onValidate, isValidating }) => {
  const [files, setFiles] = useState([]);
  const [fileUrls, setFileUrls] = useState('');
  const [validationResults, setValidationResults] = useState(null);
  const [error, setError] = useState('');

  const handleFileUrlsChange = (e) => {
    const urls = e.target.value;
    setFileUrls(urls);
    
    const urlList = urls
      .split(/[\n,]/)
      .map(url => url.trim())
      .filter(url => url.length > 0);
    
    setFiles(urlList);
    setError('');
  };

  const handleValidate = async () => {
    if (files.length === 0) {
      setError('Please enter at least one file URL to validate');
      return;
    }

    setError('');
    try {
      const result = await onValidate(files);
      setValidationResults(result);
    } catch (err) {
      setError(err.message || 'Validation failed. Please try again.');
    }
  };

  const handleClose = () => {
    setFiles([]);
    setFileUrls('');
    setValidationResults(null);
    setError('');
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
          <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={handleClose}></div>

          <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
            
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Validate Files
                </h3>
                <button
                  onClick={handleClose}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <p className="text-sm text-gray-600 mb-4">
                Enter file URLs to validate their format, accessibility, and metadata. 
                One URL per line or comma-separated.
              </p>

              <div className="mb-4">
                <label className="info-label">File URLs</label>
                <textarea
                  value={fileUrls}
                  onChange={handleFileUrlsChange}
                  placeholder="https://example.com/file1.pdf
https://example.com/file2.jpg
https://example.com/file3.doc"
                  className="input"
                  rows={6}
                  disabled={isValidating}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {files.length} file{files.length !== 1 ? 's' : ''} to validate
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {validationResults && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Validation Results</h4>
                  
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                      <div>
                        <div className="text-lg font-semibold text-gray-900">{validationResults.totalFiles}</div>
                        <div className="text-xs text-gray-600">Total</div>
                      </div>
                      <div>
                        <div className="text-lg font-semibold text-green-600">{validationResults.validFiles}</div>
                        <div className="text-xs text-gray-600">Valid</div>
                      </div>
                      <div>
                        <div className="text-lg font-semibold text-red-600">{validationResults.invalidFiles}</div>
                        <div className="text-xs text-gray-600">Invalid</div>
                      </div>
                      <div>
                        <div className={`text-lg font-semibold ${validationResults.valid ? 'text-green-600' : 'text-red-600'}`}>
                          {validationResults.valid ? 'PASS' : 'FAIL'}
                        </div>
                        <div className="text-xs text-gray-600">Overall</div>
                      </div>
                    </div>
                  </div>

                  <div className="max-h-64 overflow-y-auto">
                    {validationResults.results?.map((result, index) => (
                      <div key={index} className="mb-2 p-2 border rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {result.url}
                            </p>
                            {result.metadata && (
                              <p className="text-xs text-gray-500">
                                Size: {result.metadata.size || 'Unknown'} | 
                                Type: {result.metadata.type || 'Unknown'}
                              </p>
                            )}
                          </div>
                          <div className="ml-2 flex-shrink-0">
                            {result.isValidFormat && result.exists ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Valid
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                Invalid
                              </span>
                            )}
                          </div>
                        </div>
                        {(!result.isValidFormat || !result.exists) && (
                          <div className="mt-1 text-xs text-red-600">
                            {!result.exists && "File not accessible. "}
                            {!result.isValidFormat && "Invalid format. "}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                onClick={handleValidate}
                disabled={isValidating || files.length === 0}
                className="btn btn-primary sm:ml-3 sm:w-auto w-full"
              >
                {isValidating ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Validating...
                  </>
                ) : (
                  'Validate Files'
                )}
              </button>
              <button
                onClick={handleClose}
                className="btn btn-secondary mt-3 sm:mt-0 sm:mr-3 sm:w-auto w-full"
              >
                {validationResults ? 'Close' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default FileValidationModal;