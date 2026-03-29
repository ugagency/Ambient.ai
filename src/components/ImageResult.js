"use client";
import React, { useState } from 'react';
import './ImageResult.css';
import Button from './Button';
import { Send, Download, RefreshCw } from 'lucide-react';
import BeforeAfterSlider from './BeforeAfterSlider';

export default function ImageResult({ imageUrl, beforeImage, onChatSubmit, onReset }) {
  const [chatMessage, setChatMessage] = useState("");

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = 'ambient-ai-design.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleSend = () => {
    if (chatMessage.trim()) {
      onChatSubmit(chatMessage);
      setChatMessage("");
    }
  };

  return (
    <div className="result-container slide-up" style={{ animationDelay: "0.2s" }}>
      <div className="result-header">
        <h2 className="result-title">Design Finalizado</h2>
        <p className="result-subtitle">O que você gostaria de mudar neste ambiente?</p>
      </div>
      
      <div className="image-wrapper">
        <BeforeAfterSlider 
          beforeImage={beforeImage || imageUrl} 
          afterImage={imageUrl} 
        />
      </div>

      <div className="chat-interface">
        <input 
          type="text" 
          className="chat-input" 
          placeholder="Ex: Adicione um quadro azul na parede..." 
          value={chatMessage}
          onChange={(e) => setChatMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        />
        <button className="chat-send-btn" onClick={handleSend} disabled={!chatMessage.trim()}>
          <Send size={20} />
        </button>
      </div>

      <div className="result-actions">
        <Button onClick={handleDownload} className="download-btn" style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', width: 'auto' }}>
          <Download size={18} />
          Salvar
        </Button>
        <Button onClick={onReset} className="reset-btn" style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', width: 'auto' }}>
          <RefreshCw size={18} />
          Novo Projeto
        </Button>
      </div>
    </div>
  );
}
