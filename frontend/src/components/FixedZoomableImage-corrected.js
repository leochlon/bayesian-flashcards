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
  
  // FIXED: Use refs to track current state without causing re-renders
  const currentSrcRef = useRef(src);
  const timeoutIdRef = useRef(null);
  const isLoadingRef = useRef(false);
  const imgElementRef = useRef(null);

  // FIXED: Single consolidated useEffect for all image loading logic
  useEffect(() => {
    console.log('FixedZoomableImage: src changed to:', src);
    
    // FIXED: Early return if no src to prevent unnecessary processing
    if (!src) {
      console.log('FixedZoomableImage: No src provided, resetting state');
      setImageLoaded(false);
      setImageError(false);
      setRetryCount(0);
      setDebugInfo({ attempts: 0, lastStatus: 'no-src' });
      currentSrcRef.current = null;
      isLoadingRef.current = false;
      return;
    }
    
    // FIXED: Reset all state when src changes - consolidated logic
    setImageLoaded(false);
    setImageError(false);
    setRetryCount(0);
    setDebugInfo({ attempts: 0, lastStatus: null });
    currentSrcRef.current = src;
    isLoadingRef.current = false;
    
    // FIXED: Clear any existing retry timeout to prevent overlapping attempts
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }
    
    // FIXED: Centralized image loading function with proper concurrency control
    const loadImage = (srcToLoad, attempt = 0) => {
      // FIXED: Prevent concurrent loading attempts
      if (isLoadingRef.current) {
        console.log('FixedZoomableImage: Load already in progress, skipping');
        return;
      }
      
      // FIXED: Verify this is still the current source before starting
      if (currentSrcRef.current !== src) {
        console.log('FixedZoomableImage: Source changed during load, aborting');
        return;
      }
      
      isLoadingRef.current = true;
      
      // Update debug info
      setDebugInfo(prev => ({ 
        attempts: prev.attempts + 1, 
        lastStatus: 'loading',
        timestamp: new Date().toISOString(),
        currentSrc: srcToLoad
      }));
      
      // FIXED: Create new image object for preloading
      const img = new Image();
      
      // FIXED: Success handler with proper state verification
      img.onload = () => {
        console.log('FixedZoomableImage: Image loaded successfully:', srcToLoad);
        console.log('FixedZoomableImage: Image dimensions:', img.width, 'x', img.height);
        
        // FIXED: Only update state if this is still the current source
        if (currentSrcRef.current === src && srcToLoad.includes(src)) {
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
        } else {
          console.log('FixedZoomableImage: Source changed during load, ignoring success');
        }
        
        isLoadingRef.current = false;
      };
      
      // FIXED: Error handler with proper retry logic
      img.onerror = (error) => {
        console.error('FixedZoomableImage: Image failed to load:', srcToLoad);
        console.error('FixedZoomableImage: Error details:', error);
        
        isLoadingRef.current = false;
        
        // FIXED: Only handle error if this is still the current source
        if (currentSrcRef.current === src) {
          setDebugInfo(prev => ({ 
            ...prev, 
            lastStatus: 'error',
            error: error.toString(),
            timestamp: new Date().toISOString()
          }));
          
          // FIXED: Retry logic with proper attempt tracking
          if (attempt < maxRetries) {
            console.log(`FixedZoomableImage: Retrying (${attempt + 1}/${maxRetries})...`);
            
            // FIXED: Add cache-busting parameter to URL for retry
            const cacheBuster = Date.now();
            const newSrc = srcToLoad.includes('?') 
              ? `${srcToLoad}&retry=${cacheBuster}`
              : `${srcToLoad}?retry=${cacheBuster}`;
            
            console.log(`FixedZoomableImage: Using cache-busted URL:`, newSrc);
            
            timeoutIdRef.current = setTimeout(() => {
              setRetryCount(attempt + 1);
              loadImage(newSrc, attempt + 1);
            }, retryDelay);
          } else {
            // FIXED: Max retries exceeded - set final error state
            console.log('FixedZoomableImage: Max retries exceeded');
            setImageError(true);
            setImageLoaded(false);
            
            if (onError) {
              onError(error);
            }
          }
        } else {
          console.log('FixedZoomableImage: Source changed during error, ignoring');
        }
      };
      
      // FIXED: Start loading the image
      console.log('FixedZoomableImage: Starting to load image:', srcToLoad);
      img.src = srcToLoad;
    };
    
    // FIXED: Start the image loading process
    loadImage(src);
    
    // FIXED: Cleanup function to prevent memory leaks
    return () => {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = null;
      }
      isLoadingRef.current = false;
      console.log('FixedZoomableImage: Cleanup completed for src:', src);
    };
  }, [src, onLoad, onError, maxRetries, retryDelay]); // FIXED: Stable dependency array

  // FIXED: Manual retry function with proper state reset
  const handleManualRetry = () => {
    console.log('FixedZoomableImage: Manual retry requested');
    
    // FIXED: Reset all error states
    setImageError(false);
    setImageLoaded(false);
    setRetryCount(0);
    setDebugInfo({ attempts: 0, lastStatus: null });
    
    // FIXED: Create fresh cache-busted URL
    const cacheBuster = Date.now();
    const newSrc = src.includes('?') 
      ? `${src}&manual=${cacheBuster}`
      : `${src}?manual=${cacheBuster}`;
    
    currentSrcRef.current = newSrc;
    isLoadingRef.current = false;
    
    // FIXED: Start fresh loading process
    const img = new Image();
    img.onload = () => {
      setImageLoaded(true);
      setImageError(false);
      if (onLoad) onLoad();
    };
    img.onerror = (error) => {
      setImageError(true);
      if (onError) onError(error);
    };
    img.src = newSrc;
  };

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
            <button onClick={handleManualRetry}>
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
          ref={imgElementRef}
          src={currentSrcRef.current}
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
            // FIXED: Only set error if this matches current source
            if (e.target.src === currentSrcRef.current) {
              setImageError(true);
              setImageLoaded(false);
            }
          }}
        />
      )}
      
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content">
            <img 
              src={currentSrcRef.current} 
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