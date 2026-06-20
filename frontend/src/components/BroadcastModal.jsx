import { useState } from 'react';
import { Radio, Send, X, Users } from 'lucide-react';

export default function BroadcastModal({ socket, apiBase, onClose }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [sentCount, setSentCount] = useState(0);
  const [error, setError] = useState('');

  const token = localStorage.getItem('cc_token');

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      setError('Title and message body are required.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${apiBase}/api/admin/broadcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ title: title.trim(), body: body.trim() })
      });
      const data = await res.json();
      if (data.success) {
        // Also push real-time via socket
        if (socket) {
          socket.emit('admin_broadcast', { title: title.trim(), body: body.trim() });
        }
        setSentCount(data.notifCount || 0);
        setSent(true);
        setTimeout(onClose, 4000);
      } else {
        setError(data.error || 'Failed to send broadcast');
      }
    } catch (e) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="broadcast-modal">
        <div className="broadcast-modal-header">
          <Radio size={18} className="broadcast-icon-pulse" />
          <h3>Broadcast Notification</h3>
          <button className="modal-close-btn" onClick={onClose}><X size={18} /></button>
        </div>

        {sent ? (
          <div className="broadcast-success">
            <div className="broadcast-success-icon">📡</div>
            <h4>Broadcast Sent!</h4>
            <div className="broadcast-success-count">
              <Users size={16} />
              <span>Delivered to <strong>{sentCount}</strong> users</span>
            </div>
            <p>All online users will see the notification immediately. Offline users will see it on next login.</p>
          </div>
        ) : (
          <>
            <div className="broadcast-body">
              <div className="broadcast-warning">
                <span>⚠️ This message will be sent to ALL users. Use responsibly.</span>
              </div>

              <div className="broadcast-field">
                <label>Notification Title</label>
                <input
                  className="broadcast-input"
                  type="text"
                  placeholder="e.g. System Maintenance Notice"
                  value={title}
                  onChange={e => { setTitle(e.target.value); setError(''); }}
                  maxLength={100}
                />
              </div>

              <div className="broadcast-field">
                <label>Message Body</label>
                <textarea
                  className="broadcast-textarea"
                  placeholder="Write your announcement message here..."
                  value={body}
                  onChange={e => { setBody(e.target.value); setError(''); }}
                  rows={5}
                  maxLength={1000}
                />
                <div className="broadcast-char-count">{body.length}/1000</div>
              </div>

              {error && <div className="broadcast-error">{error}</div>}

              {/* Preview */}
              {(title || body) && (
                <div className="broadcast-preview">
                  <div className="broadcast-preview-label">Preview</div>
                  <div className="broadcast-preview-card">
                    <div className="broadcast-preview-icon">📡</div>
                    <div>
                      <div className="broadcast-preview-title">{title || 'Notification Title'}</div>
                      <div className="broadcast-preview-body">{body || 'Message body will appear here...'}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="broadcast-footer">
              <button className="broadcast-cancel-btn" onClick={onClose}>Cancel</button>
              <button
                className="broadcast-send-btn"
                onClick={handleSend}
                disabled={loading || !title.trim() || !body.trim()}
              >
                <Send size={14} />
                {loading ? 'Sending...' : 'Send to All Users'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
