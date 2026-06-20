// frontend/src/components/ErrorBoundary.jsx
import React from 'react';
import { ShieldAlert, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[CyberChat ErrorBoundary] Intercepted runtime error:', error, errorInfo);
  }

  handleReset = () => {
    // Clear potentially corrupted storage states and hard refresh
    localStorage.removeItem('cc_user');
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          width: '100vw',
          backgroundColor: '#0b141a', // Dark theme fallback
          color: '#f0f2f5',
          padding: '24px',
          fontFamily: 'system-ui, sans-serif',
          textAlign: 'center'
        }}>
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            color: '#ef4444',
            padding: '20px',
            borderRadius: '50%',
            marginBottom: '24px',
            animation: 'pulseBorder 2s infinite'
          }}>
            <ShieldAlert size={48} />
          </div>
          <h1 style={{
            fontSize: '28px',
            fontWeight: 700,
            marginBottom: '10px',
            fontFamily: 'Outfit, sans-serif'
          }}>
            Application Error
          </h1>
          <p style={{
            fontSize: '14px',
            color: '#8696a0',
            maxWidth: '420px',
            lineHeight: '1.6',
            marginBottom: '32px'
          }}>
            Cyber Chat encountered an unexpected runtime crash. This might be due to corrupted session data or server mismatch.
          </p>
          <button
            onClick={this.handleReset}
            style={{
              backgroundColor: '#ef4444',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
            }}
          >
            <RefreshCw size={16} /> Reset & Restart App
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
