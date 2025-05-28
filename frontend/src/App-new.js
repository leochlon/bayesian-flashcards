import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import './App.css';

// Component imports
import { CreateDeckModal, StudySessionModal, ConfirmDeleteModal, ConfirmDeleteSessionModal, ConfirmEndSessionModal } from './components/modals';
import StudyView from './components/study/StudyView';
import ManageView from './components/manage/ManageView';
import AddCardView from './components/add/AddCardView';
import StatsView from './components/StatsView';
import SettingsView from './components/settings/SettingsView';
import ImageDropZone from './components/ImageDropZone';

const { invoke } = window.__TAURI__ ? window.__TAURI__.tauri : { invoke: () => Promise.resolve() };

// API configuration
const getApiBase = () => {
  if (window.__TAURI__) {
    return "http://127.0.0.1:5002";
  } else {
    return "http://localhost:5002";
  }
};

const API_BASE = getApiBase();
const API = `${API_BASE}/api`;
const DEFAULT_USER = "default";

// Debug logging
console.log('App.js: API_BASE =', API_BASE);
console.log('App.js: API =', API);
console.log('App.js: DEFAULT_USER =', DEFAULT_USER);

function App() {
  // Core state
  const [decks, setDecks] = useState([]);
  const [currentDeck, setCurrentDeck] = useState(null);
  const [view, setView] = useState('decks');
  const [deck, setDeck] = useState([]);
  
  // Card editing state
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [frontImage, setFrontImage] = useState(null);
  const [backImage, setBackImage] = useState(null);
  const [cardType, setCardType] = useState("Basic");
  const [editingCard, setEditingCard] = useState(null);
  
  // Review state
  const [reviewCard, setReviewCard] = useState(null);
  const [showBack, setShowBack] = useState(false);
  const [rating, setRating] = useState(10);
  
  // Modal state
  const [showCreateDeckModal, setShowCreateDeckModal] = useState(false);
  const [showStudySessionModal, setShowStudySessionModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [deckToDelete, setDeckToDelete] = useState(null);
  const [showDeleteSessionModal, setShowDeleteSessionModal] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState(null);
  const [showEndSessionModal, setShowEndSessionModal] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState(null);
  
  // Session state
  const [isStartingSession, setIsStartingSession] = useState(false);
  const [timer, setTimer] = useState(60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerInterval, setTimerInterval] = useState(null);
  const [currentSession, setCurrentSession] = useState(null);
  const [sessions, setSessions] = useState([]);
  
  // Stats state
  const [statsType, setStatsType] = useState('user');
  const [selectedSession, setSelectedSession] = useState(null);
  
  // UI state
  const [manageTab, setManageTab] = useState('cards');
  const [easyMode, setEasyMode] = useState(false);
  
  // Backend status
  const [isBackendReady, setIsBackendReady] = useState(false);
  const [backendError, setBackendError] = useState(null);

  // Backend status check
  const checkBackendStatus = useCallback(async () => {
    try {
      console.log(`Checking backend status at ${API}/health`);
      const response = await axios.get(`${API}/health`, {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status === 200) {
        console.log('Backend is ready');
        setIsBackendReady(true);
        setBackendError(null);
      }
    } catch (error) {
      console.error('Backend health check failed:', error);
      setIsBackendReady(false);
      if (error.code === 'ECONNREFUSED' || error.code === 'NETWORK_ERR') {
        setBackendError('Cannot connect to backend server. Please make sure the backend is running.');
      } else if (error.code === 'ENOTFOUND') {
        setBackendError('Backend server not found. Please check the server address.');
      } else {
        setBackendError(`Backend error: ${error.message || 'Unknown error'}`);
      }
    }
  }, []);

  // Check backend status on load
  useEffect(() => {
    checkBackendStatus();
    const intervalId = setInterval(checkBackendStatus, 30000);
    return () => clearInterval(intervalId);
  }, [checkBackendStatus]);

  // Load decks
  useEffect(() => {
    if (isBackendReady) {
      axios.get(`${API}/decks`)
        .then(res => setDecks(res.data))
        .catch(error => console.error("Error loading decks:", error));
    }
  }, [isBackendReady]);

  // Load deck cards when deck changes
  useEffect(() => {
    if (currentDeck && isBackendReady) {
      axios.get(`${API}/cards/${currentDeck}`).then(res => setDeck(res.data));
    }
  }, [currentDeck, isBackendReady]);

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
    if (view !== 'review') {
      stopTimer();
      resetTimer();
    }
  }, [view, stopTimer, resetTimer]);

  // Navigation with session confirmation
  const handleNavigation = (targetView) => {
    if (currentSession && view === 'review' && targetView !== 'review' && !isStartingSession) {
      setPendingNavigation(targetView);
      setShowEndSessionModal(true);
    } else {
      setView(targetView);
    }
  };

  // If backend is not ready, show loading screen
  if (!isBackendReady) {
    return (
      <div className="app-container loading-container">
        <h1>Bayesian Flashcards</h1>
        <div className="loading-message">
          <h2>Connecting to Backend...</h2>
          <div className="spinner"></div>
          {backendError && (
            <div className="error-message">
              <p>Error: {backendError}</p>
              <p>Make sure the backend server is running at {API_BASE}</p>
              <button onClick={checkBackendStatus}>Retry Connection</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Navigation bar component
  const NavigationBar = () => (
    <div className="nav-bar">
      <button className={`nav-button ${view === 'decks' ? 'active' : ''}`} onClick={() => handleNavigation('decks')}>Decks</button>
      <button className={`nav-button ${view === 'add' ? 'active' : ''}`} onClick={() => handleNavigation('add')}>Add</button>
      <button className={`nav-button ${view === 'manage' ? 'active' : ''}`} onClick={() => handleNavigation('manage')}>Manage</button>
      <button className={`nav-button ${view === 'stats' ? 'active' : ''}`} onClick={() => handleNavigation('stats')}>Stats</button>
      <button className={`nav-button ${view === 'settings' ? 'active' : ''}`} onClick={() => handleNavigation('settings')}>Settings</button>
      {view === 'review' && (
        <div className="timer-container">
          <span className="timer-display">{Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}</span>
          <button className="timer-button" onClick={isTimerRunning ? stopTimer : startTimer}>
            {isTimerRunning ? '⏸' : '▶'}
          </button>
          <button className="timer-button" onClick={resetTimer}>↺</button>
        </div>
      )}
    </div>
  );

  // Footer component
  const FooterMasthead = () => (
    <div className="footer-masthead">
      <div className="app-name">Bayesian Flashcards</div>
      <div className="author">by Leon Chlon</div>
    </div>
  );

  return (
    <div className="app-container">
      <NavigationBar />
      
      {view === 'decks' && (
        <div>Deck View - TODO: Extract to component</div>
      )}
      
      {view === 'add' && (
        <AddCardView 
          currentDeck={currentDeck}
          setCurrentDeck={setCurrentDeck}
          decks={decks}
          front={front}
          setFront={setFront}
          back={back}
          setBack={setBack}
          frontImage={frontImage}
          setFrontImage={setFrontImage}
          backImage={backImage}
          setBackImage={setBackImage}
          cardType={cardType}
          setCardType={setCardType}
          editingCard={editingCard}
          setEditingCard={setEditingCard}
          setView={setView}
          setDeck={setDeck}
        />
      )}
      
      {view === 'manage' && (
        <ManageView 
          currentDeck={currentDeck}
          setCurrentDeck={setCurrentDeck}
          decks={decks}
          deck={deck}
          setDeck={setDeck}
          manageTab={manageTab}
          setManageTab={setManageTab}
          sessions={sessions}
          setSessions={setSessions}
          setEditingCard={setEditingCard}
          setFront={setFront}
          setBack={setBack}
          setFrontImage={setFrontImage}
          setBackImage={setBackImage}
          setCardType={setCardType}
          setView={setView}
          selectedSession={selectedSession}
          setSelectedSession={setSelectedSession}
          setStatsType={setStatsType}
          setShowDeleteSessionModal={setShowDeleteSessionModal}
          setSessionToDelete={setSessionToDelete}
        />
      )}
      
      {view === 'review' && (
        <StudyView 
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
          setEasyMode={setEasyMode}
          setShowEndSessionModal={setShowEndSessionModal}
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
          setSessions={setSessions}
        />
      )}
      
      {view === 'settings' && (
        <SettingsView />
      )}

      {/* Modals */}
      {showCreateDeckModal && (
        <CreateDeckModal
          onClose={() => setShowCreateDeckModal(false)}
          onSubmit={(name) => {
            // TODO: Extract deck creation logic
            setShowCreateDeckModal(false);
          }}
        />
      )}

      {showStudySessionModal && (
        <StudySessionModal
          onClose={() => setShowStudySessionModal(false)}
          onSubmit={(name) => {
            // TODO: Extract session creation logic
            setShowStudySessionModal(false);
          }}
        />
      )}

      {showDeleteConfirmModal && deckToDelete && (
        <ConfirmDeleteModal
          onClose={() => {
            setShowDeleteConfirmModal(false);
            setDeckToDelete(null);
          }}
          onConfirm={() => {
            // TODO: Extract deck deletion logic
            setShowDeleteConfirmModal(false);
            setDeckToDelete(null);
          }}
          deckName={deckToDelete}
        />
      )}

      {showDeleteSessionModal && sessionToDelete && (
        <ConfirmDeleteSessionModal
          onClose={() => {
            setShowDeleteSessionModal(false);
            setSessionToDelete(null);
          }}
          onConfirm={() => {
            // TODO: Extract session deletion logic
            setShowDeleteSessionModal(false);
            setSessionToDelete(null);
          }}
          sessionName={sessionToDelete.name}
          sessionDate={new Date(sessionToDelete.start_time).toLocaleDateString()}
        />
      )}

      {showEndSessionModal && currentSession && (
        <ConfirmEndSessionModal
          onClose={() => {
            setShowEndSessionModal(false);
            setPendingNavigation(null);
          }}
          onConfirm={() => {
            // TODO: Extract session end logic
            setShowEndSessionModal(false);
          }}
          sessionName={currentSession.name}
        />
      )}

      <FooterMasthead />
    </div>
  );
}

export default App;
