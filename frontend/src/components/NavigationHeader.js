import React from 'react';

const NavigationHeader = ({ 
  view, 
  navigateTo, 
  currentSession,
  timer,
  isTimerRunning,
  startTimer,
  stopTimer,
  resetTimer 
}) => {
  return (
    <div className="legacy-nav-bar">
      <div className="legacy-nav-group">
        <button 
          className={`legacy-nav-button ${(view === 'decks' || view === 'home') ? 'active' : ''}`} 
          onClick={() => navigateTo('decks')}
        >
          Decks
        </button>
        <button 
          className={`legacy-nav-button ${view === 'add' ? 'active' : ''}`} 
          onClick={() => navigateTo('add')}
        >
          Add
        </button>
        <button 
          className={`legacy-nav-button ${view === 'manage' ? 'active' : ''}`} 
          onClick={() => navigateTo('manage')}
        >
          Manage
        </button>
        <button 
          className={`legacy-nav-button ${view === 'stats' ? 'active' : ''}`} 
          onClick={() => navigateTo('stats')}
        >
          Stats
        </button>
        <button 
          className={`legacy-nav-button ${view === 'settings' ? 'active' : ''}`} 
          onClick={() => navigateTo('settings')}
        >
          Settings
        </button>
      </div>
      <div className="legacy-session-timer-group">
        {view === 'study' && (
          <div className="legacy-timer-row">
            <span className="legacy-timer-display">
              {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}
            </span>
            <button 
              className="legacy-timer-button" 
              onClick={isTimerRunning ? stopTimer : startTimer}
            >
              {isTimerRunning ? '⏸' : '▶'}
            </button>
            <button 
              className="legacy-timer-button" 
              onClick={resetTimer}
            >
              ↺
            </button>
            {currentSession && (
              <span className="legacy-session-name">{currentSession.name}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default NavigationHeader;