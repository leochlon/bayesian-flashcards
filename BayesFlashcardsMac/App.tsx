/**
 * Bayes Flashcards for macOS
 * Clean implementation with promise-based API calls
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput
} from 'react-native';
import WebView from 'react-native-webview';
import axios from 'axios';

// Configuration
const API_URL = 'http://127.0.0.1:5002/api';
const WEB_APP_URL = 'http://localhost:3002';
const DEFAULT_USER = 'default';

// Types
type NavTab = 'study' | 'stats' | 'manage';
type StatsType = 'user' | 'deck' | 'session';
type ManageTab = 'cards' | 'sessions';

// Main App Component
const App = () => {
  const [currentTab, setCurrentTab] = useState<NavTab>('study');
  const [webViewLoading, setWebViewLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statsType, setStatsType] = useState<StatsType>('user');
  const [manageTab, setManageTab] = useState<ManageTab>('cards');
  const [selectedDeck, setSelectedDeck] = useState<any>(null);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [decks, setDecks] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newDeckName, setNewDeckName] = useState('');
  
  // WebView reference
  const webViewRef = useRef<WebView | null>(null);

  // Fetch decks from the API
  const fetchDecks = () => {
    setIsLoading(true);
    fetch(`${API_URL}/decks`)
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to fetch decks');
        }
        return response.json();
      })
      .then(data => {
        setDecks(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Error fetching decks:', err);
        setError('Failed to load decks. Make sure the backend is running.');
        setIsLoading(false);
      });
  };

  // Fetch sessions from the API
  const fetchSessions = () => {
    setIsLoading(true);
    fetch(`${API_URL}/sessions?user=${DEFAULT_USER}`)
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to fetch sessions');
        }
        return response.json();
      })
      .then(data => {
        setSessions(data);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Error fetching sessions:', err);
        setError('Failed to load sessions. Make sure the backend is running.');
        setIsLoading(false);
      });
  };

  
  // Create a new deck - fixed to match backend expectations
  const createNewDeck = () => {
    if (!newDeckName.trim()) {
      setError("Please enter a deck name");
      return;
    }
    
    setIsLoading(true);
    console.log(`Creating new deck: ${newDeckName}`);
    
    // Send with the exact parameter name the backend expects: 'deck'
    fetch(`${API_URL}/decks`, {
      method: 'POST',
      headers: { 
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        deck: newDeckName
      })
    })
    .then(response => {
      if (!response.ok) {
        return response.json().then(errorData => {
          throw new Error(errorData.error || 'Failed to create deck');
        });
      }
      return response.json();
    })
    .then(data => {
      console.log('Deck created successfully:', data);
      fetchDecks(); // Refresh decks list
      setNewDeckName("");
      setIsLoading(false);
      
      // Show success message
      setError(`Deck "${newDeckName}" created successfully!`);
      setTimeout(() => setError(null), 3000);
    })
    .catch(err => {
      console.error("Error creating deck:", err.message);
      setError(`Failed to create deck: ${err.message}`);
      setIsLoading(false);
    });
  };

  // Navigate to add card page
  const navigateToAddCard = (deck: string) => {
    console.log(`Navigating to add card page for deck: ${deck}`);
    if (!deck) {
      setError('Please select a deck first');
      return;
    }
    
    // First switch to study tab
    setCurrentTab('study');
    
    // Wait for the WebView to be ready and then navigate
    setTimeout(() => {
      if (webViewRef.current) {
        // Updated approach: use postMessage to communicate with the web app
        const script = `
          window.postMessage(
            JSON.stringify({
              type: 'OPEN_ADD_CARD',
              deck: '${deck.replace(/'/g, "\\'")}' 
            }),
            '*'
          );
          
          // Also set the view directly in case postMessage isn't handled
          if (window.setView && window.setCurrentDeck) {
            window.setView('add');
            window.setCurrentDeck('${deck.replace(/'/g, "\\'")}');
          } else {
            // Fallback: Try to navigate and set global variables
            window.currentDeck = '${deck.replace(/'/g, "\\'")}';
            window.initialView = 'add';
          }
          true;
        `;
        webViewRef.current.injectJavaScript(script);
        console.log('Injected script to navigate to add card page');
      } else {
        console.error('WebView reference is null');
        setError('Failed to navigate. Try restarting the app.');
      }
    }, 500); // Give WebView time to initialize
  };

  // Navigate to a specific page in the WebView
  const navigateWebView = (path: string) => {
    console.log(`Navigating WebView to: ${path}`);
    const script = `window.location.href = '${path}';`;
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(script);
    } else {
      console.error('WebView reference is null');
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    fetchDecks();
    fetchSessions();
  }, []);

  // Main render function
  return (
    <SafeAreaView style={styles.safeArea}>
      {currentTab === 'study' && (
        <View style={styles.webViewContainer}>
          {webViewLoading && (
            <View style={styles.loadingWebViewContainer}>
              <ActivityIndicator size="large" color="#3498db" />
              <Text style={{ color: 'white', marginTop: 10 }}>Loading Web Version...</Text>
            </View>
          )}
          <WebView
            ref={webViewRef}
            source={{ uri: WEB_APP_URL }}
            style={styles.webView}
            onLoadStart={() => {
              console.log('WebView loading started');
              setWebViewLoading(true);
            }}
            onLoadEnd={() => {
              console.log('WebView loading completed');
              setWebViewLoading(false);
            }}
            onError={(e) => {
              console.error('WebView error:', e.nativeEvent);
              setError('Failed to load web version. Make sure the web frontend is running on port 3002.');
              setWebViewLoading(false);
            }}
            originWhitelist={['*']}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            scalesPageToFit={true}
            onMessage={(event) => {
              console.log('Message from WebView:', event.nativeEvent.data);
            }}
          />
        </View>
      )}

      {currentTab === 'stats' && (
        <View style={styles.contentContainer}>
          <Text style={styles.sectionTitle}>Statistics</Text>
          
          <View style={styles.statsTypeContainer}>
            <TouchableOpacity 
              style={[styles.statsTypeButton, statsType === 'user' && styles.activeStatsTypeButton]}
              onPress={() => {
                setStatsType('user');
                setSelectedDeck(null);
                setSelectedSession(null);
              }}
            >
              <Text style={styles.statsTypeText}>User Stats</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.statsTypeButton, statsType === 'deck' && styles.activeStatsTypeButton]}
              onPress={() => {
                setStatsType('deck');
                setSelectedSession(null);
              }}
            >
              <Text style={styles.statsTypeText}>Deck Stats</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.statsTypeButton, statsType === 'session' && styles.activeStatsTypeButton]}
              onPress={() => {
                setStatsType('session');
                setSelectedDeck(null);
              }}
            >
              <Text style={styles.statsTypeText}>Session Stats</Text>
            </TouchableOpacity>
          </View>
          
          {statsType === 'deck' && (
            <View style={styles.deckSelectorContainer}>
              <Text style={styles.selectorLabel}>Select Deck:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.deckList}>
                {decks.map(deck => (
                  <TouchableOpacity
                    key={deck}
                    style={[styles.deckButton, selectedDeck === deck && styles.activeDeckButton]}
                    onPress={() => setSelectedDeck(deck)}
                  >
                    <Text style={styles.deckButtonText}>{deck}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
          
          {statsType === 'session' && (
            <View style={styles.sessionSelectorContainer}>
              <Text style={styles.selectorLabel}>Select Session:</Text>
              {sessions.length === 0 ? (
                <Text style={styles.noItemsText}>No sessions available</Text>
              ) : (
                <ScrollView style={styles.sessionsList}>
                  {sessions.map(session => (
                    <TouchableOpacity
                      key={session.id}
                      style={[styles.sessionItem, selectedSession === session.id && styles.activeSessionItem]}
                      onPress={() => setSelectedSession(session.id)}
                    >
                      <Text style={styles.sessionName}>{session.name}</Text>
                      <Text style={styles.sessionDate}>
                        {new Date(session.start_time).toLocaleDateString()}
                      </Text>
                      <Text style={styles.sessionStats}>
                        Duration: {Math.round(session.duration)} min | 
                        Cards: {session.cards_studied} | 
                        Success: {Math.round(session.success_rate * 100)}%
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          )}
          
          <View style={styles.statsWebViewContainer}>
            <WebView
              source={{ 
                uri: statsType === 'user'
                  ? `${API_URL}/stats/user?user=${DEFAULT_USER}&t=${Date.now()}`
                  : statsType === 'deck' && selectedDeck
                  ? `${API_URL}/stats/deck?user=${DEFAULT_USER}&deck=${selectedDeck}&t=${Date.now()}`
                  : statsType === 'session' && selectedSession
                  ? `${API_URL}/stats/session?session_id=${selectedSession}&t=${Date.now()}`
                  : `${API_URL}/stats/user?user=${DEFAULT_USER}&t=${Date.now()}`
              }}
              style={styles.statsWebView}
              onError={(e) => {
                console.error('Stats WebView error:', e.nativeEvent);
                setError('Failed to load statistics. Make sure the backend is running.');
              }}
            />
          </View>
        </View>
      )}

      {currentTab === 'manage' && (
        <View style={styles.contentContainer}>
          <Text style={styles.sectionTitle}>Manage</Text>
          
          <View style={styles.addDeckContainer}>
            <TextInput
              style={styles.addDeckInput}
              placeholder="Enter new deck name"
              placeholderTextColor="#999"
              value={newDeckName}
              onChangeText={setNewDeckName}
            />
            <TouchableOpacity 
              style={styles.addDeckButton}
              onPress={createNewDeck}
            >
              <Text style={styles.addDeckButtonText}>+ Create Deck</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.manageTabsContainer}>
            <TouchableOpacity 
              style={[styles.manageTab, manageTab === 'cards' && styles.activeManageTab]}
              onPress={() => setManageTab('cards')}
            >
              <Text style={styles.manageTabText}>Cards</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.manageTab, manageTab === 'sessions' && styles.activeManageTab]}
              onPress={() => setManageTab('sessions')}
            >
              <Text style={styles.manageTabText}>Sessions</Text>
            </TouchableOpacity>
          </View>
          
          {manageTab === 'cards' ? (
            <View style={styles.deckSelectorContainer}>
              <Text style={styles.selectorLabel}>Select Deck:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.deckList}>
                {decks.map(deck => (
                  <TouchableOpacity
                    key={deck}
                    style={[styles.deckButton, selectedDeck === deck && styles.activeDeckButton]}
                    onPress={() => setSelectedDeck(deck)}
                  >
                    <Text style={styles.deckButtonText}>{deck}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              
              {selectedDeck && (
                <View>
                  <View style={styles.deckActionsContainer}>
                    <TouchableOpacity 
                      style={styles.addCardButton}
                      onPress={() => navigateToAddCard(selectedDeck)}
                    >
                      <Text style={styles.addCardButtonText}>+ Add Cards</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.sessionsContainer}>
              <Text style={styles.selectorLabel}>Sessions:</Text>
              {sessions.length === 0 ? (
                <Text style={styles.noItemsText}>No sessions available</Text>
              ) : (
                <ScrollView style={styles.sessionsList}>
                  {sessions.map(session => (
                    <View key={session.id} style={styles.sessionItem}>
                      <View style={styles.sessionInfo}>
                        <Text style={styles.sessionName}>{session.name}</Text>
                        <Text style={styles.sessionDate}>
                          {new Date(session.start_time).toLocaleDateString()}
                        </Text>
                        <Text style={styles.sessionStats}>
                          Duration: {Math.round(session.duration)} min | 
                          Cards: {session.cards_studied} | 
                          Success: {Math.round(session.success_rate * 100)}%
                        </Text>
                      </View>
                      <View style={styles.sessionActions}>
                        <TouchableOpacity 
                          style={styles.sessionViewButton}
                          onPress={() => {
                            setSelectedSession(session.id);
                            setStatsType('session');
                            setCurrentTab('stats');
                          }}
                        >
                          <Text style={styles.sessionButtonText}>View Stats</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>
          )}
        </View>
      )}

      {/* Error popup */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => setError(null)}>
            <Text style={styles.errorDismiss}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Loading indicator */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>Bayesian Flashcards by Leon Chlon</Text>
      </View>
    </SafeAreaView>
  );
};
// Styles
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#2f2f31',
  },
  contentContainer: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: 'white',
  },
  statsTypeContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  statsTypeButton: {
    backgroundColor: '#373737',
    padding: 10,
    borderRadius: 5,
    marginRight: 10,
    minWidth: 100,
    alignItems: 'center',
  },
  activeStatsTypeButton: {
    backgroundColor: '#3498db',
  },
  statsTypeText: {
    color: 'white',
    fontWeight: '500',
  },
  addDeckContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'center',
  },
  addDeckInput: {
    flex: 1,
    backgroundColor: '#373737',
    borderRadius: 5,
    padding: 10,
    marginRight: 10,
    color: 'white',
  },
  addDeckButton: {
    backgroundColor: '#27ae60',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  addDeckButtonText: {
    color: 'white',
    fontWeight: '500',
  },
  deckActionsContainer: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  addCardButton: {
    backgroundColor: '#e67e22',
    padding: 8,
    borderRadius: 5,
    minWidth: 120,
    alignItems: 'center',
  },
  addCardButtonText: {
    color: 'white',
    fontWeight: '500',
  },
  deckSelectorContainer: {
    marginBottom: 20,
  },
  sessionSelectorContainer: {
    marginBottom: 20,
  },
  selectorLabel: {
    fontSize: 16,
    color: 'white',
    marginBottom: 10,
  },
  deckList: {
    marginBottom: 15,
  },
  deckButton: {
    backgroundColor: '#373737',
    padding: 10,
    borderRadius: 5,
    marginRight: 10,
    minWidth: 100,
    alignItems: 'center',
  },
  activeDeckButton: {
    backgroundColor: '#3498db',
  },
  deckButtonText: {
    color: 'white',
  },
  sessionsList: {
    maxHeight: 200,
  },
  sessionItem: {
    backgroundColor: '#373737',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  activeSessionItem: {
    borderColor: '#3498db',
    borderWidth: 2,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 5,
  },
  sessionDate: {
    fontSize: 14,
    color: '#bbb',
    marginBottom: 5,
  },
  sessionStats: {
    fontSize: 14,
    color: '#bbb',
  },
  sessionActions: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  sessionViewButton: {
    backgroundColor: '#3498db',
    padding: 8,
    borderRadius: 5,
    alignItems: 'center',
    minWidth: 100,
  },
  sessionButtonText: {
    color: 'white',
    fontWeight: '500',
  },
  statsWebViewContainer: {
    flex: 1,
    backgroundColor: '#373737',
    borderRadius: 8,
    overflow: 'hidden',
  },
  statsWebView: {
    flex: 1,
  },
  manageTabsContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  manageTab: {
    backgroundColor: '#373737',
    padding: 10,
    borderRadius: 5,
    marginRight: 10,
    minWidth: 100,
    alignItems: 'center',
  },
  activeManageTab: {
    backgroundColor: '#3498db',
  },
  manageTabText: {
    color: 'white',
    fontWeight: '500',
  },
  manageCardsWebViewContainer: {
    flex: 1,
    backgroundColor: '#373737',
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 15,
    height: 500,
  },
  manageCardsWebView: {
    flex: 1,
  },
  sessionsContainer: {
    flex: 1,
  },
  noItemsText: {
    color: '#bbb',
    fontSize: 16,
    fontStyle: 'italic',
    marginTop: 10,
  },
  webViewContainer: {
    flex: 1,
    backgroundColor: '#2f2f31',
  },
  webView: {
    flex: 1,
  },
  loadingWebViewContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2f2f31',
    zIndex: 100,
  },
  errorContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(231, 76, 60, 0.8)',
    padding: 10,
    borderRadius: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    color: 'white',
  },
  errorDismiss: {
    color: 'white',
    fontWeight: 'bold',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  loadingText: {
    backgroundColor: '#373737',
    padding: 15,
    borderRadius: 8,
    fontSize: 16,
    color: 'white',
    marginTop: 10,
  },
  footer: {
    padding: 10,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#444',
  },
  footerText: {
    color: '#999',
    fontSize: 12,
  },
});
export default App;
