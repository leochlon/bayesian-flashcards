import React, { useState } from 'react';

const StudySessionModal = ({ onClose, onSubmit }) => {
  const [sessionName, setSessionName] = useState(`Session ${new Date().toLocaleString()}`);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedName = sessionName.trim() || `Session ${new Date().toLocaleString()}`;
    onSubmit(trimmedName);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content create-deck-modal" onClick={e => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <h2>New Study Session</h2>
          <input
            type="text"
            value={sessionName}
            onChange={(e) => setSessionName(e.target.value)}
            placeholder="Enter session name"
            className="deck-name-input"
            autoFocus
          />
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