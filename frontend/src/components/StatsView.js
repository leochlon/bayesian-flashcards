import React, { useState, useEffect, useCallback } from 'react';
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
  loadSessions 
}) => {
  console.log('=== StatsView Component Rendering ===');
  console.log('Initial statsType:', statsType);
  console.log('Initial currentDeck:', currentDeck);
  console.log('Initial selectedSession:', selectedSession);
  console.log('Available decks:', decks);

  // Local state for the selected deck and stats type in the stats view
  // Initialize with safe defaults to prevent null values
  const [statsDeck, setStatsDeck] = useState(currentDeck || '');
  const [localStatsType, setLocalStatsType] = useState(statsType || 'user');
  // Force refresh when the stats type changes
  const [refreshKey, setRefreshKey] = useState(0);
  // Track if the component is mounted
  const [isMounted, setIsMounted] = useState(false);
  // Track stats image loading status
  const [imageStatus, setImageStatus] = useState({loading: false, error: null, success: false});
  // Track if we have valid selections for the current stats type
  const [hasValidSelection, setHasValidSelection] = useState(localStatsType === 'user');
  
  // Mark component as mounted and initialize
  useEffect(() => {
    console.log('StatsView mounted');
    setIsMounted(true);
    
    // Initialize with safe defaults based on current state
    if (localStatsType === 'deck' && !statsDeck && decks.length > 0) {
      console.log('Setting default deck to first available:', decks[0]);
      setStatsDeck(decks[0]);
      setCurrentDeck(decks[0]);
    }
    
    // Validate selections immediately
    validateSelections();
    
    return () => {
      console.log('StatsView unmounted');
      setIsMounted(false);
    };
  }, []);
  
  // Update statsDeck when currentDeck changes
  useEffect(() => {
    console.log('currentDeck changed to:', currentDeck);
    if (currentDeck && decks.includes(currentDeck)) {
      console.log('Updating statsDeck from:', statsDeck, 'to:', currentDeck);
      setStatsDeck(currentDeck);
    } else if (localStatsType === 'deck' && !statsDeck && decks.length > 0) {
      // If we need a deck but don't have a valid one, use the first available
      console.log('No valid deck selected, defaulting to first available:', decks[0]);
      setStatsDeck(decks[0]);
      setCurrentDeck(decks[0]);
    }
    validateSelections();
  }, [currentDeck, decks]);
  
  // Update localStatsType when statsType changes (from outside)
  useEffect(() => {
    console.log('External statsType changed from:', localStatsType, 'to:', statsType);
    if (statsType) {
      setLocalStatsType(statsType);
      validateSelections();
    }
  }, [statsType]);
  
  // Helper function to validate the current selections
  const validateSelections = () => {
    let isValid = false;
    if (localStatsType === 'user') {
      isValid = true;
    } else if (localStatsType === 'deck') {
      isValid = statsDeck && decks.includes(statsDeck);
    } else if (localStatsType === 'session') {
      isValid = !!selectedSession;
    }
    setHasValidSelection(isValid);
    return isValid;
  };

  // Prevent repeated fetches on error
  const [hasTriedFetch, setHasTriedFetch] = useState(false);

  // Force a refresh when localStatsType, statsDeck, or selectedSession changes
  useEffect(() => {
    const isValid = validateSelections();
    if (isValid) {
      setRefreshKey(rk => rk + 1);
      setImageStatus({loading: true, error: null, success: false});
      setHasTriedFetch(false);
    } else {
      setImageStatus({loading: false, error: 'Invalid selection', success: false});
    }
  }, [localStatsType, statsDeck, selectedSession]);

  // Generate the stats URL based on current selection with stable cache-busting
  const getStatsUrl = useCallback(() => {
    if (!localStatsType || !hasValidSelection) return null;
    const timestamp = refreshKey;
    let url = null;
    if (localStatsType === 'session' && selectedSession) {
      url = `${API}/stats/session?session=${selectedSession}&user=${DEFAULT_USER}&t=${timestamp}`;
    } else if (localStatsType === 'deck' && statsDeck && decks.includes(statsDeck)) {
      url = `${API}/stats/deck?deck=${encodeURIComponent(statsDeck)}&user=${DEFAULT_USER}&t=${timestamp}`;
    } else if (localStatsType === 'user') {
      url = `${API}/stats/user?user=${DEFAULT_USER}&t=${timestamp}`;
    }
    // Only fetch if we haven't already tried and failed
    if (url && !hasTriedFetch) {
      setHasTriedFetch(true);
      fetch(url)
        .then(response => {
          if (!response.ok) throw new Error(`API error: ${response.status}`);
          return response.blob();
        })
        .then(blob => {
          if (blob.size < 100) {
            setImageStatus({loading: false, error: 'No statistics available for this selection.', success: false});
          } else {
            setImageStatus({loading: false, error: null, success: true});
          }
        })
        .catch(error => {
          setImageStatus({loading: false, error: error.message, success: false});
        });
    }
    return url;
  }, [refreshKey, localStatsType, statsDeck, selectedSession, decks, hasValidSelection, hasTriedFetch]);

  // statsUrl is now directly from useCallback to prevent recalculation
  const statsUrl = getStatsUrl();
  
  // Log the stats URL for debugging
  console.log('StatsView: Final statsUrl for rendering:', statsUrl);
  console.log('StatsView: localStatsType for rendering:', localStatsType);
  console.log('StatsView: imageStatus:', imageStatus);

  // Function to handle image load events
  const handleImageLoad = () => {
    console.log('StatsView: Image loaded successfully');
    setImageStatus({loading: false, error: null, success: true});
  };

  // Function to handle image error events
  const handleImageError = (error) => {
    console.error('StatsView: Image failed to load:', error);
    setImageStatus({loading: false, error: 'Failed to load image', success: false});
  };

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
            onChange={(e) => {
              const newType = e.target.value;
              console.log('Stats type changed from', localStatsType, 'to', newType);
              
              // Reset selections when changing type
              if (newType === 'user') {
                // No need to reset anything for user stats
              } else if (newType === 'deck') {
                // When switching to deck stats, ensure we have a valid deck selected
                if (!statsDeck && decks.length > 0) {
                  const defaultDeck = decks[0];
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
            }}
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
              value={statsDeck || (decks[0] || '')}
              onChange={(e) => {
                const newDeck = e.target.value;
                setStatsDeck(newDeck);
                setCurrentDeck(newDeck);
              }}
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
              onChange={(e) => {
                const newSession = e.target.value;
                console.log('Session selected:', newSession);
                setSelectedSession(newSession);
              }}
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
        
        {imageStatus.error && (
          <div className="error-message">
            <p>Error: {imageStatus.error}</p>
            <p>Please check your selection and try again.</p>
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
              key={`stats-${refreshKey}-${localStatsType}-${statsDeck || selectedSession || 'user'}`}
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