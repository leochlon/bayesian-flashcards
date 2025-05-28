import React from 'react';

const ConfirmEndSessionModal = ({ onClose, onConfirm, sessionName }) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content create-deck-modal" onClick={e => e.stopPropagation()}>
        <h2>End Current Session</h2>
        <div className="modal-body">
          <p>
            Are you sure you want to end the current session:
            <span className="session-name-highlight"> "{sessionName}"</span>?
          </p>
          <p>
            This will save your progress and exit the study session. You can view your session statistics afterward.
          </p>
        </div>
        <div className="modal-buttons">
          <button 
            type="button" 
            onClick={onClose} 
            className="btn-secondary"
          >
            Stay in Session
          </button>
          <button 
            type="button" 
            onClick={onConfirm} 
            className="btn-primary"
          >
            End Session
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmEndSessionModal;