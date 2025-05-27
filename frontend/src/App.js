import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import './App.css';

const { invoke } = window.__TAURI__ ? window.__TAURI__.tauri : { invoke: () => Promise.resolve() };

// Updated API configuration for better compatibility
const getApiBase = () => {
  if (window.__TAURI__) {
    // Running in Tauri - use localhost
    return "http://127.0.0.1:5002";
  } else {
    // Running in browser development
    return "http://localhost:5002";
  }
};

const API_BASE = getApiBase();
const API = `${API_BASE}/api`;
const DEFAULT_USER = "default";

// Add missing format definitions for ReactQuill
const formats = [
  'header', 'bold', 'italic', 'underline',
  'link', 'list', 'bullet'
];

// Add missing toolbar ID for ReactQuill
const toolbarId = 'toolbar-container';

// Add missing toolbar options
const toolbarOptions = [
  [{ 'header': [1, 2, false] }],
  ['bold', 'italic', 'underline'],
  ['link'],
  [{ 'list': 'ordered'}, { 'list': 'bullet' }]
];

// Simplified modal components
const CreateDeckModal = ({ onClose, onSubmit }) => {
  const [deckName, setDeckName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!deckName.trim()) return;
    setIsSubmitting(true);
    try {
      onSubmit(deckName.trim());
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content create-deck-modal" onClick={e => e.stopPropagation()}>
        <h2>Create New Deck</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={deckName}
            onChange={(e) => setDeckName(e.target.value)}
            placeholder="Enter deck name"
            className="deck-name-input"
            autoFocus
          />
          <div className="modal-buttons">
            <button type="button" onClick={onClose} className="cancel-button">Cancel</button>
            <button type="submit" className="create-button" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ZoomableImage = ({ src, alt, className }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  return (
    <>
      <div className="image-wrapper" onClick={() => setIsModalOpen(true)}>
        <img src={src} alt={alt} className={className} />
        <div className="zoom-icon">🔍</div>
      </div>
      
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <img src={src} alt={alt} className="fullsize-image" />
            <button className="modal-close" onClick={() => setIsModalOpen(false)}>×</button>
          </div>
        </div>
      )}
    </>
  );
};

const ImageDropZone = ({ onDrop, image, onRemove, side }) => {
  const [isDragActive, setIsDragActive] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => onDrop(reader.result);
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className={`image-drop-zone ${isDragActive ? 'drag-active' : ''}`}
         onDragOver={(e) => { e.preventDefault(); setIsDragActive(true); }}
         onDragLeave={() => setIsDragActive(false)}
         onDrop={handleDrop}>
      {image ? (
        <div className="image-preview-container">
          <img src={image} alt={`${side} preview`} className="image-preview" />
          <button className="remove-image" onClick={onRemove}>×</button>
        </div>
      ) : (
        <p>Drag and drop an image here</p>
      )}
    </div>
  );
};

const StudySessionModal = ({ onClose, onSubmit }) => {
  const [sessionName, setSessionName] = useState(`Session ${new Date().toLocaleString()}`);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    onSubmit(sessionName.trim() || `Session ${new Date().toLocaleString()}`);
  };
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content create-deck-modal" onClick={e => e.stopPropagation()}>
        <h2>New Study Session</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={sessionName}
            onChange={(e) => setSessionName(e.target.value)}
            placeholder="Enter session name"
            className="deck-name-input"
            autoFocus
          />
          <div className="modal-buttons">
            <button type="button" onClick={onClose} className="cancel-button">Cancel</button>
            <button type="submit" className="create-button">Start Session</button>
          </div>
        </form>
      </div>
    </div>
  );
};

