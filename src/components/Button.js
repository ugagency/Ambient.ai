"use client";
import './Button.css';

export default function Button({ children, disabled, onClick, type = "button", className = "", style = {} }) {
  return (
    <button 
      type={type} 
      className={`premium-btn ${className}`} 
      disabled={disabled} 
      onClick={onClick}
      style={style}
    >
      {children}
    </button>
  );
}
