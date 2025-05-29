import React from 'react';
import '../styles/components/masthead.css';
import logo from '../logo.svg'; // Default React logo as fallback

const Masthead = () => {
  return (
    <div className="masthead-footer">
      <div className="masthead-content">
        <div className="logo-container">
          <img 
            src={`${process.env.PUBLIC_URL}/logo.png`} 
            alt="Bayesian Flashcards Logo" 
            className="app-logo"
            onError={(e) => {
              // Fallback to SVG logo if PNG fails to load
              e.target.src = logo;
              console.warn('Failed to load PNG logo, falling back to SVG');
            }}
          />
        </div>
        <div className="masthead-text">
          <h2 className="app-title">Bayesian Flashcards</h2>
          <p className="app-credits">Leon Chlon • Hassana Labs</p>
        </div>
      </div>
    </div>
  );
};

export default Masthead;
