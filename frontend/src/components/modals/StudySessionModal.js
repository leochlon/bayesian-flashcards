import React, { useState } from 'react';

const StudySessionModal = ({ onClose, onSubmit }) => {
  const [sessionName, setSessionName] = useState(`Session ${new Date().toLocaleString()}`);
  const [pomodoroWorkMinutes, setPomodoroWorkMinutes] = useState(25);
  const [pomodoroBreakMinutes, setPomodoroBreakMinutes] = useState(5);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedName = sessionName.trim() || `Session ${new Date().toLocaleString()}`;
    onSubmit(trimmedName, {
      workMinutes: pomodoroWorkMinutes,
      breakMinutes: pomodoroBreakMinutes
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content create-deck-modal" onClick={e => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <h2>New Study Session</h2>
          <div className="modal-body">
            <label htmlFor="session-name">Session Name</label>
            <input
              id="session-name"
              type="text"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              placeholder="Enter session name"
              className="deck-name-input"
              autoFocus
            />
            
            <div className="pomodoro-settings">
              <h3>Pomodoro Timer Settings</h3>
              
              <div className="pomodoro-input-group">
                <label htmlFor="work-minutes">Work Duration (minutes)</label>
                <input
                  id="work-minutes"
                  type="number"
                  min="1"
                  max="60"
                  value={pomodoroWorkMinutes}
                  onChange={(e) => setPomodoroWorkMinutes(parseInt(e.target.value) || 25)}
                  className="pomodoro-input"
                />
              </div>
              
              <div className="pomodoro-input-group">
                <label htmlFor="break-minutes">Break Duration (minutes)</label>
                <input
                  id="break-minutes"
                  type="number"
                  min="1"
                  max="30"
                  value={pomodoroBreakMinutes}
                  onChange={(e) => setPomodoroBreakMinutes(parseInt(e.target.value) || 5)}
                  className="pomodoro-input"
                />
              </div>
            </div>
          </div>
          <div className="modal-buttons">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Start Session</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StudySessionModal;