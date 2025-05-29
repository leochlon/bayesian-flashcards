import React from 'react';
import '../../styles/views/review.css';
import ZoomableImage from '../FixedZoomableImage';

const StudyView = ({
  currentSession,
  currentDeck,
  reviewCard,
  showBack,
  setShowBack,
  rating,
  setRating,
  timer,
  isTimerRunning,
  stopTimer,
  easyMode,
  handleEasyModeToggle,
  endStudySession,
  handleReview
}) => {
  return (
    <div className="legacy-review-container">
      {easyMode && (
        <div className="easy-mode-banner">
          <span className="easy-mode-banner-text">🎯 EASY MODE ACTIVE</span>
          <span className="easy-mode-banner-description">Relaxed scheduling • Extended review intervals</span>
        </div>
      )}
      {currentSession && (
        <div className={`legacy-active-session-row ${easyMode ? 'easy-mode-active' : ''}`}>
          <div className="legacy-session-label">Session: <span className="legacy-session-name">{currentSession.name}</span></div>
          <div className="legacy-session-controls-row">
            <div className={`legacy-easy-mode-toggle ${easyMode ? 'active' : ''}`}>
              <label>
                <input
                  type="checkbox"
                  checked={easyMode}
                  onChange={handleEasyModeToggle}
                />
                <span className="legacy-easy-mode-label">Easy Mode</span>
                {easyMode && <span className="legacy-easy-mode-indicator">✓</span>}
              </label>
            </div>
            <button 
              onClick={endStudySession} 
              className="legacy-end-session-btn"
            >
              End Session
            </button>
          </div>
        </div>
      )}
      {reviewCard ? (
        <div className={`legacy-review-card ${easyMode ? 'easy-mode-active' : ''}`}>
          <div className="legacy-card-content">
            <div className="legacy-card-text" dangerouslySetInnerHTML={{ __html: reviewCard.front }} />
            {reviewCard.frontImage && (
              <ZoomableImage src={reviewCard.frontImage} alt="Front" className="legacy-card-image" />
            )}
          </div>
          {showBack ? (
            <div className="legacy-back-content">
              <div className="legacy-card-text" dangerouslySetInnerHTML={{ __html: reviewCard.back }} />
              {reviewCard.backImage && (
                <ZoomableImage src={reviewCard.backImage} alt="Back" className="legacy-card-image" />
              )}
              <div className="legacy-rating-controls-row">
                <span className="legacy-rating-label">Hard</span>
                <input 
                  type="range"
                  min="1"
                  max="5"
                  value={rating}
                  onChange={(e) => setRating(parseInt(e.target.value))}
                  className="legacy-rating-slider"
                />
                <span className="legacy-rating-label">Easy</span>
                <button onClick={handleReview} className="legacy-submit-button">Submit Review</button>
              </div>
            </div>
          ) : (
            <button onClick={() => {
              setShowBack(true);
              stopTimer();
            }} 
              className="legacy-show-answer">Show Answer</button>
          )}
        </div>
      ) : (
        <p className="legacy-loading-card">Loading card...</p>
      )}
    </div>
  );
};

export default StudyView;