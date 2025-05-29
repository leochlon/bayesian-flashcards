import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API, DEFAULT_USER, fetchDecks, fetchDeckCards, fetchSessions, fetchUserSettings } from '../api';

export const useAppData = () => {
  // State for decks and cards
  const [decks, setDecks] = useState([]);
  const [currentDeck, setCurrentDeck] = useState('');
  const [deck, setDeck] = useState([]);
  
  // State for sessions
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  
  // State for user settings
  const [easyMode, setEasyMode] = useState(false);

  // Load decks
  useEffect(() => {
    fetchDecks()
      .then(deckList => setDecks(deckList))
      .catch(error => console.error("Error loading decks:", error));
  }, []);

  // Load deck cards when deck changes
  useEffect(() => {
    if (currentDeck) {
      fetchDeckCards(currentDeck)
        .then(deckData => setDeck(deckData))
        .catch(error => console.error("Error loading deck cards:", error));
    }
  }, [currentDeck]);

  // Function to load sessions
  const loadSessions = useCallback(async (allSessions = false, statsType = null) => {
    try {
      console.log('Loading sessions, allSessions:', allSessions, 'currentDeck:', currentDeck);
      const sessions = await fetchSessions(allSessions, currentDeck);
      setSessions(sessions);
      
      // If we just loaded sessions and were looking at session stats but had none selected,
      // and sessions exist, select the first one
      if (statsType === 'session' && !selectedSession && sessions.length > 0) {
        console.log('Auto-selecting first session:', sessions[0].id);
        setSelectedSession(sessions[0].id);
      }
    } catch (error) {
      console.error("Error loading sessions:", error);
    }
  }, [currentDeck, selectedSession]);
  
  useEffect(() => {
    loadSessions();
  }, [currentDeck, loadSessions]);

  // Load user settings to get easy mode status
  useEffect(() => {
    const loadUserSettings = async () => {
      try {
        const settings = await fetchUserSettings();
        setEasyMode(settings.easy_mode || false);
      } catch (error) {
        console.error("Error loading user settings:", error);
      }
    };
    
    loadUserSettings();
  }, []);

  // Function to create a new deck
  const createDeck = async (deckName) => {
    try {
      await axios.post(`${API}/decks`, { deck: deckName });
      const updatedDecks = await fetchDecks();
      setDecks(updatedDecks);
      setCurrentDeck(deckName);
      return true;
    } catch (error) {
      console.error("Error creating deck:", error);
      return false;
    }
  };

  // Function to delete a deck
  const deleteDeck = async (deckName) => {
    try {
      await axios.delete(`${API}/decks/${encodeURIComponent(deckName)}`);
      const updatedDecks = await fetchDecks();
      setDecks(updatedDecks);
      if (currentDeck === deckName) {
        setCurrentDeck(updatedDecks.length > 0 ? updatedDecks[0] : '');
      }
      return true;
    } catch (error) {
      console.error("Error deleting deck:", error);
      return false;
    }
  };

  // Function to delete a card
  const deleteCard = async (cardToDelete) => {
    try {
      await axios.delete(`${API}/cards/${encodeURIComponent(currentDeck)}/${cardToDelete}`);
      const updatedDeck = await fetchDeckCards(currentDeck);
      setDeck(updatedDeck);
      return true;
    } catch (error) {
      console.error("Error deleting card:", error);
      return false;
    }
  };

  // Start a new study session
  const startStudySession = async (sessionName) => {
    try {
      const response = await axios.post(`${API}/sessions`, {
        deck: currentDeck,
        user: DEFAULT_USER,
        name: sessionName
      });
      
      // Extract the session object from the response
      const session = response.data.session;
      setCurrentSession(session);
      return session;
    } catch (error) {
      console.error("Error starting study session:", error);
      return null;
    }
  };

  // Delete a session
  const deleteSession = async (sessionToDelete) => {
    try {
      await axios.delete(`${API}/sessions/${sessionToDelete}`);
      await loadSessions(true); // Reload all sessions
      
      // If the deleted session was the selected one, clear the selection
      if (selectedSession === sessionToDelete) {
        setSelectedSession(null);
      }
      return true;
    } catch (error) {
      console.error("Error deleting session:", error);
      return false;
    }
  };

  // End current study session
  const endStudySession = async () => {
    try {
      await axios.post(`${API}/sessions/${currentSession.id}/end`);
      setCurrentSession(null);
      loadSessions();
      return true;
    } catch (error) {
      console.error("Error ending study session:", error);
      return false;
    }
  };

  // Function to handle easy mode toggle
  const handleEasyModeToggle = async () => {
    try {
      const newEasyMode = !easyMode;
      
      // Get current settings
      const currentSettingsResponse = await axios.get(`${API}/users/${DEFAULT_USER}/settings`);
      const currentSettings = currentSettingsResponse.data?.settings || {};
      
      // Update easy mode in settings
      const updatedSettings = {
        ...currentSettings,
        easy_mode: newEasyMode
      };
      
      // Send to backend
      const response = await axios.put(`${API}/users/${DEFAULT_USER}/settings`, updatedSettings);
      
      if (response.data && response.data.success) {
        setEasyMode(newEasyMode);
        return true;
      } else {
        throw new Error('Failed to update settings');
      }
    } catch (error) {
      console.error("Error toggling easy mode:", error);
      return false;
    }
  };

  return {
    // State
    decks,
    currentDeck,
    setCurrentDeck,
    deck,
    setDeck,
    sessions,
    currentSession,
    selectedSession,
    setSelectedSession,
    easyMode,
    
    // Functions
    loadSessions,
    createDeck,
    deleteDeck,
    deleteCard,
    startStudySession,
    deleteSession,
    endStudySession,
    handleEasyModeToggle
  };
};