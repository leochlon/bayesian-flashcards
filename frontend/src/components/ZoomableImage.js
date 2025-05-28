import React, { useState } from 'react';

const ZoomableImage = ({ src, alt, className }) => {
  const [isZoomed, setIsZoomed] = useState(false);

  const handleImageClick = () => {
    setIsZoomed(!isZoomed);
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      setIsZoomed(false);
    }
  };

  return (
    <>
      <img 
        src={src} 
        alt={alt} 
        className={`${className} zoomable-image`}
        onClick={handleImageClick}
        style={{ cursor: 'pointer' }}
      />
      {isZoomed && (
        <div className="image-zoom-overlay" onClick={handleOverlayClick}>
          <div className="zoomed-image-container">
            <img src={src} alt={alt} className="zoomed-image" />
            <button className="close-zoom" onClick={() => setIsZoomed(false)}>×</button>
          </div>
        </div>
      )}
    </>
  );
};

export default ZoomableImage;
