import '../styles/components/navigation.css';
import React from 'react';

const NavigationBar = ({ 
  view, 
  handleNavigation, 
  timer, 
  isTimerRunning, 
  stopTimer, 
  startTimer, 
  resetTimer 
}) => {
  return (
    <div className="nav-bar">
      <button className={`nav-button ${view === 'decks' ? 'active' : ''}`} onClick={() => handleNavigation('decks')}>Decks</button>
      <button className={`nav-button ${view === 'add' ? 'active' : ''}`} onClick={() => handleNavigation('add')}>Add</button>
      <button className={`nav-button ${view === 'manage' ? 'active' : ''}`} onClick={() => handleNavigation('manage')}>Manage</button>
      <button className={`nav-button ${view === 'stats' ? 'active' : ''}`} onClick={() => handleNavigation('stats')}>Stats</button>
      <button className={`nav-button ${view === 'settings' ? 'active' : ''}`} onClick={() => handleNavigation('settings')}>Settings</button>
      {view === 'review' && (
        <div className="timer-container">
          <span className="timer-display">{Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}</span>
          <button className="timer-button" onClick={isTimerRunning ? stopTimer : startTimer}>
            {isTimerRunning ? '⏸' : '▶'}
          </button>
          <button className="timer-button" onClick={resetTimer}>↺</button>
        </div>
      )}
    </div>
  );
};

export default NavigationBar;
