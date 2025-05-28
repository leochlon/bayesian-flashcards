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
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h2 style={{ textAlign: 'center', marginBottom: 20, color: '#fff', fontSize: 24, borderBottom: '1px solid #484848', paddingBottom: 15, width: '100%' }}>New Study Session</h2>
          <input
            type="text"
            value={sessionName}
            onChange={(e) => setSessionName(e.target.value)}
            placeholder="Enter session name"
            className="deck-name-input"
            autoFocus
            style={{ marginBottom: 20, maxWidth: 320, width: '100%', textAlign: 'center' }}
          />
          <div className="modal-buttons" style={{ display: 'flex', justifyContent: 'center', gap: 15, width: '100%' }}>
            <button type="button" onClick={onClose} className="cancel-button">Cancel</button>
            <button type="submit" className="create-button">Start Session</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StudySessionModal;