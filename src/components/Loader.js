import './Loader.css';

export default function Loader({ text = "Criando seu ambiente..." }) {
  return (
    <div className="loader-container">
      <div style={{ position: 'relative' }}>
        <div className="glow"></div>
        <div className="spinner"></div>
      </div>
      <p className="loader-text">{text}</p>
    </div>
  );
}
