import axios from 'axios';

// API configuration
export const getApiBase = () => {
  if (window.__TAURI__) {
    return "http://127.0.0.1:5002";
  } else {
    return "http://localhost:5002";
  }
};

export const API = `${getApiBase()}/api`;
export const DEFAULT_USER = "default";

// API Functions
export const fetchDecks = async () => {
  const response = await axios.get(`${API}/decks`);
  return response.data;
};

export const fetchDeckCards = async (deckName) => {
  const response = await axios.get(`${API}/cards/${encodeURIComponent(deckName)}`);
  return response.data;
};

export const fetchSessions = async (allSessions = false, deckName = null) => {
  let url = `${API}/sessions`;
  if (allSessions) {
    url += '?all=true';
  }
  if (deckName) {
    url += `${allSessions ? '&' : '?'}deck=${encodeURIComponent(deckName)}`;
  }
  const response = await axios.get(url);
  return response.data;
};

export const fetchUserSettings = async () => {
  try {
    const response = await axios.get(`${API}/users/${DEFAULT_USER}/settings`);
    return response.data?.settings || {};
  } catch (error) {
    console.error("Error fetching user settings:", error);
    return {};
  }
};

// Export helper functions for testing
export const __testConfig = {
  getApiBase,
  API,
  DEFAULT_USER
};