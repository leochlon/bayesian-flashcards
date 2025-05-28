import React, { useState } from 'react';

const CreateDeckModal = ({ onClose, onSubmit }) => {
  const [deckName, setDeckName] = useState('');
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedName = deckName.trim();
    if (trimmedName) {
      const result = await onSubmit(trimmedName);
      if (result === false) {
        setError('Failed to create deck. The name may already exist or is invalid.');
      } else {
        onClose();
      }
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content create-deck-modal" onClick={e => e.stopPropagation()}>
        <form onSubmit={handleSubmit} className="modal-form">
          <h2 className="modal-title">Create New Deck</h2>
          <input
            type="text"
            value={deckName}
            onChange={(e) => { setDeckName(e.target.value); setError(null); }}
            placeholder="Enter deck name"
            className="deck-name-input modal-input"
            autoFocus
          />
          {error && <div className="error-message modal-error">{error}</div>}
          <div className="modal-buttons">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary" disabled={!deckName.trim()}>
              Create Deck
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateDeckModal;