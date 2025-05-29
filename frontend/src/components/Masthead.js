import React from 'react';
import '../styles/components/masthead.css';

const Masthead = () => {
  return (
    <div className="masthead-footer">
      <div className="masthead-content">
        <div className="brain-container">
          <div className="brain-sagittal">
            {/* Sagittal slice brain outline */}
            <svg className="brain-svg" viewBox="0 0 100 80" xmlns="http://www.w3.org/2000/svg">
              {/* Outer brain contour */}
              <path 
                d="M15,65 Q10,60 10,50 Q10,35 20,25 Q30,10 50,10 Q70,10 80,20 Q90,30 90,45 Q90,60 85,65 Q80,70 70,70 L25,70 Q15,70 15,65 Z" 
                className="brain-outline"
              />
              {/* Cerebellum */}
              <circle cx="75" cy="60" r="8" className="brain-cerebellum" />
              {/* Brain stem */}
              <rect x="70" y="65" width="4" height="8" rx="2" className="brain-stem" />
              {/* Sulci (brain folds) */}
              <path d="M25,35 Q40,30 55,35" className="brain-sulcus" />
              <path d="M30,45 Q45,40 60,45" className="brain-sulcus" />
              <path d="M25,55 Q40,50 55,55" className="brain-sulcus" />
            </svg>
            {/* Bayes formula overlay */}
            <div className="bayes-formula-overlay">P(H|E)</div>
          </div>
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
