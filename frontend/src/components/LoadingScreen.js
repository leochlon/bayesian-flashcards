import React from 'react';

const LoadingScreen = ({ backendError, checkBackendStatus, API }) => {
  return (
    <div className="app-container loading-container">
      <div className="loading-content">
        <h2>Starting Bayesian Flashcards</h2>
        {backendError ? (
          <div className="error-message">
            <p>{backendError}</p>
            <p>Make sure the backend server is running at {API}</p>
            <button onClick={checkBackendStatus} className="retry-button">
              Retry Connection
            </button>
          </div>
        ) : (
          <div className="loading-message">
            <div className="spinner"></div>
            <p>Connecting to Backend...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoadingScreen;