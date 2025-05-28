import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import '../styles/views/settings.css';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5002';
const DEFAULT_USER = 'user1';

const Settings = () => {
  const [settings, setSettings] = useState(null);
  const [hyperInfo, setHyperInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [initialized, setInitialized] = useState(false);
  const [activeCategory, setActiveCategory] = useState('bayesian');

  // Default settings values to use if API fails
  const defaultSettings = useMemo(() => ({
    // Bayesian parameters
    prior_alpha: 1.0,
    prior_beta: 1.0,
    global_decay: 0.03,
    target_recall: 0.7,
    n_samples: 3000,
    history_window: 5,
    
    // Scheduler parameters
    backlog_limit: 50,
    max_reviews_per_card: 2,
    new_cards_per_session: 3,
    mature_cards_per_session: 5,
    
    // User experience parameters
    pomodoro_length: 25,
    break_length: 5,
    easy_mode: false
  }), []);

  // Default hyperparameter info to use if API fails
  const defaultHyperInfo = useMemo(() => ({
    bayesian: {
      prior_alpha: {
        description: 'Beta distribution prior for successes (higher = optimistic)',
        type: 'float',
        default: 1.0,
        min: 0.1,
        max: 10.0
      },
      prior_beta: {
        description: 'Beta distribution prior for failures (higher = pessimistic)',
        type: 'float',
        default: 1.0,
        min: 0.1,
        max: 10.0
      },
      global_decay: {
        description: 'Memory decay rate (higher = faster forgetting)',
        type: 'float',
        default: 0.03,
        min: 0.001,
        max: 0.1
      },
      target_recall: {
        description: 'Target recall probability (0.7 = 70% success rate)',
        type: 'float',
        default: 0.7,
        min: 0.5,
        max: 0.95
      },
      n_samples: {
        description: 'Monte Carlo samples for interval prediction',
        type: 'integer',
        default: 3000,
        min: 1000,
        max: 10000
      },
      history_window: {
        description: 'Number of recent reviews to consider for adaptive decay',
        type: 'integer',
        default: 5,
        min: 3,
        max: 20
      }
    },
    scheduler: {
      backlog_limit: {
        description: 'Maximum number of urgent cards to review',
        type: 'integer',
        default: 50,
        min: 10,
        max: 200
      },
      max_reviews_per_card: {
        description: 'Maximum reviews per card per session',
        type: 'integer',
        default: 2,
        min: 1,
        max: 5
      },
      new_cards_per_session: {
        description: 'New cards introduced per session',
        type: 'integer',
        default: 3,
        min: 1,
        max: 20
      },
      mature_cards_per_session: {
        description: 'Mature cards reviewed per session',
        type: 'integer',
        default: 5,
        min: 1,
        max: 50
      }
    },
    experience: {
      pomodoro_length: {
        description: 'Study session length in minutes',
        type: 'integer',
        default: 25,
        min: 5,
        max: 60
      },
      break_length: {
        description: 'Break length in minutes',
        type: 'integer',
        default: 5,
        min: 1,
        max: 30
      },
      easy_mode: {
        description: 'Enable easy mode (shorter intervals, 80% win rate)',
        type: 'boolean',
        default: false
      }
    }
  }), []);

  // Helper to group settings by category
  const groupedSettings = useMemo(() => {
    // Use settings from API or fallback to defaults
    const settingsData = settings || defaultSettings;
    const hyperInfoData = hyperInfo || defaultHyperInfo;
    
    const grouped = {
      bayesian: {},
      scheduler: {},
      experience: {}
    };

    // Group the settings by their category safely
    if (settingsData && hyperInfoData) {
      // Make sure we're safely accessing keys on objects that exist
      const keys = Object.keys(settingsData || {});
      keys.forEach(key => {
        if (hyperInfoData.bayesian && key in hyperInfoData.bayesian) {
          grouped.bayesian[key] = settingsData[key];
        } else if (hyperInfoData.scheduler && key in hyperInfoData.scheduler) {
          grouped.scheduler[key] = settingsData[key];
        } else if (hyperInfoData.experience && key in hyperInfoData.experience) {
          grouped.experience[key] = settingsData[key];
        }
      });
      
      // Ensure all hyperparameter categories have their settings, even if not in settingsData
      Object.keys(hyperInfoData).forEach(category => {
        if (hyperInfoData[category]) {
          Object.keys(hyperInfoData[category]).forEach(key => {
            if (!(key in grouped[category])) {
              // Use default value from hyperInfo if setting is missing
              grouped[category][key] = hyperInfoData[category][key].default;
            }
          });
        }
      });
    }

    return grouped;
  }, [settings, hyperInfo, defaultSettings, defaultHyperInfo]);

  // Load user settings and hyperparameter info
  useEffect(() => {
    // Only run this effect once
    if (initialized) return;
    
    const loadSettingsData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Initialize with defaults first to ensure we have something to work with
        setHyperInfo(defaultHyperInfo);
        
        let hyperInfoLoaded = false;
        let settingsLoaded = false;
        
        // Get hyperparameter info (descriptions, ranges, etc.)
        try {
          const infoResponse = await axios.get(`${API}/hyperparameters/info`);
          if (infoResponse.data && infoResponse.data.hyperparameters) {
            setHyperInfo(infoResponse.data.hyperparameters);
            hyperInfoLoaded = true;
          } else {
            console.warn('Using default hyperparameter info due to invalid response format');
          }
        } catch (infoError) {
          console.error('Error loading hyperparameter info:', infoError);
        }
        
        // Get current user settings
        try {
          const settingsResponse = await axios.get(`${API}/users/${DEFAULT_USER}/settings`);
          if (settingsResponse.data && settingsResponse.data.settings) {
            setSettings(settingsResponse.data.settings);
            settingsLoaded = true;
          } else {
            console.warn('Using default settings due to invalid response format');
            setSettings(defaultSettings);
          }
        } catch (settingsError) {
          console.error('Error loading user settings:', settingsError);
          setSettings(defaultSettings);
        }
        
        if (!hyperInfoLoaded) {
          setHyperInfo(defaultHyperInfo);
        }
        
        if (!settingsLoaded) {
          setSettings(defaultSettings);
        }
        
      } catch (error) {
        console.error('Error in loadSettingsData:', error);
        setError('Failed to load some settings from the server. Using default values.');
        // Make sure we still have defaults if loading failed
        if (!hyperInfo) setHyperInfo(defaultHyperInfo);
        if (!settings) setSettings(defaultSettings);
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    };

    loadSettingsData();
  }, [defaultHyperInfo, defaultSettings, initialized]);

  // Handle saving settings
  const handleSaveSettings = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Use settings data or fallback to defaults
      const settingsData = settings || defaultSettings;
      
      if (!settingsData) {
        throw new Error('No settings data available to save');
      }
      
      const response = await axios.put(`${API}/users/${DEFAULT_USER}/settings`, settingsData);
      if (response.data && response.data.success) {
        setSuccess('Settings saved successfully');
        
        // Update settings with the returned values if available
        if (response.data.settings) {
          setSettings(response.data.settings);
        }
        
        setTimeout(() => setSuccess(null), 3000); // Clear success message after 3 seconds
      } else {
        setError('Failed to save settings: ' + (response.data?.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setError('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Handle input change
  const handleInputChange = (category, key, value) => {
    try {
      // Create a deep copy of settings, using defaults if needed
      const newSettings = {...(settings || defaultSettings)};
      
      // Use hyperInfo or default hyperInfo
      const hyperInfoData = hyperInfo || defaultHyperInfo;
      
      // Convert to appropriate type based on hyperInfo
      if (hyperInfoData && hyperInfoData[category] && hyperInfoData[category][key]) {
        if (hyperInfoData[category][key].type === 'float') {
          newSettings[key] = parseFloat(value) || 0;
        } else if (hyperInfoData[category][key].type === 'integer') {
          newSettings[key] = parseInt(value, 10) || 0;
        } else if (hyperInfoData[category][key].type === 'boolean') {
          newSettings[key] = Boolean(value);
        } else {
          newSettings[key] = value;
        }
      } else {
        // Fallback for unknown parameters
        const numValue = parseFloat(value);
        newSettings[key] = isNaN(numValue) ? value : numValue;
      }
      
      setSettings(newSettings);
    } catch (error) {
      console.error('Error updating setting:', error);
      // Don't update settings if there's an error
    }
  };

  // Category descriptions for the menu
  const categoryDescriptions = {
    bayesian: "Controls how the system models your memory",
    scheduler: "Controls when and how cards are presented",
    experience: "Controls study sessions and user experience"
  };

  // Navigation between settings categories
  const renderCategoryNav = () => (
    <div className="settings-categories">
      <div className="category-buttons">
        <button 
          className={`category-button ${activeCategory === 'bayesian' ? 'active' : ''}`}
          onClick={() => setActiveCategory('bayesian')}
        >
          Bayesian Parameters
        </button>
        <button 
          className={`category-button ${activeCategory === 'scheduler' ? 'active' : ''}`}
          onClick={() => setActiveCategory('scheduler')}
        >
          Scheduler Parameters
        </button>
        <button 
          className={`category-button ${activeCategory === 'experience' ? 'active' : ''}`}
          onClick={() => setActiveCategory('experience')}
        >
          Experience Parameters
        </button>
      </div>
      <p className="category-description">
        {categoryDescriptions[activeCategory] || "Adjust your flashcard system settings"}
      </p>
    </div>
  );

  // Render settings for the current active category
  const renderCategorySettings = () => {
    if (!hyperInfo || !settings || !activeCategory || !hyperInfo[activeCategory]) {
      return <p>No settings available for this category</p>;
    }

    return (
      <div className="settings-section">
        <h3>{activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1)} Parameters</h3>
        
        {Object.keys(hyperInfo[activeCategory]).map(key => {
          const info = hyperInfo[activeCategory][key];
          const currentValue = settings && key in settings ? settings[key] : info.default;
          
          return (
            <div className="setting-item" key={key} title={info.description}>
              <label htmlFor={key}>{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</label>
              <div className="setting-controls">
                {info.type === 'boolean' ? (
                  <div className="checkbox-control">
                    <input
                      type="checkbox"
                      id={key}
                      checked={Boolean(currentValue)}
                      onChange={(e) => handleInputChange(activeCategory, key, e.target.checked)}
                    />
                    <span className="setting-value">{currentValue ? 'Enabled' : 'Disabled'}</span>
                  </div>
                ) : (
                  <>
                    <input
                      type={info.type === 'integer' ? 'number' : 'range'}
                      id={key}
                      value={currentValue}
                      onChange={(e) => handleInputChange(activeCategory, key, e.target.value)}
                      min={info.min}
                      max={info.max}
                      step={info.type === 'float' ? 0.01 : 1}
                    />
                    <span className="setting-value">{currentValue}</span>
                  </>
                )}
              </div>
              <p className="setting-description">{info.description}</p>
            </div>
          );
        })}
      </div>
    );
  };

  // Render loading state
  if (loading) {
    return (
      <div className="settings-container loading">
        <h2>Loading Settings...</h2>
        <div className="spinner"></div>
      </div>
    );
  }

  // Render error state
  if (error && !settings && !hyperInfo) {
    return (
      <div className="settings-container error">
        <h2>Error Loading Settings</h2>
        <p className="error-message">{error}</p>
        <button onClick={() => {
          setInitialized(false);
          setLoading(true);
        }} className="retry-button">
          Retry
        </button>
      </div>
    );
  }

  // Render settings form - only if we have settings and hyperInfo (or defaults)
  if (!settings || !hyperInfo) {
    return (
      <div className="settings-container loading">
        <h2>Preparing Settings...</h2>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="settings-container">
      <h2>Flashcard System Settings</h2>
      <p className="settings-description">
        These settings control how the Bayesian flashcard system schedules and optimizes your learning.
        Select a category below to adjust its settings.
      </p>
      
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      
      {renderCategoryNav()}
      
      <div className="settings-grid">
        {renderCategorySettings()}
      </div>
      
      <div className="settings-actions">
        <button 
          onClick={handleSaveSettings} 
          className="save-settings-button"
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
        <button 
          onClick={() => {
            setSettings(defaultSettings);
            setError(null);
            setSuccess('Reset to default values. Click Save to apply.');
          }} 
          className="reset-button"
        >
          Reset to Defaults
        </button>
      </div>
    </div>
  );
};

export default Settings;
