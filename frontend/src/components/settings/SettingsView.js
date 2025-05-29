import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { fetchUserSettings, API, DEFAULT_USER } from '../../api';

const SettingsView = ({ onSettingsSaved }) => {
  console.log('SettingsView: onSettingsSaved prop received:', typeof onSettingsSaved, onSettingsSaved);
  
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
    prior_alpha: 1.0,
    prior_beta: 1.0,
    global_decay: 0.03,
    target_recall: 0.7,
    n_samples: 3000,
    history_window: 5,
    backlog_limit: 50,
    max_reviews_per_card: 2,
    new_cards_per_session: 3,
    mature_cards_per_session: 5,
    pomodoro_length: 25,
    break_length: 5,
    easy_mode: false,
    view_size: 'normal'
  }), []);

  // Default hyperparameter info to use if API fails
  const defaultHyperInfo = useMemo(() => ({
    bayesian: {
      prior_alpha: { label: "Prior Alpha", description: "Alpha parameter for the Beta prior.", min: 0.1, max: 10, step: 0.1 },
      prior_beta: { label: "Prior Beta", description: "Beta parameter for the Beta prior.", min: 0.1, max: 10, step: 0.1 },
      global_decay: { label: "Global Decay", description: "Decay rate for memory.", min: 0.01, max: 0.2, step: 0.01 },
      target_recall: { label: "Target Recall", description: "Target recall probability.", min: 0.5, max: 0.99, step: 0.01 },
      n_samples: { label: "Samples", description: "Number of samples for estimation.", min: 100, max: 10000, step: 100 },
      history_window: { label: "History Window", description: "Number of past reviews to consider.", min: 1, max: 20, step: 1 }
    },
    scheduler: {
      backlog_limit: { label: "Backlog Limit", description: "Max backlog cards.", min: 10, max: 200, step: 1 },
      max_reviews_per_card: { label: "Max Reviews/Card", description: "Max reviews per card per session.", min: 1, max: 10, step: 1 },
      new_cards_per_session: { label: "New Cards/Session", description: "New cards introduced per session.", min: 1, max: 20, step: 1 },
      mature_cards_per_session: { label: "Mature Cards/Session", description: "Mature cards per session.", min: 1, max: 50, step: 1 }
    },
    experience: {
      pomodoro_length: { label: "Pomodoro Length", description: "Pomodoro timer length (minutes).", min: 5, max: 60, step: 1 },
      break_length: { label: "Break Length", description: "Break timer length (minutes).", min: 1, max: 30, step: 1 },
      easy_mode: { label: "Easy Mode", description: "Enable easy mode for reviews.", type: "boolean" },
      view_size: { 
        label: "View Size", 
        description: "Controls the overall size of text and UI components.", 
        type: "select",
        options: [
          { value: "compact", label: "Compact" },
          { value: "normal", label: "Normal" },
          { value: "large", label: "Large" }
        ]
      }
    }
  }), []);

  // Helper to group settings by category
  const groupedSettings = useMemo(() => {
    const settingsData = settings || defaultSettings;
    const hyperInfoData = hyperInfo || defaultHyperInfo;
    const grouped = {};
    Object.keys(hyperInfoData).forEach(category => {
      grouped[category] = {};
      Object.keys(hyperInfoData[category]).forEach(key => {
        grouped[category][key] = {
          ...hyperInfoData[category][key],
          value: settingsData[key]
        };
      });
    });
    return grouped;
  }, [settings, hyperInfo, defaultSettings, defaultHyperInfo]);

  // Load user settings and hyperparameter info
  useEffect(() => {
    if (initialized) return;
    const loadSettingsData = async () => {
      setLoading(true);
      setError(null);
      try {
        const userSettings = await fetchUserSettings();
        setSettings(userSettings);
        // Simulate fetching hyperInfo from backend if needed
        setHyperInfo(defaultHyperInfo);
        setInitialized(true);
      } catch (err) {
        setError('Failed to load settings.');
      } finally {
        setLoading(false);
      }
    };
    loadSettingsData();
  }, [defaultHyperInfo, initialized]);

  // Apply view size setting to CSS variables
  useEffect(() => {
    if (settings && settings.view_size) {
      const applySizeMultiplier = (size) => {
        const multipliers = {
          compact: 0.85,
          normal: 1.0,
          large: 1.15
        };
        
        const multiplier = multipliers[size] || 1.0;
        document.documentElement.style.setProperty('--size-multiplier', multiplier);
        
        // Apply to all CSS variables that should scale
        const scalableProperties = [
          '--font-xs', '--font-sm', '--font-md', '--font-lg', '--font-xl', '--font-xxl',
          '--spacing-xs', '--spacing-sm', '--spacing-md', '--spacing-lg', '--spacing-xl',
          '--border-radius', '--border-radius-small'
        ];
        
        // Base values for mobile
        const baseValues = {
          '--font-xs': 14,
          '--font-sm': 16,
          '--font-md': 18,
          '--font-lg': 20,
          '--font-xl': 22,
          '--font-xxl': 26,
          '--spacing-xs': 1,
          '--spacing-sm': 2,
          '--spacing-md': 4,
          '--spacing-lg': 6,
          '--spacing-xl': 8,
          '--border-radius': 24,
          '--border-radius-small': 12
        };
        
        // Base values for desktop (768px+)
        const desktopValues = {
          '--font-xs': 16,
          '--font-sm': 18,
          '--font-md': 20,
          '--font-lg': 22,
          '--font-xl': 26,
          '--font-xxl': 30
        };
        
        // Apply scaled values
        const isDesktop = window.innerWidth >= 768;
        scalableProperties.forEach(prop => {
          const baseValue = isDesktop && desktopValues[prop] ? desktopValues[prop] : baseValues[prop];
          if (baseValue !== undefined) {
            const scaledValue = Math.round(baseValue * multiplier);
            if (prop.includes('font') || prop.includes('spacing') || prop.includes('radius')) {
              document.documentElement.style.setProperty(prop, `${scaledValue}px`);
            }
          }
        });
      };
      
      applySizeMultiplier(settings.view_size);
      
      // Listen for window resize to reapply scaling
      const handleResize = () => {
        applySizeMultiplier(settings.view_size);
      };
      
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [settings?.view_size]);

  // Handle saving settings
  const handleSaveSettings = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      // Always send a full settings object (merge with defaults)
      const settingsToSave = { ...defaultSettings, ...settings };
      await axios.put(`${API}/users/${DEFAULT_USER}/settings`, settingsToSave);
      // Reload settings from backend to ensure UI matches backend
      const updatedSettings = await fetchUserSettings();
      setSettings(updatedSettings);
      setSuccess('Settings saved!');
      // Trigger stats refresh by calling the callback
      if (onSettingsSaved) {
        console.log('SettingsView: Calling onSettingsSaved to refresh stats');
        onSettingsSaved();
      } else {
        console.log('SettingsView: onSettingsSaved function not available');
      }
    } catch (error) {
      setError('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Handle input change
  const handleInputChange = (category, key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
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
        {Object.keys(groupedSettings).map(category => (
          <button
            key={category}
            className={`category-button${activeCategory === category ? ' active' : ''}`}
            onClick={() => setActiveCategory(category)}
          >
            {category.charAt(0).toUpperCase() + category.slice(1)}
          </button>
        ))}
      </div>
      <div className="category-description">{categoryDescriptions[activeCategory]}</div>
    </div>
  );

  // Render settings for the current active category
  const renderCategorySettings = () => {
    if (!groupedSettings[activeCategory]) return null;
    return (
      <div className="settings-grid">
        <div className="settings-section">
          <h3>{activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1)} Settings</h3>
          <div className="section-description">{categoryDescriptions[activeCategory]}</div>
          {Object.entries(groupedSettings[activeCategory]).map(([key, info]) => (
            <div className="setting-item" key={key}>
              <label>{info.label || key}</label>
              <div className="setting-controls">
                {info.type === "boolean" ? (
                  <input
                    type="checkbox"
                    checked={!!settings[key]}
                    onChange={e => handleInputChange(activeCategory, key, e.target.checked)}
                  />
                ) : info.type === "select" ? (
                  <select
                    value={settings[key]}
                    onChange={e => handleInputChange(activeCategory, key, e.target.value)}
                  >
                    {info.options.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <>
                    <input
                      type="range"
                      min={info.min}
                      max={info.max}
                      step={info.step}
                      value={settings[key]}
                      onChange={e => handleInputChange(activeCategory, key, Number(e.target.value))}
                    />
                    <input
                      type="number"
                      min={info.min}
                      max={info.max}
                      step={info.step}
                      value={settings[key]}
                      onChange={e => handleInputChange(activeCategory, key, Number(e.target.value))}
                    />
                  </>
                )}
                {info.type !== "select" && <span className="setting-value">{String(settings[key])}</span>}
              </div>
              <div className="setting-description">{info.description}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render loading state
  if (loading) {
    return (
      <div className="settings-container loading">
        <div className="spinner"></div>
        <div>Loading settings...</div>
      </div>
    );
  }

  // Render error state
  if (error && !settings && !hyperInfo) {
    return (
      <div className="settings-container error">
        <div className="error-message">{error}</div>
        <button className="retry-button" onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  // Render settings form - only if we have settings and hyperInfo (or defaults)
  if (!settings || !hyperInfo) {
    return (
      <div className="settings-container loading">
        <div className="spinner"></div>
        <div>Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="settings-container">
      <h2>Settings</h2>
      <div className="settings-description">
        Adjust the parameters for the Bayesian memory model, scheduler, and user experience.
      </div>
      {renderCategoryNav()}
      {success && <div className="success-message">{success}</div>}
      {error && <div className="error-message">{error}</div>}
      {renderCategorySettings()}
      <div className="settings-actions">
        <button
          className="save-settings-button"
          onClick={handleSaveSettings}
          disabled={saving}
        >
          {saving ? "Saving..." : "Save Settings"}
        </button>
        <button
          className="reset-button"
          onClick={() => setSettings(defaultSettings)}
          disabled={saving}
        >
          Reset to Defaults
        </button>
      </div>
    </div>
  );
};

export default SettingsView;