import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { API, DEFAULT_USER } from '../api';
import '../styles/views/stats.css';
import FixedZoomableImage from './FixedZoomableImage';

const StatsView = ({
  statsType,
  setStatsType,
  currentDeck,
  setCurrentDeck,
  decks,
  selectedSession,
  setSelectedSession,
  sessions,
  loadSessions,
  statsRefreshTrigger
}) => {
  console.log('=== StatsView Component Rendering ===');
  console.log('Initial statsType:', statsType);
  console.log('Initial currentDeck:', currentDeck);
  console.log('Initial selectedSession:', selectedSession);
  console.log('Received statsRefreshTrigger prop:', statsRefreshTrigger);
  console.log('Available decks:', decks);

  // Local state for the selected deck and stats type in the stats view
  const [statsDeck, setStatsDeck] = useState(currentDeck || '');
  const [localStatsType, setLocalStatsType] = useState(statsType || 'user');
  // Force refresh when the stats type changes
  const [refreshKey, setRefreshKey] = useState(0);
  // Track stats image loading status
  const [imageStatus, setImageStatus] = useState({loading: false, error: null, success: false});
  // Add backend availability check state
  const [backendError, setBackendError] = useState(null);
  
  // Initialize component on mount - FIXED: Removed circular dependencies
  useEffect(() => {
    console.log('StatsView mounted');
    
    // Initialize with safe defaults based on current state
    if (localStatsType === 'deck' && !statsDeck && decks.length > 0) {
      const firstDeckName = typeof decks[0] === 'object' ? decks[0].name : decks[0];
      console.log('Setting default deck to first available:', firstDeckName);
      setStatsDeck(firstDeckName);
    }
  }, []); // FIXED: Empty dependency array - only run on mount
  
  // FIXED: Separated currentDeck sync logic with proper dependencies
  useEffect(() => {
    console.log('currentDeck changed to:', currentDeck);
    // Handle both string decks and object decks
    const deckNames = decks.map(deck => typeof deck === 'object' ? deck.name : deck);
    if (currentDeck && deckNames.includes(currentDeck) && currentDeck !== statsDeck) {
      console.log('Updating statsDeck from:', statsDeck, 'to:', currentDeck);
      setStatsDeck(currentDeck);
    }
  }, [currentDeck, decks, statsDeck]); // FIXED: Include statsDeck for proper comparison
  
  // FIXED: Separated statsType sync logic
  useEffect(() => {
    console.log('External statsType changed from:', localStatsType, 'to:', statsType);
    if (statsType && statsType !== localStatsType) {
      setLocalStatsType(statsType);
    }
  }, [statsType, localStatsType]); // FIXED: Include localStatsType for proper comparison

  // FIXED: Pure validation function using useMemo instead of state
  const hasValidSelection = useMemo(() => {
    if (localStatsType === 'user') {
      return true;
    } else if (localStatsType === 'deck') {
      // Handle both string decks and object decks
      const deckNames = decks.map(deck => typeof deck === 'object' ? deck.name : deck);
      return statsDeck && deckNames.includes(statsDeck);
    } else if (localStatsType === 'session') {
      return !!selectedSession;
    }
    return false;
  }, [localStatsType, statsDeck, decks, selectedSession]);

  // FIXED: Memoized URL generation with backend validation
  const statsUrl = useMemo(() => {
    if (!localStatsType || !hasValidSelection || backendError) return null;
    
    // Include statsRefreshTrigger in timestamp to force refresh when settings change
    const timestamp = `${Date.now()}-${statsRefreshTrigger}`;
    let url = null;
    
    if (localStatsType === 'session' && selectedSession) {
      url = `${API}/stats/session?session=${selectedSession}&user=${DEFAULT_USER}&t=${timestamp}`;
    } else if (localStatsType === 'deck' && statsDeck) {
      // Handle both string decks and object decks
      const deckNames = decks.map(deck => typeof deck === 'object' ? deck.name : deck);
      if (deckNames.includes(statsDeck)) {
        url = `${API}/stats/deck?deck=${encodeURIComponent(statsDeck)}&user=${DEFAULT_USER}&t=${timestamp}`;
      }
    } else if (localStatsType === 'user') {
      url = `${API}/stats/user?user=${DEFAULT_USER}&t=${timestamp}`;
    }
    
    console.log('StatsView: Generated statsUrl:', url, 'statsRefreshTrigger:', statsRefreshTrigger);
    return url;
  }, [localStatsType, statsDeck, selectedSession, decks, hasValidSelection, backendError, statsRefreshTrigger]);

  // FIXED: Simple refresh trigger when selection changes
  useEffect(() => {
    if (!hasValidSelection) {
      setImageStatus({loading: false, error: 'Invalid selection', success: false});
      return;
    }

    console.log('StatsView: Selection changed, triggering refresh');
    setImageStatus({loading: true, error: null, success: false});
    setBackendError(null);
    setRefreshKey(prev => prev + 1);
  }, [localStatsType, statsDeck, selectedSession, hasValidSelection]);
  
  // Log the stats URL for debugging
  console.log('StatsView: Final statsUrl for rendering:', statsUrl);
  console.log('StatsView: localStatsType for rendering:', localStatsType);
  console.log('StatsView: imageStatus:', imageStatus);
  console.log('StatsView: backendError:', backendError);
  console.log('StatsView: statsRefreshTrigger:', statsRefreshTrigger);

  // Debug: Track statsRefreshTrigger changes
  useEffect(() => {
    console.log('StatsView: statsRefreshTrigger changed to:', statsRefreshTrigger);
  }, [statsRefreshTrigger]);

  // FIXED: Stable callback functions
  const handleImageLoad = useCallback(() => {
    console.log('StatsView: Image loaded successfully');
    setImageStatus({loading: false, error: null, success: true});
  }, []);

  const handleImageError = useCallback((error) => {
    console.error('StatsView: Image failed to load:', error);
    setImageStatus({loading: false, error: 'Failed to load image', success: false});
  }, []);

  // FIXED: Stable change handlers
  const handleStatsTypeChange = useCallback((newType) => {
    console.log('Stats type changed from', localStatsType, 'to', newType);
    
    // Reset backend error when changing types
    setBackendError(null);
    setImageStatus({loading: false, error: null, success: false});
    
    // Reset selections when changing type
    if (newType === 'deck') {
      // When switching to deck stats, ensure we have a valid deck selected
      if (!statsDeck && decks.length > 0) {
        const defaultDeck = typeof decks[0] === 'object' ? decks[0].name : decks[0];
        console.log('Setting default deck to:', defaultDeck);
        setStatsDeck(defaultDeck);
        setCurrentDeck(defaultDeck);
      }
    } else if (newType === 'session') {
      // When switching to session stats, load all sessions
      loadSessions(true);
    }
    
    // Update both local and global state
    setLocalStatsType(newType);
    setStatsType(newType);
  }, [localStatsType, statsDeck, decks, setCurrentDeck, loadSessions, setStatsType]);

  const handleDeckChange = useCallback((newDeck) => {
    setBackendError(null); // Reset error when changing deck
    setStatsDeck(newDeck);
    setCurrentDeck(newDeck);
  }, [setCurrentDeck]);

  const handleSessionChange = useCallback((newSession) => {
    console.log('Session selected:', newSession);
    setBackendError(null); // Reset error when changing session
    setSelectedSession(newSession);
  }, [setSelectedSession]);

  return (
    <div className="stats-view">
      <h2>Statistics</h2>
      {console.log('StatsView: Rendering component with localStatsType:', localStatsType)}
      
      <div className="stats-filters">
        <div className="filter-group">
          <label>Stats Type:</label>
          {console.log('StatsView: Rendering type selector with value:', localStatsType)}
          <select
            value={localStatsType}
            onChange={(e) => handleStatsTypeChange(e.target.value)}
            className="stats-selector"
          >
            <option value="user">User Statistics</option>
            <option value="deck">Deck Statistics</option>
            <option value="session">Session Statistics</option>
          </select>
        </div>
        
        {localStatsType === 'deck' && (
          <div className="filter-group">
            <label>Deck:</label>
            <select
              value={statsDeck || (decks.length > 0 ? (typeof decks[0] === 'object' ? decks[0].name : decks[0]) : '')}
              onChange={(e) => handleDeckChange(e.target.value)}
              className="stats-selector"
            >
              {decks.length === 0 ? (
                <option value="">No decks available</option>
              ) : (
                decks.map(deck => (
                  <option key={typeof deck === 'object' ? deck.name : deck} value={typeof deck === 'object' ? deck.name : deck}>
                    {typeof deck === 'object' ? deck.name : deck}
                  </option>
                ))
              )}
            </select>
            {decks.length === 0 && (
              <div className="selection-warning">No decks available. Create a deck first.</div>
            )}
          </div>
        )}
        
        {localStatsType === 'session' && (
          <div className="filter-group">
            <label>Session:</label>
            {console.log('Rendering session dropdown with sessions:', sessions)}
            <select
              value={selectedSession || ''}
              onChange={(e) => handleSessionChange(e.target.value)}
              className="stats-selector"
            >
              <option value="">Select a session</option>
              {sessions.map(session => (
                <option key={session.id} value={session.id}>
                  {session.name} ({new Date(session.start_time).toLocaleDateString()})
                </option>
              ))}
            </select>
            {sessions.length === 0 && (
              <div className="selection-warning">No sessions available. Start a study session first.</div>
            )}
          </div>
        )}
      </div>
      
      <div className="stats-container">
        {imageStatus.loading && (
          <div className="loading-message">
            <p>Loading statistics...</p>
          </div>
        )}
        
        {(imageStatus.error || backendError) && (
          <div className="error-message">
            <p>Error: {backendError || imageStatus.error}</p>
            {localStatsType === 'deck' ? (
              <div>
                <p>This deck has no review data yet.</p>
                <p><strong>Solution:</strong> Study some cards from the "{statsDeck}" deck to generate statistics.</p>
              </div>
            ) : localStatsType === 'session' ? (
              <div>
                <p>This session has no review data yet.</p>
                <p><strong>Solution:</strong> Complete some reviews in this session to generate statistics.</p>
              </div>
            ) : (
              <div>
                <p>Please check your connection and try again.</p>
                <p>This could be because:</p>
                <ul>
                  <li>The backend service is not running</li>
                  <li>There was a network issue loading the image</li>
                  <li>The backend encountered an error generating the plot</li>
                </ul>
              </div>
            )}
          </div>
        )}
        
        {localStatsType === 'deck' && !hasValidSelection ? (
          <div className="no-deck-message">
            <p>Please select a valid deck from the dropdown above to view deck statistics.</p>
            {decks.length === 0 && <p>You need to create a deck first.</p>}
          </div>
        ) : localStatsType === 'session' && !hasValidSelection ? (
          <div className="no-session-message">
            <p>Please select a valid session from the dropdown above to view session statistics.</p>
            {sessions.length === 0 && <p>You need to complete a study session first.</p>}
          </div>
        ) : statsUrl ? (
          <div className="stats-image-container">
            <div className="stats-title">
              {/* Log the title render condition */}
              {console.log('Rendering title for localStatsType:', localStatsType, 
                           'statsDeck:', statsDeck, 
                           'selectedSession:', selectedSession)}
              
              {localStatsType === 'deck' && (
                <h3>Statistics for Deck: {statsDeck || 'None Selected'}</h3>
              )}
              {localStatsType === 'user' && (
                <h3>User Statistics</h3>
              )}
              {localStatsType === 'session' && (
                <h3>Session Statistics: {
                  selectedSession 
                    ? (sessions.find(s => s.id === selectedSession)?.name || 'Unknown Session')
                    : 'None Selected'
                }</h3>
              )}
            </div>
            <FixedZoomableImage
              key={`stats-${refreshKey}-${statsRefreshTrigger}-${localStatsType}-${statsDeck || selectedSession || 'user'}`}
              src={statsUrl}
              alt="Performance Statistics"
              className="stats-image"
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default StatsView;