import React, { useState } from 'react';
import ReactQuill from 'react-quill';
import "react-quill/dist/quill.snow.css";
import axios from 'axios';
import '../../styles/views/editor.css';

// Import components
import ImageDropZone from '../ImageDropZone';

// Import config
import { API } from '../../api';
import { modules, formats } from '../../config/reactQuillConfig';

const AddCardView = ({
  currentDeck,
  setCurrentDeck,
  decks,
  navigateTo,
  editingCard
}) => {
  // State for the editor
  const [front, setFront] = useState(editingCard?.front || "");
  const [back, setBack] = useState(editingCard?.back || "");
  const [frontImage, setFrontImage] = useState(editingCard?.frontImage || null);
  const [backImage, setBackImage] = useState(editingCard?.backImage || null);
  const [cardType, setCardType] = useState(editingCard?.type || "Basic");

  // Handle card addition
  const handleAddCard = async () => {
    if (!currentDeck) {
      alert("Please select a deck first");
      return;
    }

    try {
      await axios.post(`${API}/cards/${currentDeck}`, {
        front,
        back,
        frontImage,
        backImage,
        type: cardType
      });

      // Clear form
      setFront("");
      setBack("");
      setFrontImage(null);
      setBackImage(null);
      setCardType("Basic");

      // Reload cards
      const response = await axios.get(`${API}/cards/${currentDeck}`);
      if (response.data) {
        // Navigate back to manage view after success
        navigateTo('manage');
      }
    } catch (error) {
      console.error("Error adding card:", error);
      alert("Failed to add card. Please try again.");
    }
  };

  // Handle card update
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
      
      // Clear form
      setFront("");
      setBack("");
      setFrontImage(null);
      setBackImage(null);
      setCardType("Basic");
      
      // Return to manage view
      navigateTo('manage');
    } catch (error) {
      console.error("Error updating card:", error);
      alert("Failed to update card. Please try again.");
    }
  };

  // Create a unique ID for the toolbar
  const toolbarId = "card-editor-toolbar";

  // Toolbar options
  const toolbarOptions = [
    [{ 'header': [1, 2, false] }],
    ['bold', 'italic', 'underline'],
    ['link'],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }]
  ];

  return (
    <div className="card-editor">
      <div className="editor-header">
        <select 
          value={currentDeck || ''} 
          onChange={(e) => setCurrentDeck(e.target.value)}
          className="deck-selector"
        >
          <option value="">Select a deck</option>
          {decks.map(deck => {
            const deckName = typeof deck === 'object' ? deck.name : deck;
            return (
              <option key={deckName} value={deckName}>{deckName}</option>
            );
          })}
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
                // Clear form and return to manage view
                setFront("");
                setBack("");
                setFrontImage(null);
                setBackImage(null);
                setCardType("Basic");
                navigateTo('manage');
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
  );
};

export default AddCardView;