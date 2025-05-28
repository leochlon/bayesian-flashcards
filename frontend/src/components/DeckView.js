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
  setCardType
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
            onClick={() => setCurrentDeck(typeof deck === 'object' ? deck.name : deck)}
          >
            <h3>{typeof deck === 'object' ? deck.name : deck}</h3>
            <p>{typeof deck === 'object' ? deck.card_count : (deck.length || 0)} cards</p>
            <button 
              className="delete-deck-button"
              onClick={(e) => handleDeleteDeck(typeof deck === 'object' ? deck.name : deck, e)}
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
      
      {/* Deck Details View - appears when a deck is selected */}
      {currentDeck && (
        <div className="deck-details">
          <div className="deck-details-header">
            <h3>{currentDeck}</h3>
            <div className="deck-actions-buttons">
              <button 
                className="action-button study-action"
                onClick={() => setShowStudySessionModal(true)}
              >
                Study
              </button>
              <button 
                className="action-button manage-action"
                onClick={() => {
                  setManageTab('cards');
                  setView('manage');
                }}
              >
                Manage Cards
              </button>
              <button 
                className="action-button add-action"
                onClick={() => {
                  setEditingCard(null);
                  setFront("");
                  setBack("");
                  setFrontImage(null);
                  setBackImage(null);
                  setCardType("Basic");
                  setView('add');
                }}
              >
                Add Cards
              </button>
            </div>
          </div>
          
          <div className="deck-cards-preview">
            <h4>Card Preview</h4>
            {deck.length === 0 ? (
              <div className="no-cards-preview">
                <p>No cards in this deck yet. Click "Add Cards" to create your first card.</p>
              </div>
            ) : (
              <div className="cards-preview-grid">
                {deck.slice(0, 3).map(card => (
                  <div key={card.id} className="card-preview-item">
                    <div className="preview-card-front">
                      <h5>Front</h5>
                      <div className="preview-card-content">
                        <div dangerouslySetInnerHTML={{ __html: card.front }} />
                        {card.frontImage && (
                          <img src={card.frontImage} alt="Front" className="preview-card-image" />
                        )}
                      </div>
                    </div>
                    <div className="preview-card-back">
                      <h5>Back</h5>
                      <div className="preview-card-content">
                        <div dangerouslySetInnerHTML={{ __html: card.back }} />
                        {card.backImage && (
                          <img src={card.backImage} alt="Back" className="preview-card-image" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {deck.length > 3 && (
                  <div className="more-cards-indicator">
                    <p>+ {deck.length - 3} more cards</p>
                    <button 
                      className="view-all-button"
                      onClick={() => {
                        setManageTab('cards');
                        setView('manage');
                      }}
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
    </div>
  );
};

export default DeckView;
