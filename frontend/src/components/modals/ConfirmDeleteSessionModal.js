import React from 'react';

const ConfirmDeleteSessionModal = ({ onClose, onConfirm, sessionName, sessionDate }) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content delete-confirmation-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-form">
          <h2 className="modal-title">Delete Study Session</h2>
          <div className="modal-body">
            <p>
              Are you sure you want to delete the session:
              <span className="session-name-highlight"> {sessionName}</span>?
            </p>
            <p>Date: <span className="modal-date">{sessionDate}</span></p>
            <p className="warning-text modal-warning">
              This action cannot be undone and will remove all reviews from this session
              and recompute your learning progress.
            </p>
          </div>
          <div className="modal-buttons">
            <button 
              type="button" 
              onClick={onClose} 
              className="btn-secondary"
            >
              Cancel
            </button>
            <button 
              type="button" 
              onClick={onConfirm} 
              className="btn-danger"
            >
              Delete Session
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDeleteSessionModal;