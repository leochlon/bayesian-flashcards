import '../styles/components/navigation.css';
import React from 'react';

const NavigationHeader = ({ 
  view, 
  navigateTo, 
  currentSession,
  timer,
  isTimerRunning,
  startTimer,
  stopTimer,
  resetTimer,
  easyMode,
  pomodoroTimer,
  isPomodoroRunning,
  startPomodoroTimer,
  stopPomodoroTimer,
  resetPomodoroTimer,
  isBreakTime,
  breakTimer,
  skipBreak
}) => {
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isUsingPomodoro = view === 'study'; // Always use pomodoro in study mode
  const currentTimer = isUsingPomodoro ? (isBreakTime ? breakTimer : pomodoroTimer) : timer;
  const currentIsRunning = isUsingPomodoro ? isPomodoroRunning : isTimerRunning;
  const currentStartFunction = isUsingPomodoro ? startPomodoroTimer : startTimer;
  const currentStopFunction = isUsingPomodoro ? stopPomodoroTimer : stopTimer;
  const currentResetFunction = isUsingPomodoro ? resetPomodoroTimer : resetTimer;
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
            <div className={`legacy-timer-display ${isUsingPomodoro ? 'pomodoro-timer' : ''} ${isBreakTime ? 'break-time' : ''}`}>
              <div className="timer-time">
                {formatTime(currentTimer)}
              </div>
              {isUsingPomodoro && (
                <div className="timer-mode-indicator">
                  {isBreakTime ? '(Break)' : '(Focus)'}
                </div>
              )}
            </div>
            <button 
              className="legacy-timer-button" 
              onClick={currentIsRunning ? currentStopFunction : currentStartFunction}
            >
              {currentIsRunning ? '⏸' : '▶'}
            </button>
            <button 
              className="legacy-timer-button" 
              onClick={currentResetFunction}
            >
              ↺
            </button>
            {isBreakTime && (
              <button 
                className="legacy-timer-button skip-break-button" 
                onClick={skipBreak}
              >
                Skip Break
              </button>
            )}
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