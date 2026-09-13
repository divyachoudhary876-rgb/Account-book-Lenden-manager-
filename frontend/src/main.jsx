// frontend/src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Defensive Error Boundary Component to catch blank white screen crashes
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Critical App Crash Caught:", error, errorInfo);
  }

  handleHardReset = () => {
    try {
      localStorage.clear();
      window.location.href = '/';
    } catch (e) {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', fontFamily: 'sans-serif', textAlign: 'center', backgroundColor: '#f8fafc', height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ maxWidth: '450px', backgroundColor: '#fff', padding: '24px', borderRadius: '16px', border: '1px solid #cbd5e1', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <h2 style={{ color: '#b91c1c', margin: '0 0 10px 0', fontSize: '18px' }}>⚠️ कुछ तकनीकी गड़बड़ी आई है</h2>
            <p style={{ color: '#64748b', fontSize: '12px', marginBottom: '20px' }}>
              ऐप लोड होने में समस्या आई है। हो सकता है पुराना या अमान्य डेटा स्टोर हो गया हो। नीचे दिए गए बटन से आप इसे रीसेट करके फिर से चालू कर सकते हैं।
            </p>
            <button
              onClick={this.handleHardReset}
              style={{ backgroundColor: '#0f172a', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '8px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', width: '100%' }}
            >
              🔄 Clean Cache & Restart App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
