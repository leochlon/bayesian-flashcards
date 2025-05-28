import React, { useState, useEffect, useRef } from 'react';

const FixedZoomableImage = ({ src, alt, className, onLoad, onError }) => {
  console.log('=== FixedZoomableImage component rendering ===');
  console.log('FixedZoomableImage props:', { src, alt, className });
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  const retryDelay = 1000; // 1 second between retries
  const [debugInfo, setDebugInfo] = useState({ attempts: 0, lastStatus: null });
  const [imgSrc, setImgSrc] = useState(src);
  // Define timeoutId at component level so it can be used by all functions
  const timeoutIdRef = useRef(null);

  // Reset state when source changes
  useEffect(() => {
    console.log('FixedZoomableImage: src changed to:', src);
    setImageLoaded(false);
    setImageError(false);
    setRetryCount(0);
    setImgSrc(src);
    setDebugInfo({ attempts: 0, lastStatus: null });
  }, [src]);

  useEffect(() => {
    console.log('FixedZoomableImage: src changed to:', src);
    console.log('FixedZoomableImage: current state:', { imageLoaded, imageError, retryCount });
    
    if (!src) {
      console.log('FixedZoomableImage: No src provided, skipping load');
      return;
    }
    
    // Reset states when src changes
    setImageLoaded(false);
    setImageError(false);
    setRetryCount(0);
  }, [src]);

  // Separate useEffect for image loading
  useEffect(() => {
    if (!src) return;
    
    const currentSrc = imgSrc || src;
    
    const loadImage = () => {
      // Update debug info
      setDebugInfo(prev => ({ 
        attempts: prev.attempts + 1, 
        lastStatus: 'loading',
        timestamp: new Date().toISOString()
      }));
      
      // Create new image object to preload
      const img = new Image();
      
      img.onload = () => {
        console.log('FixedZoomableImage: Image loaded successfully:', currentSrc);
        console.log('FixedZoomableImage: Image dimensions:', img.width, 'x', img.height);
        setImageLoaded(true);
        setImageError(false);
        setDebugInfo(prev => ({ 
          ...prev, 
          lastStatus: 'loaded',
          dimensions: `${img.width}x${img.height}`,
          timestamp: new Date().toISOString()
        }));
        
        if (onLoad) {
          onLoad();
        }
      };
      
      img.onerror = (error) => {
        console.error('FixedZoomableImage: Image failed to load:', currentSrc);
        console.error('FixedZoomableImage: Error details:', error);
        setImageError(true);
        setImageLoaded(false);
        setDebugInfo(prev => ({ 
          ...prev, 
          lastStatus: 'error',
          error: error.toString(),
          timestamp: new Date().toISOString()
        }));
        
        // Don't retry here - handle retries in a separate effect
        if (onError) {
          onError(error);
        }
      };
      
      // Start loading the image
      console.log('FixedZoomableImage: Starting to load image:', currentSrc);
      img.src = currentSrc;
    };
    
    // Start the image loading process
    loadImage();
  }, [src, imgSrc, onLoad, onError]);

  // Separate useEffect for retry logic
  useEffect(() => {
    if (imageError && retryCount < maxRetries && src) {
      console.log(`FixedZoomableImage: Retrying (${retryCount + 1}/${maxRetries})...`);
      
      // Add cache-busting parameter to URL
      const cacheBuster = Date.now();
      const newSrc = src.includes('?') 
        ? `${src}&retry=${cacheBuster}`
        : `${src}?retry=${cacheBuster}`;
      
      console.log(`FixedZoomableImage: Using cache-busted URL:`, newSrc);
      
      timeoutIdRef.current = setTimeout(() => {
        setRetryCount(count => count + 1);
        setImageError(false); // Reset error to trigger reload
        setImgSrc(newSrc); // Use the cache-busted URL
      }, retryDelay);
      return () => {
        if (timeoutIdRef.current) {
          clearTimeout(timeoutIdRef.current);
          timeoutIdRef.current = null;
        }
      };
    }
  }, [imageError, retryCount, maxRetries, src, retryDelay]);
  

  return (
    <div className="zoomable-image-container">
      {console.log('FixedZoomableImage: Rendering with state:', { imageLoaded, imageError, retryCount, debugInfo })}
      
      {!imageLoaded && !imageError && (
        <div className="loading-message">
          <p>Loading statistics... {retryCount > 0 ? `(Attempt ${retryCount + 1}/${maxRetries + 1})` : ''}</p>
          <div className="loader-spinner"></div>
          <p className="debug-info">Status: {debugInfo.lastStatus || 'initializing'}</p>
          <p className="debug-info">Attempts: {debugInfo.attempts}</p>
          <p className="debug-info">Last update: {debugInfo.timestamp || 'N/A'}</p>
        </div>
      )}
      
      {imageError && retryCount >= maxRetries && (
        <div className="error-message">
          <p>Failed to load statistics after multiple attempts.</p>
          <p>This could be because:</p>
          <ul>
            <li>The selected deck doesn't have enough data to generate statistics</li>
            <li>The backend encountered an error generating the image</li>
            <li>There was a network issue loading the image</li>
          </ul>
          <div className="debug-actions">
            <button onClick={() => {
              setImageError(false);
              setRetryCount(0);
              console.log('FixedZoomableImage: Manual retry requested');
            }}>
              Retry Loading
            </button>
            <button onClick={() => {
              const url = new URL(src);
              // Add a fresh timestamp to bust cache
              url.searchParams.set('t', Date.now());
              window.open(url.toString(), '_blank');
              console.log('FixedZoomableImage: Opening image in new tab');
            }}>
              Open in New Tab
            </button>
          </div>
        </div>
      )}
      
      {imageLoaded && (
        <img
          src={imgSrc}
          alt={alt}
          className={`${className} ${imageLoaded ? 'visible' : 'hidden'}`}
          onClick={() => imageLoaded && setIsModalOpen(true)}
          style={{
            cursor: imageLoaded ? 'pointer' : 'default',
            opacity: imageLoaded ? 1 : 0
          }}
          onLoad={() => console.log('FixedZoomableImage: DOM img.onload fired')}
          onError={(e) => {
            console.error('FixedZoomableImage: DOM img.onerror fired', e);
            setImageError(true);
            setImageLoaded(false);
          }}
        />
      )}
      
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content">
            <img 
              src={imgSrc} 
              alt={alt} 
              className="fullsize-image" 
              onLoad={() => console.log('FixedZoomableImage: Modal img.onload fired')}
              onError={(e) => console.error('FixedZoomableImage: Modal img.onerror fired', e)}
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
