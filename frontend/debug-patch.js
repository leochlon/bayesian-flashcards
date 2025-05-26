// Debugging patch for startStudySession in App.js
const startStudySessionWithLogging = async () => {
  try {
    const sessionName = prompt("Enter a name for this study session (or leave blank for default):");
    
    // If user clicks cancel (sessionName is null), return to decks view
    if (sessionName === null) {
      setView('decks');
      return;
    }
    
    console.log("About to make API call with data:", {
      deck: currentDeck,
      user: DEFAULT_USER,
      name: sessionName || undefined
    });
    
    const response = await axios.post(`${API}/sessions`, {
      deck: currentDeck,
      user: DEFAULT_USER,
      name: sessionName || undefined
    });
    
    console.log("API response for session creation:", response.data);
    
    if (response.data.success) {
      console.log("Session created successfully, data:", response.data.session);
      setCurrentSession(response.data.session);
      setView('review');
      resetTimer();
      await getNextCard();
      startTimer();
    } else {
      console.error("Session creation failed, response:", response.data);
      alert("Failed to create study session. Please try again.");
    }
  } catch (error) {
    console.error("Error creating study session:", error);
    if (error.response) {
      console.error("Error response:", error.response.data);
    }
    alert("Failed to create study session. Please try again.");
    setView('decks');
  }
};
