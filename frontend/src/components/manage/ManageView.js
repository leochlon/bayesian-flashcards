import React, { useState } from 'react';
import axios from 'axios';

// Import config
import { API } from '../../api';
import ConfirmDeleteModal from '../modals/ConfirmDeleteModal';

const ManageView = ({
  currentDeck,
  setCurrentDeck,
  decks,
  sessions,
  loadSessions,
  setSelectedSession,
  setStatsType,
  navigateTo,
  handleEditCardSetup,
  handleDeleteSession,
  deck,
  manageTab = 'cards',
  setManageTab,
  setSessionToDelete,
  setShowDeleteSessionModal
}) => {
  const [cardToDelete, setCardToDelete] = useState(null);

  // Handle card deletion
  const handleDeleteCard = (cardId) => {
    if (!currentDeck) return;
    setCardToDelete(cardId);
  };

  return (
    <div className="manage-view modular-manage-view">
      <div className="manage-header modular-manage-header">
        <h2 className="manage-title modular-manage-title">Manage Your Flashcards</h2>
        <div className="manage-tabs modular-manage-tabs">
          <button 
            className={`manage-tab modular-manage-tab ${manageTab === 'cards' ? 'active' : ''}`} 
            onClick={() => setManageTab('cards')}
          >
            Cards
          </button>
          <button 
            className={`manage-tab modular-manage-tab ${manageTab === 'sessions' ? 'active' : ''}`} 
            onClick={() => setManageTab('sessions')}
          >
            Sessions
          </button>
        </div>
      </div>

      <div className="manage-content modular-manage-content">
        {manageTab === 'cards' ? (
          <>
            <div className="deck-actions modular-deck-actions">
              <select 
                value={currentDeck || ''} 
                onChange={(e) => setCurrentDeck(e.target.value)}
                className="deck-selector modular-deck-selector"
              >
                <option value="">Select a deck</option>
                {decks.map(deck => {
                  const deckName = typeof deck === 'object' ? deck.name : deck;
                  return (
                    <option key={deckName} value={deckName}>{deckName}</option>
                  );
                })}
              </select>
              <button onClick={() => navigateTo('add')} className="add-new-button modular-add-new-button">Add New Card</button>
            </div>

            {!currentDeck ? (
              <div className="no-cards-message modular-no-cards-message">
                <p>Please select a deck to manage its cards.</p>
              </div>
            ) : deck.length === 0 ? (
              <div className="no-cards-message modular-no-cards-message">
                <p>No cards in this deck yet. Click "Add New Card" to create your first card.</p>
              </div>
            ) : (
              <div className="cards-list modular-cards-list">
                {deck.map(card => (
                  <div key={card.id} className="card-item modular-card-item">
                    <div className="card-preview modular-card-preview">
                      <div className="card-preview-front modular-card-preview-front">
                        <h4>Front</h4>
                        <div className="preview-content modular-preview-content" dangerouslySetInnerHTML={{ __html: card.front }} />
                        {card.frontImage && <img src={card.frontImage} alt="Front" className="preview-image modular-preview-image" />}
                      </div>
                      <div className="card-preview-back modular-card-preview-back">
                        <h4>Back</h4>
                        <div className="preview-content modular-preview-content" dangerouslySetInnerHTML={{ __html: card.back }} />
                        {card.backImage && <img src={card.backImage} alt="Back" className="preview-image modular-preview-image" />}
                      </div>
                    </div>
                    <div className="card-actions modular-card-actions">
                      <button onClick={() => handleEditCardSetup(card)} className="edit-button modular-edit-button">Edit</button>
                      <button onClick={() => handleDeleteCard(card.id)} className="delete-button modular-delete-button">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="sessions-list modular-sessions-list">
            {sessions.length === 0 ? (
              <p>No study sessions found. Start a new session to begin.</p>
            ) : (
              <table className="sessions-table modular-sessions-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Deck</th>
                    <th>Date</th>
                    <th>Duration</th>
                    <th>Cards Studied</th>
                    <th>Success Rate</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map(session => (
                    <tr key={session.id}>
                      <td>{session.name}</td>
                      <td>{session.deck || 'Unknown'}</td>
                      <td>{new Date(session.start_time).toLocaleDateString()}</td>
                      <td>{Math.round(session.duration)} minutes</td>
                      <td>{session.cards_studied}</td>
                      <td>{Math.round(session.success_rate * 100)}%</td>
                      <td>
                        <span className={`session-status modular-session-status ${session.end_time ? 'completed' : 'active'}`}>
                          {session.end_time ? 'Completed' : 'Active'}
                        </span>
                      </td>
                      <td>
                        <button onClick={() => {
                          setSelectedSession(session.id);
                          setStatsType('session');
                          navigateTo('stats');
                        }} className="modular-view-stats-button">
                          View Stats
                        </button>
                        <button
                          onClick={() => {
                            setSelectedSession(session.id);
                            setSessionToDelete(session.id);
                            setShowDeleteSessionModal(true);
                          }}
                          className="delete-button modular-delete-button"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Add modal for card deletion confirmation */}
      {cardToDelete && (
        <ConfirmDeleteModal
          onClose={() => setCardToDelete(null)}
          onConfirm={async () => {
            try {
              await axios.delete(`${API}/cards/${currentDeck}/${cardToDelete}`);
              // Refresh the cards list
              const response = await axios.get(`${API}/cards/${currentDeck}`);
              deck = response.data;
              setCardToDelete(null);
              loadSessions && loadSessions();
            } catch (error) {
              console.error("Error deleting card:", error);
              alert("Failed to delete card. Please try again.");
            }
          }}
          deckName={`Card #${cardToDelete}`}
        />
      )}
    </div>
  );
};

export default ManageView;