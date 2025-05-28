import '../styles/components/image-drop-zone.css';
import React, { useState, useCallback } from 'react';

const ImageDropZone = ({ 
  onImageDrop, 
  image, // <-- add image prop
  onRemove, // <-- add onRemove prop
  children,
  className = "image-drop-zone",
  accept = "image/*"
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length > 0 && onImageDrop) {
      onImageDrop(imageFiles[0]);
    }
  }, [onImageDrop]);

  const handleFileInput = useCallback((e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/') && onImageDrop) {
      onImageDrop(file);
    }
  }, [onImageDrop]);

  const fileInputId = `image-file-input-${Math.random().toString(36).substr(2, 9)}`;

  const handleZoneClick = (e) => {
    // Only trigger if the click is directly on the drop zone, not on the label or input
    if (e.target === e.currentTarget) {
      document.getElementById(fileInputId)?.click();
    }
  };

  return (
    <div 
      className={`${className} ${isDragOver ? 'drag-over' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleZoneClick}
      style={{ cursor: 'pointer' }}
    >
      {/* Show image preview if image is provided */}
      {image && (
        <div className="image-preview-container">
          <img src={image} alt="Preview" className="image-preview" />
          {onRemove && (
            <button className="remove-image-button" onClick={e => { e.stopPropagation(); onRemove(); }}>Remove</button>
          )}
        </div>
      )}
      {children}
      <label
        htmlFor={fileInputId}
        className="file-input-label"
        style={{ width: '100%', display: 'block', cursor: 'pointer' }}
        onClick={e => e.stopPropagation()} // Prevent label click from bubbling
      >
        <input 
          type="file" 
          accept={accept}
          onChange={handleFileInput}
          style={{ display: 'none' }}
          id={fileInputId}
          onClick={e => e.stopPropagation()} // Prevent input click from bubbling
        />
        Drop image here or click to browse
      </label>
    </div>
  );
};

export default ImageDropZone;