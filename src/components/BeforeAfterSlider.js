"use client";
import React, { useState, useRef, useEffect } from 'react';
import './BeforeAfterSlider.css';

export default function BeforeAfterSlider({ beforeImage, afterImage }) {
  const [sliderPos, setSliderPos] = useState(50);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef(null);

  const handleMove = (clientX) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const position = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPos(position);
  };

  const handleMouseMove = (e) => {
    if (isResizing) {
      handleMove(e.clientX);
    }
  };

  const handleTouchMove = (e) => {
    if (isResizing) {
      handleMove(e.touches[0].clientX);
    }
  };

  const handleMouseDown = () => setIsResizing(true);
  const handleTouchStart = () => setIsResizing(true);
  const handleMouseUp = () => setIsResizing(false);
  const handleTouchEnd = () => setIsResizing(false);

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchend', handleTouchEnd);
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  return (
    <div 
      ref={containerRef}
      className="slider-container" 
      onMouseMove={handleMouseMove}
      onTouchMove={handleTouchMove}
    >
      <div className="image-after" style={{ backgroundImage: `url(${afterImage})` }}>
        <div className="label-badge after-badge">Depois</div>
      </div>
      
      <div 
        className="image-before" 
        style={{ 
          backgroundImage: `url(${beforeImage})`,
          clipPath: `inset(0 ${100 - sliderPos}% 0 0)`
        }}
      >
        <div className="label-badge before-badge">Antes</div>
      </div>

      <div 
        className="slider-handle" 
        style={{ left: `${sliderPos}%` }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <div className="handle-line"></div>
        <div className="handle-button">
          <div className="handle-arrows">
            <span>‹</span>
            <span>›</span>
          </div>
        </div>
        <div className="handle-line"></div>
      </div>
    </div>
  );
}
