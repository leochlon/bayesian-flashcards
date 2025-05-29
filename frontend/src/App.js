import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

// Import hooks
import { useBackendStatus } from './hooks/useBackendStatus';
import { useAppData } from './hooks/useAppData';
import useShowDeleteDeckModal from './components/modals/useShowDeleteDeckModal';
import { API, DEFAULT_USER, fetchUserSettings } from './api';

// Import all components
import {
  // Individual components
  StatsView,
  HomeView,
  LoadingScreen,
  NavigationHeader,
  
  // Component modules
  StudyView,
  AddCardView,
  ManageView,
  SettingsView,
  
  // Modal components
  CreateDeckModal,
  StudySessionModal,
  ConfirmDeleteModal,
  ConfirmDeleteSessionModal,
  ConfirmEndSessionModal,
  StatsModal
} from './components';

function App() {
  // State for UI navigation
  const [view, setView] = useState('decks');
  const [manageTab, setManageTab] = useState('cards');
  const [statsType, setStatsType] = useState('user');
  
  // State for modals
  const [showCreateDeckModal, setShowCreateDeckModal] = useState(false);
  const { showDeleteDeckModal, setShowDeleteDeckModal } = useShowDeleteDeckModal();
  const [showStudySessionModal, setShowStudySessionModal] = useState(false);
  const [showDeleteSessionModal, setShowDeleteSessionModal] = useState(false);
  const [showEndSessionModal, setShowEndSessionModal] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState(null);
  const [editingCard, setEditingCard] = useState(null);
  const [cardToDelete, setCardToDelete] = useState(null);
  const [deckToDelete, setDeckToDelete] = useState(null);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  // Stats modal state
  const [showStatsModal, setShowStatsModal] = useState(false);

  // Global stats refresh trigger
  const [statsRefreshTrigger, setStatsRefreshTrigger] = useState(0);

  // State for study/review functionality
  const [reviewCard, setReviewCard] = useState(null);
  const [showBack, setShowBack] = useState(false);
  const [rating, setRating] = useState(3);
  const [timer, setTimer] = useState(60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerInterval, setTimerInterval] = useState(null);
  
  // Pomodoro timer state for easy mode
  const [pomodoroTimer, setPomodoroTimer] = useState(25 * 60); // 25 minutes in seconds
  const [isPomodoroRunning, setIsPomodoroRunning] = useState(false);
  const [pomodoroInterval, setPomodoroInterval] = useState(null);
  const [isBreakTime, setIsBreakTime] = useState(false);
  const [breakTimer, setBreakTimer] = useState(5 * 60); // 5 minutes break

  // Custom hooks
  const { isBackendReady, backendError, checkBackendStatus } = useBackendStatus();
  const {
    decks,
    currentDeck,
    setCurrentDeck,
    deck,
    setDeck, // <-- add this line
    sessions,
    currentSession,
    selectedSession,
    setSelectedSession,
    easyMode,
    loadSessions,
    createDeck,
    deleteDeck,
    deleteCard,
    startStudySession,
    deleteSession,
    endStudySession,
    handleEasyModeToggle
  } = useAppData();

  // Timer functions
  const stopTimer = useCallback(() => {
    if (timerInterval) {
      clearInterval(timerInterval);
      setTimerInterval(null);
    }
    setIsTimerRunning(false);
  }, [timerInterval]);

  const resetTimer = useCallback(() => {
    stopTimer();
    setTimer(60);
  }, [stopTimer]);

  const startTimer = () => {
    if (!isTimerRunning) {
      setIsTimerRunning(true);
      const interval = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setIsTimerRunning(false);
            return 60;
          }
          return prev - 1;
        });
      }, 1000);
      setTimerInterval(interval);
    }
  };

  // Pomodoro timer functions for easy mode
  const stopPomodoroTimer = useCallback(() => {
    if (pomodoroInterval) {
      clearInterval(pomodoroInterval);
      setPomodoroInterval(null);
    }
    setIsPomodoroRunning(false);
  }, [pomodoroInterval]);

  const resetPomodoroTimer = useCallback(() => {
    stopPomodoroTimer();
    setPomodoroTimer(25 * 60);
    setIsBreakTime(false);
    setBreakTimer(5 * 60);
  }, [stopPomodoroTimer]);

  const startPomodoroTimer = () => {
    if (!isPomodoroRunning) {
      setIsPomodoroRunning(true);
      const interval = setInterval(() => {
        if (isBreakTime) {
          setBreakTimer((prev) => {
            if (prev <= 1) {
              clearInterval(interval);
              setIsPomodoroRunning(false);
              setIsBreakTime(false);
              setPomodoroTimer(25 * 60);
              return 5 * 60;
            }
            return prev - 1;
          });
        } else {
          setPomodoroTimer((prev) => {
            if (prev <= 1) {
              // Start break time
              setIsBreakTime(true);
              setBreakTimer(5 * 60);
              return 0;
            }
            return prev - 1;
          });
        }
      }, 1000);
      setPomodoroInterval(interval);
    }
  };

  const skipBreak = () => {
    setIsBreakTime(false);
    setPomodoroTimer(25 * 60);
    setBreakTimer(5 * 60);
  };

  // Cleanup timers when changing views
  useEffect(() => {
    if (view !== 'study') {
      stopTimer();
      resetTimer();
      stopPomodoroTimer();
      resetPomodoroTimer();
    } else if (view === 'study') {
      // Auto-start pomodoro timer when entering study mode
      if (!isPomodoroRunning) {
        startPomodoroTimer();
      }
    }
  }, [view, stopTimer, resetTimer, stopPomodoroTimer, resetPomodoroTimer, isPomodoroRunning, startPomodoroTimer]);

  // Get next card for review
  const getNextCard = async () => {
    if (!currentDeck) return;
    try {
      // Fetch latest user settings
      const userSettings = await fetchUserSettings();
      const maxReviewsPerCard = userSettings.max_reviews_per_card || 2;
      const response = await axios.get(
        `${API}/next_card/${encodeURIComponent(currentDeck)}/${DEFAULT_USER}` +
        `?max_reviews_per_card=${maxReviewsPerCard}`
      );
      if (response.data && response.data.success) {
        setReviewCard(response.data.next_card);
        setShowBack(false);
        setRating(3);
      } else {
        alert("No more cards to review!");
        setView('decks');
      }
    } catch (error) {
      console.error("Error getting next card:", error);
      alert("Failed to get next card. Please try again.");
      setView('decks');
    }
  };

  // Handle card review submission
  const handleReview = async () => {
    if (!reviewCard || !currentSession) return;
    try {
      // Fetch latest user settings
      const userSettings = await fetchUserSettings();
      const maxReviewsPerCard = userSettings.max_reviews_per_card || 2;
      await axios.post(`${API}/review/${encodeURIComponent(currentDeck)}/${DEFAULT_USER}`, {
        id: reviewCard.id,
        rating: rating,
        session_id: currentSession.id,
        max_reviews_per_card: maxReviewsPerCard,
        easy_mode: easyMode
      });
      // Get next card
      await getNextCard();
      // Restart timer for next card
      resetTimer();
      startTimer();
    } catch (error) {
      console.error("Error submitting review:", error);
      alert("Failed to submit review. Please try again.");
    }
  };

  // Reset stats type when view changes to stats, but only on initial navigation
  useEffect(() => {
    if (view === 'stats') {
      console.log('Stats view mounted - not resetting stats type to preserve user selection');
    }
  }, [view]);

  // Handle navigation with session confirmation
  const navigateTo = (newView) => {
    // Clear editing card state when navigating away from add view
    if (view === 'add' && newView !== 'add') {
      setEditingCard(null);
    }
    
    if (currentSession && newView !== 'study') {
      setShowEndSessionModal(true);
    } else {
      setView(newView);
    }
  };

  // Handle deck creation
  const handleCreateDeck = async (deckName) => {
    const success = await createDeck(deckName);
    if (success) {
      setShowCreateDeckModal(false);
      setView('manage');
    }
  };

  // Handle deck deletion
  const handleDeleteDeck = async () => {
    const success = await deleteDeck();
    if (success) {
      setShowDeleteDeckModal(false);
    }
  };

  // Handle card deletion
  const handleDeleteCard = async () => {
    const success = await deleteCard(cardToDelete);
    if (success) {
      setCardToDelete(null);
    }
  };

  // Handle study session start
  const handleStartStudySession = async (sessionName) => {
    const session = await startStudySession(sessionName);
    if (session) {
      setShowStudySessionModal(false);
      setView('study');
      resetTimer();
      await getNextCard();
      startTimer();
    }
  };

  // Handle session deletion
  const handleDeleteSession = async () => {
    const success = await deleteSession(sessionToDelete);
    if (success) {
      setShowDeleteSessionModal(false);
      setSessionToDelete(null);
    }
  };

  // Handle study session end
  const handleEndStudySession = async () => {
    const success = await endStudySession();
    if (success) {
      setShowEndSessionModal(false);
      setView('stats');
    }
  };

  // Cancel ending the current session
  const cancelEndSession = () => {
    setShowEndSessionModal(false);
  };

  // Function to handle edit card setup
  const handleEditCardSetup = (card) => {
    setEditingCard(card);
    setView('add');
  };

  // Handle delete deck button (opens modal)
  const onDeleteDeck = (deckName, event) => {
    event.stopPropagation();
    setDeckToDelete(deckName);
    setShowDeleteConfirmModal(true);
  };

  // Confirm delete deck (API call)
  const confirmDeleteDeck = async () => {
    try {
      await deleteDeck(deckToDelete);
      // Optionally reload decks here if needed
      if (currentDeck === deckToDelete) {
        setCurrentDeck(null);
      }
      setShowDeleteConfirmModal(false);
      setDeckToDelete(null);
    } catch (error) {
      // Optionally show error
      setShowDeleteConfirmModal(false);
      setDeckToDelete(null);
    }
  };

  // If backend is not ready, show a loading screen
  if (!isBackendReady) {
    return (
      <LoadingScreen 
        backendError={backendError}
        checkBackendStatus={checkBackendStatus}
      />
    );
  }

  return (
    <div className="app-container">
      <NavigationHeader 
        view={view}
        navigateTo={navigateTo}
        currentSession={currentSession}
        timer={timer}
        isTimerRunning={isTimerRunning}
        startTimer={startTimer}
        stopTimer={stopTimer}
        resetTimer={resetTimer}
        easyMode={easyMode}
        pomodoroTimer={pomodoroTimer}
        isPomodoroRunning={isPomodoroRunning}
        startPomodoroTimer={startPomodoroTimer}
        stopPomodoroTimer={stopPomodoroTimer}
        resetPomodoroTimer={resetPomodoroTimer}
        isBreakTime={isBreakTime}
        breakTimer={breakTimer}
        skipBreak={skipBreak}
      />

      <main className="app-content">
        {(view === 'home' || view === 'decks') && (
          <HomeView 
            decks={decks}
            currentSession={currentSession}
            navigateTo={navigateTo}
            setShowStudySessionModal={setShowStudySessionModal}
            setShowCreateDeckModal={setShowCreateDeckModal}
            setCurrentDeck={setCurrentDeck}
            currentDeck={currentDeck}
            onDeleteDeck={onDeleteDeck}
            deck={deck}
            setShowStatsModal={setShowStatsModal} // pass to HomeView
          />
        )}

        {view === 'stats' && !showStatsModal && (
          <StatsView 
            statsType={statsType}
            setStatsType={setStatsType}
            currentDeck={currentDeck}
            setCurrentDeck={setCurrentDeck}
            decks={decks}
            selectedSession={selectedSession}
            setSelectedSession={setSelectedSession}
            sessions={sessions}
            loadSessions={loadSessions}
            statsRefreshTrigger={statsRefreshTrigger}
          />
        )}
        
        {view === 'study' && (
          <StudyView
            currentDeck={currentDeck}
            currentSession={currentSession}
            reviewCard={reviewCard}
            showBack={showBack}
            setShowBack={setShowBack}
            rating={rating}
            setRating={setRating}
            timer={timer}
            isTimerRunning={isTimerRunning}
            stopTimer={stopTimer}
            easyMode={easyMode}
            handleEasyModeToggle={handleEasyModeToggle}
            endStudySession={handleEndStudySession}
            handleReview={handleReview}
            navigateTo={navigateTo}
          />
        )}
        
        {view === 'add' && (
          <AddCardView
            currentDeck={currentDeck}
            setCurrentDeck={setCurrentDeck}
            decks={decks}
            navigateTo={navigateTo}
            editingCard={editingCard}
          />
        )}
        
        {view === 'manage' && (
          <ManageView
            currentDeck={currentDeck}
            setCurrentDeck={setCurrentDeck}
            decks={decks}
            sessions={sessions}
            loadSessions={loadSessions}
            setSelectedSession={setSelectedSession}
            setStatsType={setStatsType}
            navigateTo={navigateTo}
            handleEditCardSetup={handleEditCardSetup}
            handleDeleteSession={handleDeleteSession}
            deck={deck}
            setDeck={setDeck} // <-- pass setDeck
            manageTab={manageTab}
            setManageTab={setManageTab}
            setSessionToDelete={setSessionToDelete}
            setShowDeleteSessionModal={setShowDeleteSessionModal}
          />
        )}
        
        {view === 'settings' && (
          <div className="settings-viewport-wrapper">
            <SettingsView 
              onSettingsSaved={async () => {
                // After saving, reload user settings to ensure all parameters are up to date
                const updatedSettings = await fetchUserSettings();
                // Optionally, update any global state or context here if needed
                // For now, just log for debug
                console.log('Settings reloaded after save:', updatedSettings);
                setStatsRefreshTrigger(prev => prev + 1);
              }}
            />
          </div>
        )}
      </main>

      {/* Modals */}
      {showCreateDeckModal && (
        <CreateDeckModal 
          onClose={() => setShowCreateDeckModal(false)} 
          onSubmit={handleCreateDeck} 
        />
      )}

      {showStudySessionModal && (
        <StudySessionModal 
          onClose={() => setShowStudySessionModal(false)} 
          onSubmit={handleStartStudySession} 
        />
      )}

      {showDeleteDeckModal && (
        <ConfirmDeleteModal 
          onClose={() => setShowDeleteDeckModal(false)} 
          onConfirm={handleDeleteDeck} 
          deckName={currentDeck} 
        />
      )}

      {cardToDelete && (
        <ConfirmDeleteModal 
          onClose={() => setCardToDelete(null)} 
          onConfirm={handleDeleteCard} 
          deckName={`Card #${cardToDelete}`} 
        />
      )}

      {showDeleteSessionModal && sessionToDelete && (
        <ConfirmDeleteSessionModal 
          onClose={() => setShowDeleteSessionModal(false)} 
          onConfirm={handleDeleteSession} 
          sessionName={sessions.find(s => s.id === sessionToDelete)?.name || 'Unknown Session'} 
          sessionDate={(() => {
            const session = sessions.find(s => s.id === sessionToDelete);
            return session?.start_time ? 
              new Date(session.start_time).toLocaleString() : 
              'Unknown';
          })()} 
        />
      )}

      {showEndSessionModal && currentSession && (
        <ConfirmEndSessionModal 
          onClose={cancelEndSession} 
          onConfirm={handleEndStudySession} 
          sessionName={currentSession.name} 
        />
      )}

      {showDeleteConfirmModal && deckToDelete && (
        <ConfirmDeleteModal
          onClose={() => {
            setShowDeleteConfirmModal(false);
            setDeckToDelete(null);
          }}
          onConfirm={confirmDeleteDeck}
          deckName={deckToDelete}
        />
      )}

      {showStatsModal && (
        <StatsModal onClose={() => setShowStatsModal(false)}>
          {/* Card preview and deck actions panel */}
          {view === 'decks' && currentDeck && (
            <div className="deck-details">
              <div className="deck-details-header">
                <h3>{currentDeck}</h3>
                <div className="deck-actions-buttons">
                  <button 
                    className="action-button study-action"
                    onClick={() => {
                      setShowStatsModal(false);
                      setShowStudySessionModal(true);
                    }}
                  >
                    Study
                  </button>
                  <button 
                    className="action-button manage-action"
                    onClick={() => {
                      setShowStatsModal(false);
                      setManageTab('cards');
                      setView('manage');
                    }}
                  >
                    Manage Cards
                  </button>
                  <button 
                    className="action-button add-action"
                    onClick={() => {
                      setShowStatsModal(false);
                      setEditingCard(null);
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
                            setShowStatsModal(false);
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
        </StatsModal>
      )}
    </div>
  );
}

export default App;
