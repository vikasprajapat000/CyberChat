import { useState } from 'react';
import { Flag, X, AlertTriangle, CheckCircle } from 'lucide-react';

const REASONS = [
  { value: 'spam', label: '🚫 Spam or Unwanted Content' },
  { value: 'harassment', label: '😡 Harassment or Bullying' },
  { value: 'hate_speech', label: '⚠️ Hate Speech' },
  { value: 'inappropriate_content', label: '🔞 Inappropriate Content' },
  { value: 'impersonation', label: '🎭 Impersonation' },
  { value: 'fake_account', label: '🤖 Fake Account' },
  { value: 'violence', label: '💢 Violence or Threats' },
  { value: 'scam', label: '💸 Scam or Fraud' },
  { value: 'other', label: '📝 Other' }
];

export default function UserReportModal({ targetUser, messageId, apiBase, onClose }) {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const token = localStorage.getItem('cc_token');

  const handleSubmit = async () => {
    if (!reason) { setError('Please select a reason'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${apiBase}/api/users/${targetUser.id}/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reason, description: description.trim(), messageId })
      });
      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
        setTimeout(onClose, 3000);
      } else {
        setError(data.error || 'Failed to submit report');
      }
    } catch (e) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="report-modal">
        <div className="report-modal-header">
          <Flag size={18} className="report-icon" />
          <h3>Report {messageId ? 'Message' : 'User'}</h3>
          <button className="modal-close-btn" onClick={onClose}><X size={18} /></button>
        </div>

        {submitted ? (
          <div className="report-success">
            <CheckCircle size={50} className="report-success-icon" />
            <h4>Report Submitted</h4>
            <p>Thank you for keeping CyberChat safe. Our team will review your report within 24 hours.</p>
          </div>
        ) : (
          <div className="report-body">
            <div className="report-target">
              <div className="report-target-avatar">
                {targetUser?.username?.[0]?.toUpperCase() || '?'}
              </div>
              <div>
                <div className="report-target-name">{targetUser?.username}</div>
                {messageId && <div className="report-target-sub">Reporting a specific message</div>}
              </div>
            </div>

            <div className="report-field">
              <label>Why are you reporting this?</label>
              <div className="report-reasons">
                {REASONS.map(r => (
                  <label key={r.value} className={`report-reason-option ${reason === r.value ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="reason"
                      value={r.value}
                      checked={reason === r.value}
                      onChange={() => { setReason(r.value); setError(''); }}
                    />
                    <span>{r.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="report-field">
              <label>Additional details (optional)</label>
              <textarea
                className="report-textarea"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe what happened..."
                rows={3}
                maxLength={500}
              />
              <div className="report-char-count">{description.length}/500</div>
            </div>

            {error && (
              <div className="report-error">
                <AlertTriangle size={14} />
                <span>{error}</span>
              </div>
            )}

            <div className="report-actions">
              <button className="report-cancel-btn" onClick={onClose}>Cancel</button>
              <button
                className="report-submit-btn"
                onClick={handleSubmit}
                disabled={loading || !reason}
              >
                {loading ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>

            <p className="report-disclaimer">
              Reports are anonymous and reviewed by our safety team. False reports may result in account restrictions.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
