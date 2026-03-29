"use client";
import { useState, useRef } from 'react';
import './UploadArea.css';
import { UploadCloud, Image as ImageIcon } from 'lucide-react';

export default function UploadArea({ onFileSelect }) {
  const [dragActive, setDragActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const inputRef = useRef(null);

  const handleDrag = function(e) {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = (file) => {
    if (file && file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      onFileSelect(file);
    }
  };

  const handleDrop = function(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = function(e) {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const triggerSelect = () => {
    inputRef.current.click();
  };

  const clearImage = (e) => {
    e.stopPropagation();
    setPreviewUrl(null);
    onFileSelect(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div 
      className={`upload-wrapper fade-in ${dragActive ? "drag-active" : ""}`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={!previewUrl ? triggerSelect : undefined}
    >
      <input 
        ref={inputRef} 
        type="file" 
        className="file-input" 
        accept="image/*" 
        onChange={handleChange} 
      />
      
      {previewUrl ? (
        <div className="preview-container">
          <img src={previewUrl} alt="Preview" className="preview-image" />
          <button className="change-btn" onClick={clearImage}>
            Trocar Foto
          </button>
        </div>
      ) : (
        <div className="upload-content">
          <UploadCloud className="upload-icon" />
          <p className="upload-text">Clique ou arraste a imagem do seu ambiente</p>
          <p className="upload-subtext">JPG, PNG, WEBP suportados</p>
        </div>
      )}
    </div>
  );
}
