import '../styles/views/deck-view.css';
import React from 'react';

const DeckView = ({ 
  decks, 
  currentDeck, 
  setCurrentDeck, 
  deck, 
  setShowStudySessionModal, 
  setShowCreateDeckModal, 
  handleDeleteDeck, 
  setManageTab, 
  setView, 
  setEditingCard,
  setFront,
  setBack,
  setFrontImage,
  setBackImage,
  setCardType,
  setShowStatsModal
}) => {
  return (
    <div className="deck-view">
      <div className="deck-header">
        <h2>Your Decks</h2>
        <button 
          className="study-button"
          onClick={() => {
            if (currentDeck) {
              setShowStudySessionModal(true);
            } else {
              alert("Please select a deck first");
            }
          }}
        >
          Study
        </button>
      </div>
      <div className="deck-grid">
        {decks.map(deck => (
          <div 
            key={typeof deck === 'object' ? deck.name : deck}
            className={`deck-card ${currentDeck === (typeof deck === 'object' ? deck.name : deck) ? 'selected' : ''}`}
            onClick={() => {
              setCurrentDeck(typeof deck === 'object' ? deck.name : deck);
              setShowStatsModal(true);
            }}
          >
            <h3>{typeof deck === 'object' ? deck.name : deck}</h3>
            <p>{typeof deck === 'object' ? deck.card_count : (deck.length || 0)} cards</p>
            <button 
              className="delete-deck-button"
              onClick={(e) => {
                e.stopPropagation(); // Prevent deck click
                handleDeleteDeck(typeof deck === 'object' ? deck.name : deck, e);
              }}
            >
              🗑️
            </button>
          </div>
        ))}
        <div 
          className="deck-card new-deck"
          onClick={() => setShowCreateDeckModal(true)}
        >
          <h3>+ Create New Deck</h3>
        </div>
      </div>
    </div>
  );
};

export default DeckView;
