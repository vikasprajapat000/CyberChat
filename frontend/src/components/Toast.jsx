// frontend/src/components/Toast.jsx
import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

export function Toast({ id, message, type = 'info', onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(id);
    }, 4000);
    return () => clearTimeout(timer);
  }, [id, onClose]);

  const icons = {
    success: <CheckCircle size={16} style={{ color: 'var(--success)' }} />,
    error: <AlertCircle size={16} style={{ color: 'var(--danger)' }} />,
    warning: <AlertCircle size={16} style={{ color: 'var(--warning)' }} />,
    info: <Info size={16} style={{ color: 'var(--accent)' }} />
  };

  const getBorderColor = () => {
    if (type === 'success') return 'var(--success)';
    if (type === 'error') return 'var(--danger)';
    if (type === 'warning') return 'var(--warning)';
    return 'var(--accent)';
  };

  return (
    <div 
      className="glass-panel animate-slide"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 18px',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-md)',
        borderLeft: `4px solid ${getBorderColor()}`,
        backgroundColor: 'var(--bg-panel)',
        minWidth: '280px',
        maxWidth: '360px',
        pointerEvents: 'auto',
        justifyContent: 'space-between',
        zIndex: 9999
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
        {icons[type]}
        <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {message}
        </span>
      </div>
      <button 
        onClick={() => onClose(id)} 
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-muted)',
          display: 'flex',
          padding: '2px'
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function ToastContainer({ toasts, onClose }) {
  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      pointerEvents: 'none'
    }}>
      {toasts.map(toast => (
        <Toast 
          key={toast.id}
          id={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={onClose}
        />
      ))}
    </div>
  );
}
export default ToastContainer;
