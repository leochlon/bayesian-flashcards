import React from 'react';

const ConfirmEndSessionModal = ({ onClose, onConfirm, sessionName }) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content legacy-end-session-modal" onClick={e => e.stopPropagation()}>
        <h2 className="legacy-modal-title">End Current Session</h2>
        <div className="legacy-end-session-row">
          <span className="legacy-end-session-label">
            Are you sure you want to end the current session:
            <span className="legacy-session-name-highlight"> "{sessionName}"</span>?
          </span>
          <span className="legacy-end-session-info">
            This will save your progress and exit the study session. You can view your session statistics afterward.
          </span>
        </div>
        <div className="legacy-modal-buttons-row">
          <button 
            type="button" 
            onClick={onClose} 
            className="legacy-cancel-button"
          >
            Stay in Session
          </button>
          <button 
            type="button" 
            onClick={onConfirm} 
            className="legacy-end-button"
          >
            End Session
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmEndSessionModal;