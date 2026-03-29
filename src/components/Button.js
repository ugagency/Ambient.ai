"use client";
import './Button.css';

export default function Button({ children, disabled, onClick, type = "button", className = "" }) {
  return (
    <button 
      type={type} 
      className={`premium-btn ${className}`} 
      disabled={disabled} 
      onClick={onClick}
    >
      {children}
    </button>
  );
}
