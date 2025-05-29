import React, { useState, useEffect, useRef } from 'react';
import ReactQuill from 'react-quill';
import "react-quill/dist/quill.snow.css";
import axios from 'axios';
import '../../styles/views/editor.css';

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
  const [cardType, setCardType] = useState(editingCard?.type || "Basic");

  // Refs for ReactQuill
  const frontQuillRef = useRef();
  const backQuillRef = useRef();

  // Stable drop handlers for each editor
  const handleFrontDrop = React.useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      insertImageToQuill(frontQuillRef, file);
    }
  }, []);
  const handleBackDrop = React.useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      insertImageToQuill(backQuillRef, file);
    }
  }, []);

  // Utility to convert File to base64 string and insert into Quill
  const insertImageToQuill = (quillRef, file) => {
    const reader = new window.FileReader();
    reader.onload = (e) => {
      const quill = quillRef.current.getEditor();
      const range = quill.getSelection(true);
      quill.insertEmbed(range ? range.index : 0, 'image', e.target.result, 'user');
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    const addDropListener = (quillRef, handler) => {
      const editor = quillRef.current && quillRef.current.getEditor && quillRef.current.getEditor();
      if (editor) {
        const editorElem = editor.root;
        if (editorElem) {
          editorElem.addEventListener('drop', handler);
          editorElem.addEventListener('dragover', (e) => { e.preventDefault(); });
        }
      }
    };
    const removeDropListener = (quillRef, handler) => {
      const editor = quillRef.current && quillRef.current.getEditor && quillRef.current.getEditor();
      if (editor) {
        const editorElem = editor.root;
        if (editorElem) {
          editorElem.removeEventListener('drop', handler);
          // dragover is anonymous, so can't remove, but it's harmless
        }
      }
    };
    addDropListener(frontQuillRef, handleFrontDrop);
    addDropListener(backQuillRef, handleBackDrop);
    return () => {
      removeDropListener(frontQuillRef, handleFrontDrop);
      removeDropListener(backQuillRef, handleBackDrop);
    };
  }, [handleFrontDrop, handleBackDrop]);

  // Handle card addition
  const handleAddCard = async () => {
    if (!currentDeck) {
      alert("Please select a deck first");
      return;
    }

    try {
      await axios.post(`${API}/cards/${encodeURIComponent(currentDeck)}`, {
        front,
        back,
        type: cardType
      });

      // Clear form
      setFront("");
      setBack("");
      setCardType("Basic");

      // Reload cards
      const response = await axios.get(`${API}/cards/${encodeURIComponent(currentDeck)}`);
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
      await axios.put(`${API}/cards/${encodeURIComponent(currentDeck)}/${editingCard.id}`, {
        front,
        back,
        type: cardType
      });
      
      // Clear form
      setFront("");
      setBack("");
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
        {/* Render toolbar HTML for Quill to use */}
        <div id={toolbarId} className="toolbar-only">
          <span className="ql-formats">
            <select className="ql-header" defaultValue="">
              <option value="1"></option>
              <option value="2"></option>
              <option value=""></option>
            </select>
          </span>
          <span className="ql-formats">
            <button className="ql-bold"></button>
            <button className="ql-italic"></button>
            <button className="ql-underline"></button>
          </span>
          <span className="ql-formats">
            <button className="ql-link"></button>
          </span>
          <span className="ql-formats">
            <button className="ql-list" value="ordered"></button>
            <button className="ql-list" value="bullet"></button>
          </span>
          <span className="ql-formats">
            <button className="ql-image"></button>
          </span>
        </div>
      </div>

      <div className="card-side">
        <h3 className="card-side-label">Front</h3>
        <div className="editor-field quill-wrapper">
          <ReactQuill 
            ref={frontQuillRef}
            value={front} 
            onChange={setFront}
            modules={{ toolbar: { container: `#${toolbarId}` } }}
            formats={formats}
          />
        </div>
      </div>

      <div className="card-side">
        <h3 className="card-side-label">Back</h3>
        <div className="editor-field quill-wrapper">
          <ReactQuill 
            ref={backQuillRef}
            value={back} 
            onChange={setBack}
            modules={{ toolbar: { container: `#${toolbarId}` } }}
            formats={formats}
          />
        </div>
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