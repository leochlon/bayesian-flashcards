import '../styles/components/image-drop-zone.css';
import React, { useState, useCallback } from 'react';

const ImageDropZone = ({ 
  onImageDrop, 
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

  return (
    <div 
      className={`${className} ${isDragOver ? 'drag-over' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {children}
      <input 
        type="file" 
        accept={accept}
        onChange={handleFileInput}
        style={{ display: 'none' }}
        id="image-file-input"
      />
      <label htmlFor="image-file-input" className="file-input-label">
        Drop image here or click to browse
      </label>
    </div>
  );
};

export default ImageDropZone;