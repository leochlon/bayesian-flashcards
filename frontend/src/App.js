import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './styles/base/app.css';

// Import hooks
import { useBackendStatus } from './hooks/useBackendStatus';
import { useAppData } from './hooks/useAppData';
import useShowDeleteDeckModal from './components/modals/useShowDeleteDeckModal';
import { API, DEFAULT_USER } from './api';

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
  ConfirmEndSessionModal
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

  // State for study/review functionality
  const [reviewCard, setReviewCard] = useState(null);
  const [showBack, setShowBack] = useState(false);
  const [rating, setRating] = useState(5);
  const [timer, setTimer] = useState(60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerInterval, setTimerInterval] = useState(null);

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

  // Cleanup timer when changing views
  useEffect(() => {
    if (view !== 'study') {
      stopTimer();
      resetTimer();
    }
  }, [view, stopTimer, resetTimer]);

  // Get next card for review
  const getNextCard = async () => {
    if (!currentDeck) return;
    
    try {
      const response = await axios.get(`${API}/next_card/${currentDeck}/${DEFAULT_USER}`);
      if (response.data && response.data.success) {
        setReviewCard(response.data.next_card);
        setShowBack(false);
        setRating(5);
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
      await axios.post(`${API}/review/${currentDeck}/${DEFAULT_USER}`, {
        id: reviewCard.id,
        rating: rating,
        session_id: currentSession.id
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
          />
        )}

        {view === 'stats' && (
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
          <SettingsView />
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
    </div>
  );
}

export default App;
