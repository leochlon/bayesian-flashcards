import React, { useState, useEffect } from 'react';
import '../styles/components/loading-screen.css';
import { API } from '../api';

const LoadingScreen = ({ backendError, checkBackendStatus }) => {
  const [loadingMessage, setLoadingMessage] = useState('Starting backend services...');
  const [elapsedTime, setElapsedTime] = useState(0);
  const loadingMessages = [
    'Starting backend services...',
    'Initializing database...',
    'Loading deck information...',
    'Preparing flashcard system...',
    'Almost there...'
  ];

  // Cycle through messages to give a more dynamic loading experience
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(prev => prev + 1);
      const messageIndex = Math.min(Math.floor(elapsedTime / 3), loadingMessages.length - 1);
      setLoadingMessage(loadingMessages[messageIndex]);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [elapsedTime]);

  return (
    <div className="loading-screen-container">
      <div className="loading-screen-content">
        <div className="loading-logo">
          <img 
            src={`${process.env.PUBLIC_URL}/logo.png`} 
            alt="Bayesian Flashcards Logo" 
            className="loading-app-logo"
          />
        </div>
        
        <h1 className="loading-title">Bayesian Flashcards</h1>
        
        {backendError ? (
          <div className="loading-error">
            <div className="loading-error-icon">!</div>
            <h3>Connection Issue</h3>
            <p className="loading-error-message">{backendError}</p>
            <p className="loading-error-hint">
              The backend service may still be starting up or isn't responding.
            </p>
            <button onClick={() => checkBackendStatus(true)} className="loading-retry-btn">
              Retry Connection
            </button>
            <p className="loading-api-url">
              Backend URL: {API}
            </p>
          </div>
        ) : (
          <div className="loading-status">
            <div className="loading-spinner">
              <div className="loading-spinner-inner"></div>
            </div>
            <p className="loading-message">{loadingMessage}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoadingScreen;