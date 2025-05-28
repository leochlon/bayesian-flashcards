import React from 'react';

const ConfirmDeleteModal = ({ onClose, onConfirm, deckName }) => {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content delete-confirmation-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-form">
          <h2 className="modal-title">Delete Confirmation</h2>
          <div className="modal-body">
            <p>
              Are you sure you want to delete <span className="item-name-highlight">{deckName}</span>?
            </p>
            <p className="warning-text modal-warning">
              This action cannot be undone and will permanently delete all associated content.
            </p>
          </div>
          <div className="modal-buttons-row">
            <button 
              type="button" 
              onClick={onClose} 
              className="modal-cancel-button"
            >
              Cancel
            </button>
            <button 
              type="button" 
              onClick={onConfirm} 
              className="modal-confirm-button modal-delete-button"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDeleteModal;