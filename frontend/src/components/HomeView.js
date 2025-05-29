import '../styles/views/deck-view.css';
import React, { useState, useMemo } from 'react';
import DeckView from './DeckView'; // Import DeckView component

const HomeView = ({
  decks,
  currentSession,
  navigateTo,
  setShowStudySessionModal,
  setShowCreateDeckModal,
  setCurrentDeck,
  currentDeck,
  onDeleteDeck,
  deck,
  setShowStatsModal // <-- add this prop
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Filter decks based on search term
  const filteredDecks = useMemo(() => {
    if (!searchTerm.trim()) {
      return decks;
    }
    return decks.filter(deck => {
      const deckName = typeof deck === 'object' ? deck.name : deck;
      return deckName.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [decks, searchTerm]);

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
        <div className="search-container">
          <div className="search-input-wrapper">
            <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <input
              type="text"
              placeholder="Search decks..."
              className="search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button 
                className="clear-search"
                onClick={() => setSearchTerm('')}
              >
                ×
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="deck-grid three-column">
        {filteredDecks.map(deck => (
          <div 
            key={typeof deck === 'object' ? deck.name : deck}
            className={`deck-card ${selectedDeck === (typeof deck === 'object' ? deck.name : deck) ? 'selected' : ''}`}
            onClick={() => {
              setCurrentDeck(typeof deck === 'object' ? deck.name : deck);
              setShowStatsModal(true);
            }}
          >
            <h3>{typeof deck === 'object' ? deck.name : deck}</h3>
            <p>{typeof deck === 'object' ? deck.card_count : (deckCards && deckCards.length ? deckCards.length : 0)} cards</p>
            <button 
              className="delete-deck-button"
              onClick={e => {
                e.stopPropagation(); // Prevent deck click
                onDeleteDeck(typeof deck === 'object' ? deck.name : deck, e);
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