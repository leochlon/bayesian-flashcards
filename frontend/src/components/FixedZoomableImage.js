import React, { useState, useRef } from 'react';

const FixedZoomableImage = ({ src, alt, className, onLoad, onError }) => {
  console.log('=== FixedZoomableImage component rendering ===');
  console.log('FixedZoomableImage props:', { src, alt, className });
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const imgElementRef = useRef(null);
  
  // SIMPLIFIED: Direct image loading with DOM events
  const handleImageLoad = () => {
    console.log('FixedZoomableImage: Image loaded successfully via DOM');
    setImageLoaded(true);
    setImageError(false);
    setIsLoading(false);
    if (onLoad) {
      onLoad();
    }
  };

  const handleImageError = (error) => {
    console.error('FixedZoomableImage: Image failed to load via DOM:', error);
    setImageError(true);
    setImageLoaded(false);
    setIsLoading(false);
    if (onError) {
      onError(error);
    }
  };

  const handleManualRetry = () => {
    console.log('FixedZoomableImage: Manual retry requested');
    setImageError(false);
    setImageLoaded(false);
    setIsLoading(true);
    
    // Force reload by changing the src slightly
    const cacheBuster = Date.now();
    const newSrc = src.includes('?')
      ? `${src}&retry=${cacheBuster}`
      : `${src}?retry=${cacheBuster}`;
    
    if (imgElementRef.current) {
      imgElementRef.current.src = newSrc;
    }
  };

  // Start loading when src is available
  if (!src) {
    return (
      <div className="zoomable-image-container">
        <div className="loading-message">
          <p>No image source provided</p>
        </div>
      </div>
    );
  }

  return (
    <div className="zoomable-image-container">
      {console.log('FixedZoomableImage: Rendering with state:', { imageLoaded, imageError, isLoading, src })}
      
      {/* SIMPLIFIED: Show loading while image loads */}
      {isLoading && !imageLoaded && !imageError && (
        <div className="loading-message">
          <p>Loading statistics...</p>
          <div className="loader-spinner"></div>
          <p className="debug-info">URL: {src}</p>
        </div>
      )}
      
      {/* SIMPLIFIED: Show error state with retry option */}
      {imageError && (
        <div className="error-message">
          <p>Failed to load statistics image.</p>
          <div className="debug-actions">
            <button onClick={handleManualRetry}>
              Retry Loading
            </button>
            <button onClick={() => {
              window.open(src, '_blank');
              console.log('FixedZoomableImage: Opening image in new tab:', src);
            }}>
              Open in New Tab
            </button>
          </div>
          <p className="debug-info">URL: {src}</p>
        </div>
      )}
      
      {/* SIMPLIFIED: Always render the image, let DOM handle loading */}
      <img
        ref={imgElementRef}
        src={src}
        alt={alt}
        className={`${className} ${imageLoaded ? 'visible' : 'hidden'}`}
        onClick={() => imageLoaded && setIsModalOpen(true)}
        style={{
          cursor: imageLoaded ? 'pointer' : 'default',
          opacity: imageLoaded ? 1 : 0,
          display: imageError ? 'none' : 'block'
        }}
        onLoad={handleImageLoad}
        onError={handleImageError}
      />
      
      {/* Modal for enlarged view */}
      {isModalOpen && imageLoaded && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content">
            <img
              src={src}
              alt={alt}
              className="fullsize-image"
            />
            <button
              className="modal-close-button"
              onClick={() => setIsModalOpen(false)}
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FixedZoomableImage;