function App() {
  const [decks, setDecks] = useState([]);
  const [currentDeck, setCurrentDeck] = useState(null);
  const [view, setView] = useState('decks');
  const [deck, setDeck] = useState([]);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [frontImage, setFrontImage] = useState(null);
  const [backImage, setBackImage] = useState(null);
  const [reviewCard, setReviewCard] = useState(null);
  const [showBack, setShowBack] = useState(false);
  const [rating, setRating] = useState(10);
  const [cardType, setCardType] = useState("Basic");
  const [editingCard, setEditingCard] = useState(null);
  const [showCreateDeckModal, setShowCreateDeckModal] = useState(false);
  const [showStudySessionModal, setShowStudySessionModal] = useState(false);
  const [timer, setTimer] = useState(60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerInterval, setTimerInterval] = useState(null);
  const [currentSession, setCurrentSession] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [statsType, setStatsType] = useState('user');
  const [selectedSession, setSelectedSession] = useState(null);
  const [manageTab, setManageTab] = useState('cards');

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, false] }],
      ['bold', 'italic', 'underline'],
      ['link'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }]
    ]
  };

  // Load decks
  useEffect(() => {
    axios.get(`${API}/decks`)
      .then(res => setDecks(res.data))
      .catch(error => console.error("Error loading decks:", error));
  }, []);

  // Load deck cards when deck changes
  useEffect(() => {
    if (currentDeck) {
      axios.get(`${API}/cards/${currentDeck}`).then(res => setDeck(res.data));
    }
  }, [currentDeck]);

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

  // Session management
  const startStudySession = async (sessionName) => {
    try {
      if (!currentDeck) {
        alert("Please select a deck before studying.");
        return;
      }
      
      const response = await axios.post(`${API}/sessions`, {
        deck: currentDeck,
        user: DEFAULT_USER,
        name: sessionName
      });
      
      if (response.data.success) {
        setCurrentSession(response.data.session);
        setView('review');
        resetTimer();
        await getNextCard();
        startTimer();
      } else {
        alert(`Failed to create study session: ${response.data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Error creating study session:", error);
      alert("Failed to create study session. Please try again.");
      setView('decks');
    }
  };
  
  const endStudySession = async () => {
    if (!currentSession) return;
    
    try {
      await axios.post(`${API}/sessions/${currentSession.id}/end`);
      setCurrentSession(null);
      setView('stats');
      loadSessions();
    } catch (error) {
      console.error("Error ending study session:", error);
    }
  };
  
  const loadSessions = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/sessions?user=${DEFAULT_USER}${currentDeck ? `&deck=${currentDeck}` : ''}`);
      setSessions(response.data);
    } catch (error) {
      console.error("Error loading sessions:", error);
    }
  }, [currentDeck]);
  
  useEffect(() => {
    loadSessions();
  }, [currentDeck, loadSessions]);

  // Navigation bar
  const NavigationBar = () => (
    <div className="nav-bar">
      <button className={`nav-button ${view === 'decks' ? 'active' : ''}`} onClick={() => setView('decks')}>Decks</button>
      <button className={`nav-button ${view === 'add' ? 'active' : ''}`} onClick={() => setView('add')}>Add</button>
      <button className={`nav-button ${view === 'manage' ? 'active' : ''}`} onClick={() => setView('manage')}>Manage</button>
      <button className={`nav-button ${view === 'stats' ? 'active' : ''}`} onClick={() => setView('stats')}>Stats</button>
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

  // Card operations
  const handleAddCard = async () => {
    if (!currentDeck) {
      alert("Please select a deck first");
      return;
    }
    await axios.post(`${API}/cards/${currentDeck}`, {
      front,
      back,
      frontImage,
      backImage,
      type: cardType
    });
    setFront("");
    setBack("");
    setFrontImage(null);
    setBackImage(null);
    axios.get(`${API}/cards/${currentDeck}`).then(res => setDeck(res.data));
  };

  const handleCreateDeck = async (name) => {
    try {
      console.log(`Creating deck: ${name}`);
      const response = await axios.post(`${API}/decks`, 
        { deck: name },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 15000  // Increased timeout
        }
      );
      
      console.log('Create deck response:', response.data);
      
      if (response.data.success) {
        const decksResponse = await axios.get(`${API}/decks`);
        setDecks(decksResponse.data);
        setCurrentDeck(name);
        alert(response.data.message || 'Deck created successfully!');
      } else {
        alert(`Failed to create deck: ${response.data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Error creating deck:", error);
      if (error.code === 'ECONNREFUSED' || error.message.includes('Network Error') || error.code === 'ECONNABORTED') {
        // Backend connection failed - try to restart
        setBackendError('Backend connection lost. Attempting to restart...');
        setIsBackendReady(false);
        
        if (window.__TAURI__) {
          try {
            await invoke('start_backend');
            // Wait longer for backend to restart
            setTimeout(async () => {
              try {
                await checkBackendStatus();
                if (isBackendReady) {
                  alert('Backend restarted successfully. Please try creating the deck again.');
                } else {
                  alert('Backend restart failed. Please restart the application.');
                }
              } catch (restartError) {
                console.error('Backend restart verification failed:', restartError);
                alert('Backend restart verification failed. Please restart the application.');
              }
            }, 5000);
          } catch (restartError) {
            console.error('Failed to restart backend:', restartError);
            alert('Failed to restart backend. Please restart the application or check if Python is properly installed.');
          }
        } else {
          alert('Cannot connect to backend server. Please ensure the Flask server is running on port 5002.');
        }
      } else {
        alert(`Failed to create deck: ${error.message}`);
      }
    }
  };

  const getNextCard = async () => {
    if (!currentDeck) return;
    try {
      const res = await axios.post(`${API}/next_card/${currentDeck}/${DEFAULT_USER}`);
      if (res.data && res.data.success && res.data.next_card) {
        setReviewCard(res.data.next_card);
        setShowBack(false);
        setRating(10);
      } else {
        alert("Error: Could not load next card.");
        setView('decks');
      }
    } catch (error) {
      console.error("Error getting next card:", error);
      alert(`Error getting next card: ${error.message}`);
      setView('decks');
      throw error;
    }
  };

  const handleReview = async () => {
    try {
        const response = await axios.post(`${API}/review/${currentDeck}/${DEFAULT_USER}`, {
            id: reviewCard.id,
            rating: rating,
            session_id: currentSession ? currentSession.id : null
        });
        
        if (response.data.success && response.data.next_card) {
            stopTimer();
            resetTimer();
            setReviewCard(response.data.next_card);
            setShowBack(false);
            setRating(10);
            startTimer();
        } else {
            const errorMsg = response.data.error || 'Could not load next card. Please try again.';
            alert(`Error: ${errorMsg}`);
            if (response.data.error && response.data.error.includes('No more cards')) {
                setView('decks');
            }
        }
    } catch (error) {
        console.error("Error submitting review:", error);
        alert('Error submitting review. Please try again.');
    }
  };

  // Delete card function
  const handleDeleteCard = async (cardId) => {
    if (!currentDeck) return;
    
    if (window.confirm("Are you sure you want to delete this card?")) {
      try {
        await axios.delete(`${API}/cards/${currentDeck}/${cardId}`);
        // Refresh the cards list
        axios.get(`${API}/cards/${currentDeck}`).then(res => setDeck(res.data));
      } catch (error) {
        console.error("Error deleting card:", error);
        alert("Failed to delete card. Please try again.");
      }
    }
  };
  
  // Edit card setup function
  const handleEditCardSetup = (card) => {
    setEditingCard(card);
    setFront(card.front);
    setBack(card.back);
    setFrontImage(card.frontImage);
    setBackImage(card.backImage);
    setCardType(card.type || "Basic");
    setView('add');
  };
  
  // Update card function
  const handleUpdateCard = async () => {
    if (!currentDeck || !editingCard) return;
    
    try {
      await axios.put(`${API}/cards/${currentDeck}/${editingCard.id}`, {
        front,
        back,
        frontImage,
        backImage,
        type: cardType
      });
      
      // Clear the form
      setFront("");
      setBack("");
      setFrontImage(null);
      setBackImage(null);
      setCardType("Basic");
      setEditingCard(null);
      
      // Refresh the cards list
      axios.get(`${API}/cards/${currentDeck}`).then(res => setDeck(res.data));
      
      // Return to manage view
      setView('manage');
    } catch (error) {
      console.error("Error updating card:", error);
      alert("Failed to update card. Please try again.");
    }
  };

  // Delete session function
  const handleDeleteSession = async (sessionId) => {
    if (window.confirm("Are you sure you want to delete this session? This action cannot be undone.")) {
      try {
        // Immediately update UI by removing the session from the local state
        setSessions(prevSessions => prevSessions.filter(session => session.id !== sessionId));
        
        // If the deleted session was selected, clear the selection
        if (selectedSession === sessionId) {
          setSelectedSession(null);
        }

        // Then call the API to actually delete the session
        await axios.post(`${API}/sessions/${sessionId}/end`);
        
        // No need to call loadSessions() here as we've already updated the UI
        // This avoids any potential flickering
      } catch (error) {
        console.error("Error deleting session:", error);
        alert("Failed to delete session. Please try again.");
        // If there was an error, reload the sessions to restore the UI
        loadSessions();
      }
    }
  };
  
  // Render views
  const DeckView = () => (
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
            key={deck}
            className={`deck-card ${currentDeck === deck ? 'selected' : ''}`}
            onClick={() => setCurrentDeck(deck)}
          >
            <h3>{deck}</h3>
            <p>{deck.length || 0} cards</p>
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

  const StatsView = () => (
    <div className="stats-view">
      <h2>Statistics</h2>
      
      <div className="stats-filters">
        <div className="filter-group">
          <label>Stats Type:</label>
          <select
            value={statsType}
            onChange={(e) => setStatsType(e.target.value)}
            className="stats-selector"
          >
            <option value="user">User Statistics</option>
            <option value="deck">Deck Statistics</option>
            <option value="session">Session Statistics</option>
          </select>
        </div>
        
        {statsType === 'session' && (
          <div className="filter-group">
            <label>Session:</label>
            <select
              value={selectedSession || ''}
              onChange={(e) => setSelectedSession(e.target.value)}
              className="stats-selector"
            >
              <option value="">Select a session</option>
              {sessions.map(session => (
                <option key={session.id} value={session.id}>
                  {session.name} ({new Date(session.start_time).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      
      <div className="stats-container">
        <ZoomableImage 
          src={
            statsType === 'session' && selectedSession
              ? `${API}/stats/session?session=${selectedSession}&user=${DEFAULT_USER}&t=${Date.now()}`
              : statsType === 'deck'
              ? `${API}/stats/deck?deck=${currentDeck}&user=${DEFAULT_USER}&t=${Date.now()}`
              : `${API}/stats/user?user=${DEFAULT_USER}&t=${Date.now()}`
          } 
          alt="Performance Statistics" 
          className="stats-image"
        />
      </div>
    </div>
  );

  // Render card management view
  const ManageView = () => (
    <div className="manage-view">
      <h2>{currentDeck ? `Manage Cards in ${currentDeck}` : 'Manage Your Flashcards'}</h2>
      
      <div className="deck-actions">
        <select 
          value={currentDeck || ''} 
          onChange={(e) => setCurrentDeck(e.target.value)}
          className="deck-selector"
        >
          <option value="">Select a deck</option>
          {decks.map(deck => (
            <option key={deck} value={deck}>{deck}</option>
          ))}
        </select>
        
        {currentDeck && (
          <button 
            onClick={() => {
              setEditingCard(null);
              setFront("");
              setBack("");
              setFrontImage(null);
              setBackImage(null);
              setCardType("Basic");
              setView('add');
            }}
            className="add-new-button"
          >
            Add New Card
          </button>
        )}
      </div>
      
      <div className="manage-tabs">
        <button 
          className={`manage-tab ${manageTab === 'cards' ? 'active' : ''}`} 
          onClick={() => setManageTab('cards')}
        >
          Cards
        </button>
        <button 
          className={`manage-tab ${manageTab === 'sessions' ? 'active' : ''}`} 
          onClick={() => setManageTab('sessions')}
        >
          Sessions
        </button>
      </div>
      
      {manageTab === 'cards' ? (
        !currentDeck ? (
          <div className="no-cards-message">
            <p>Please select a deck from the dropdown above to manage its cards.</p>
          </div>
        ) : deck.length === 0 ? (
          <div className="no-cards-message">
            <p>This deck has no cards yet. Click "Add New Card" to create your first card.</p>
          </div>
        ) : (
          <div className="cards-list">
            {deck.map(card => (
              <div key={card.id} className="card-item">
                <div className="card-preview">
                  <div className="card-preview-front">
                    <h4>Front</h4>
                    <div className="preview-content">
                      <div dangerouslySetInnerHTML={{ __html: card.front }} />
                      {card.frontImage && (
                        <img src={card.frontImage} alt="Front" className="preview-image" />
                      )}
                    </div>
                  </div>
                  
                  <div className="card-preview-back">
                    <h4>Back</h4>
                    <div className="preview-content">
                      <div dangerouslySetInnerHTML={{ __html: card.back }} />
                      {card.backImage && (
                        <img src={card.backImage} alt="Back" className="preview-image" />
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="card-actions">
                  <button 
                    onClick={() => handleEditCardSetup(card)} 
                    className="edit-button"
                  >
                    Edit
                  </button>
                  <button 
                    onClick={() => handleDeleteCard(card.id)} 
                    className="delete-button"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="sessions-list">
          {sessions.length === 0 ? (
            <p>No study sessions found. Start a new session to begin.</p>
          ) : (
            <table className="sessions-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Date</th>
                  <th>Duration</th>
                  <th>Cards Studied</th>
                  <th>Success Rate</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map(session => (
                  <tr key={session.id}>
                    <td>{session.name}</td>
                    <td>{new Date(session.start_time).toLocaleDateString()}</td>
                    <td>{Math.round(session.duration)} minutes</td>
                    <td>{session.cards_studied}</td>
                    <td>{Math.round(session.success_rate * 100)}%</td>
                    <td>
                      <button onClick={() => {
                        setSelectedSession(session.id);
                        setStatsType('session');
                        setView('stats');
                      }}>
                        View Stats
                      </button>
                      <button onClick={() => handleDeleteSession(session.id)}>
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
  );

  // Footer masthead component
  const FooterMasthead = () => (
    <div className="footer-masthead">
      <div className="app-name">Bayesian Flashcards</div>
      <div className="author">by Leon Chlon</div>
    </div>
  );

  // Load sessions when view changes to manage and when manageTab changes to sessions
  useEffect(() => {
    if (view === 'manage' && manageTab === 'sessions') {
      loadSessions();
    }
  }, [view, manageTab, loadSessions]);

  // Show loading screen if backend is not ready
  const [isBackendReady, setIsBackendReady] = useState(false);
  const [backendError, setBackendError] = useState(null);

  const checkBackendStatus = useCallback(async () => {
    try {
      console.log(`Checking backend status at ${API}/health`);
      const response = await axios.get(`${API}/health`, {
        timeout: 10000,  // Increased timeout
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status === 200) {
        console.log('Backend is ready');
        setIsBackendReady(true);
        setBackendError(null);
        return true;
      }
    } catch (error) {
      console.error('Backend not ready:', error);
      
      if (window.__TAURI__) {
        setBackendError('Starting backend server...');
        
        try {
          console.log('Attempting to start backend via Tauri...');
          const result = await invoke('start_backend');
          console.log('Backend start result:', result);
          
          // Wait longer for backend to start in production
          setTimeout(() => checkBackendStatus(), 8000);
        } catch (startError) {
          console.error('Failed to start backend:', startError);
          setBackendError(`Failed to start backend: ${startError}. Please ensure Python 3.10+ is installed.`);
          // Keep trying periodically
          setTimeout(() => checkBackendStatus(), 10000);
        }
      } else {
        setBackendError('Backend not available - please start the Flask server manually on port 5002');
        // Keep trying in development mode
        setTimeout(() => checkBackendStatus(), 5000);
      }
      return false;
    }
  }, []);

  // Initialize Tauri APIs
  useEffect(() => {
    if (window.__TAURI__) {
      // Set up Tauri-specific functionality
      window.electronAPI = {
        checkActiveSession: () => invoke('check_active_session'),
        confirmNavigation: () => invoke('confirm_navigation'),
        endSession: () => invoke('end_session'),
        showPromptDialog: (title, defaultValue) => invoke('show_prompt_dialog', { title, defaultValue: defaultValue })
      };
      
      // Check backend status
      checkBackendStatus();
    } else {
      // Running in browser - backend should already be available
      setIsBackendReady(true);
    }
  }, [checkBackendStatus]);

  // Show loading screen if backend is not ready
  if (!isBackendReady) {
    return (
      <div className="app-container loading-container">
        <div className="loading-content">
          <h2>Starting Bayesian Flashcards</h2>
          {backendError ? (
            <div className="error-message">
              <p>{backendError}</p>
              <button onClick={checkBackendStatus} className="retry-button">
                Retry
              </button>
            </div>
          ) : (
            <div className="loading-spinner">
              <p>Initializing backend...</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <NavigationBar />
      
      {view === 'decks' && <DeckView />}
      {view === 'add' && (
        <div className="card-editor">
          <div className="editor-header">
            <select 
              value={currentDeck || ''} 
              onChange={(e) => setCurrentDeck(e.target.value)}
              className="deck-selector"
            >
              <option value="">Select a deck</option>
              {decks.map(deck => (
                <option key={deck} value={deck}>{deck}</option>
              ))}
            </select>
            <div id={toolbarId} className="toolbar-only">
              <ReactQuill
                modules={{ toolbar: toolbarOptions }}
                className="toolbar-only"
              />
            </div>
          </div>

          <div className="card-side">
            <h3>Front</h3>
            <ReactQuill 
              value={front} 
              onChange={setFront}
              modules={modules}
              formats={formats}
              className="editor-field"
            />
            <ImageDropZone
              onDrop={setFrontImage}
              image={frontImage}
              onRemove={() => setFrontImage(null)}
              side="front"
            />
          </div>

          <div className="card-side">
            <h3>Back</h3>
            <ReactQuill 
              value={back} 
              onChange={setBack}
              modules={modules}
              formats={formats}
              className="editor-field"
            />
            <ImageDropZone
              onDrop={setBackImage}
              image={backImage}
              onRemove={() => setBackImage(null)}
              side="back"
            />
          </div>

          <div className="editor-footer">
            {editingCard ? (
              <div className="editor-actions">
                <button onClick={handleUpdateCard} className="update-button">Update Card</button>
                <button 
                  onClick={() => {
                    setEditingCard(null);
                    setFront("");
                    setBack("");
                    setFrontImage(null);
                    setBackImage(null);
                    setCardType("Basic");
                    setView('manage');
                  }} 
                  className="cancel-button"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button onClick={handleAddCard} className="add-button">Add Card</button>
            )}
          </div>
        </div>
      )}
      
      {view === 'review' && (
        <div className="review-container">
          {currentSession && (
            <div className="active-session-info">
              <div className="session-details">
                <h3>Active Session: {currentSession.name}</h3>
                <p>Started: {new Date(currentSession.start_time).toLocaleTimeString()}</p>
              </div>
              <button 
                onClick={endStudySession} 
                className="end-session-btn"
              >
                End Session
              </button>
            </div>
          )}
          
          {reviewCard ? (
            <div className="review-card">
              <div className="card-content">
                <div className="card-text" dangerouslySetInnerHTML={{ __html: reviewCard.front }} />
                {reviewCard.frontImage && (
                  <ZoomableImage src={reviewCard.frontImage} alt="Front" className="card-image" />
                )}
              </div>
              
              {showBack ? (
                <div className="back-content">
                  <div className="card-text" dangerouslySetInnerHTML={{ __html: reviewCard.back }} />
                  {reviewCard.backImage && (
                    <ZoomableImage src={reviewCard.backImage} alt="Back" className="card-image" />
                  )}
                  <div className="rating-controls">
                    <div className="rating-scale">
                      <span className="rating-label">Hard</span>
                      <input 
                        type="range"
                        min="0"
                        max="10"
                        value={rating}
                        onChange={(e) => setRating(parseInt(e.target.value))}
                        className="rating-slider"
                      />
                      <span className="rating-label">Easy</span>
                    </div>
                    <button onClick={handleReview} className="submit-button">Submit Review</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => {
                  setShowBack(true);
                  stopTimer();
                }} 
                  className="show-answer">Show Answer</button>
              )}
            </div>
          ) : (
            <p>Loading card...</p>
          )}
        </div>
      )}
      
      {view === 'stats' && currentDeck && (
        <StatsView />
      )}

      {view === 'manage' && (
        <ManageView />
      )}

      {/* Create deck modal */}
      {showCreateDeckModal && (
        <CreateDeckModal
          onClose={() => setShowCreateDeckModal(false)}
          onSubmit={(name) => {
            handleCreateDeck(name);
            setShowCreateDeckModal(false);
          }}
        />
      )}

      {/* Study session modal */}
      {showStudySessionModal && (
        <StudySessionModal
          onClose={() => setShowStudySessionModal(false)}
          onSubmit={(name) => {
            startStudySession(name);
            setShowStudySessionModal(false);
          }}
        />
      )}

      <FooterMasthead />
    </div>
  );
}

export default App;
