import '../styles/views/deck-view.css';
import React from 'react';

const HomeView = ({
  decks,
  currentSession,
  navigateTo,
  setShowStudySessionModal,
  setShowCreateDeckModal,
  setCurrentDeck,
  currentDeck,
  onDeleteDeck,
  deck
}) => {
  // Pick the first deck as default if none is selected
  const selectedDeck = currentDeck || (decks.length > 0 ? (typeof decks[0] === 'object' ? decks[0].name : decks[0]) : null);
  const selectedDeckObj = decks.find(d => (typeof d === 'object' ? d.name === selectedDeck : d === selectedDeck));
  const selectedDeckCards = selectedDeckObj && selectedDeckObj.cards ? selectedDeckObj.cards : [];
  
  // Use the deck prop for card details if available, otherwise use selected deck cards
  const deckCards = deck && deck.length ? deck : selectedDeckCards;

  return (
    <div className="deck-view">
      <div className="deck-header">
        <h2>Your Decks</h2>
        <button 
          className="study-button"
          onClick={() => {
            if (selectedDeck) {
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
            className={`deck-card ${selectedDeck === (typeof deck === 'object' ? deck.name : deck) ? 'selected' : ''}`}
            onClick={() => setCurrentDeck(typeof deck === 'object' ? deck.name : deck)}
          >
            <h3>{typeof deck === 'object' ? deck.name : deck}</h3>
            <p>{typeof deck === 'object' ? deck.card_count : (deckCards && deckCards.length ? deckCards.length : 0)} cards</p>
            <button 
              className="delete-deck-button"
              onClick={e => onDeleteDeck(typeof deck === 'object' ? deck.name : deck, e)}
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

      {/* Deck Details View - always visible if a deck is selected */}
      {selectedDeck && (
        <div className="deck-details legacy-deck-details">
          <div className="deck-details-header legacy-deck-details-header">
            <h3 className="legacy-deck-title">{selectedDeck}</h3>
            <div className="deck-actions-buttons legacy-deck-actions-buttons">
              <button 
                className="action-button study-action legacy-action-button"
                onClick={() => setShowStudySessionModal(true)}
              >
                Study
              </button>
              <button 
                className="action-button manage-action legacy-action-button"
                onClick={() => navigateTo('manage')}
              >
                Manage Cards
              </button>
              <button 
                className="action-button add-action legacy-action-button"
                onClick={() => navigateTo('add')}
              >
                Add Cards
              </button>
            </div>
          </div>
          <div className="deck-cards-preview legacy-deck-cards-preview">
            <h4 className="legacy-preview-title">Card Preview</h4>
            {deckCards.length === 0 ? (
              <div className="no-cards-preview legacy-no-cards-preview">
                <p>No cards in this deck yet. Click "Add Cards" to create your first card.</p>
              </div>
            ) : (
              <div className="cards-preview-grid legacy-cards-preview-grid">
                {deckCards.slice(0, 3).map(card => (
                  <div key={card.id} className="card-preview-item legacy-card-preview-item">
                    <div className="preview-card-front legacy-preview-card-front">
                      <h5>Front</h5>
                      <div className="preview-card-content legacy-preview-card-content">
                        <div dangerouslySetInnerHTML={{ __html: card.front }} />
                        {card.frontImage && (
                          <img src={card.frontImage} alt="Front" className="preview-card-image legacy-preview-card-image" />
                        )}
                      </div>
                    </div>
                    <div className="preview-card-back legacy-preview-card-back">
                      <h5>Back</h5>
                      <div className="preview-card-content legacy-preview-card-content">
                        <div dangerouslySetInnerHTML={{ __html: card.back }} />
                        {card.backImage && (
                          <img src={card.backImage} alt="Back" className="preview-card-image legacy-preview-card-image" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {deckCards.length > 3 && (
                  <div className="more-cards-indicator legacy-more-cards-indicator">
                    <p>+ {deckCards.length - 3} more cards</p>
                    <button 
                      className="view-all-button legacy-view-all-button"
                      onClick={() => navigateTo('manage')}
                    >
                      View All
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Study status */}
      {currentSession && (
        <div className="current-study-status">
          <h3>Current Study Session</h3>
          <div className="session-info">
            <p>Session: {currentSession.name}</p>
            <p>Started: {new Date(currentSession.start_time).toLocaleString()}</p>
            <button 
              className="resume-session-button"
              onClick={() => navigateTo('study')}
            >
              Resume Session
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomeView;