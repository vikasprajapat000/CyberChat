import { useState, useEffect } from 'react';
import {
  Flag, Search, X, Trash2, Ban, AlertCircle, CheckCircle, RefreshCw, Eye, Filter
} from 'lucide-react';

export default function ContentModeration({ apiBase, socket }) {
  const [reports, setReports] = useState([]);
  const [flaggedMessages, setFlaggedMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('pending'); // pending | resolved | all
  const [actionLoading, setActionLoading] = useState(null);
  const [toast, setToast] = useState('');

  const token = localStorage.getItem('cc_token');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [repRes, msgRes] = await Promise.all([
        fetch(`${apiBase}/api/admin/reports`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${apiBase}/api/admin/messages/flagged`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      const repData = await repRes.json();
      const msgData = await msgRes.json();

      if (repData.success) setReports(repData.reports || []);
      if (msgData.success) setFlaggedMessages(msgData.messages || []);
    } catch (e) {
      console.error('Moderation fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const resolveReport = async (reportId) => {
    setActionLoading(reportId);
    try {
      const res = await fetch(`${apiBase}/api/admin/reports/${reportId}/resolve`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setReports(prev => prev.map(r => r.id === reportId ? { ...r, resolved: true } : r));
        showToast('Report resolved');
      }
    } catch (e) {
      showToast('Failed to resolve report');
    } finally {
      setActionLoading(null);
    }
  };

  const deleteMessage = async (msgId) => {
    setActionLoading(msgId);
    try {
      const res = await fetch(`${apiBase}/api/admin/messages/${msgId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setFlaggedMessages(prev => prev.filter(m => m.id !== msgId));
        showToast('Message removed');
      }
    } catch (e) {
      showToast('Failed to remove message');
    } finally {
      setActionLoading(null);
    }
  };

  const banUserFromReport = async (userId) => {
    try {
      const res = await fetch(`${apiBase}/api/admin/users/${userId}/ban`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) showToast('User banned');
    } catch (e) {
      showToast('Failed to ban user');
    }
  };

  const filteredReports = reports.filter(r => {
    const matchSearch = r.targetUsername?.toLowerCase().includes(search.toLowerCase()) ||
                       r.reason?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' ? true : filter === 'pending' ? !r.resolved : r.resolved;
    return matchSearch && matchFilter;
  });

  const REASON_LABELS = {
    spam: '🚫 Spam',
    harassment: '😡 Harassment',
    hate_speech: '⚠️ Hate Speech',
    inappropriate_content: '🔞 Inappropriate',
    impersonation: '🎭 Impersonation',
    fake_account: '🤖 Fake Account',
    violence: '💢 Violence',
    scam: '💸 Scam',
    other: '📝 Other'
  };

  return (
    <div className="content-mod">
      <div className="content-mod-toolbar">
        <div className="content-mod-search">
          <Search size={14} />
          <input
            placeholder="Search reports..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button onClick={() => setSearch('')}><X size={12} /></button>}
        </div>
        <div className="content-mod-filters">
          {['all','pending','resolved'].map(f => (
            <button
              key={f}
              className={`content-mod-filter ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <button className="content-mod-refresh" onClick={fetchData} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
        </button>
      </div>

      {/* Stats */}
      <div className="content-mod-stats">
        <div className="content-mod-stat">
          <span>{reports.filter(r => !r.resolved).length}</span>
          <label>Pending</label>
        </div>
        <div className="content-mod-stat resolved">
          <span>{reports.filter(r => r.resolved).length}</span>
          <label>Resolved</label>
        </div>
        <div className="content-mod-stat msg">
          <span>{flaggedMessages.length}</span>
          <label>Flagged Msgs</label>
        </div>
      </div>

      {/* Flagged messages */}
      {flaggedMessages.length > 0 && (
        <div className="content-mod-section">
          <h4 className="content-mod-section-title">
            <AlertCircle size={14} /> Flagged Messages
          </h4>
          {flaggedMessages.map(msg => (
            <div key={msg.id} className="content-mod-msg-item">
              <div className="content-mod-msg-text">
                <span className="content-mod-msg-sender">{msg.senderId}: </span>
                {msg.text || '[Media Message]'}
              </div>
              <div className="content-mod-msg-actions">
                <button
                  className="content-mod-action-btn danger"
                  onClick={() => deleteMessage(msg.id)}
                  disabled={actionLoading === msg.id}
                >
                  <Trash2 size={13} />
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reports list */}
      <div className="content-mod-section">
        <h4 className="content-mod-section-title">
          <Flag size={14} /> User Reports ({filteredReports.length})
        </h4>

        {loading ? (
          <div className="content-mod-loading"><RefreshCw size={24} className="spin" /></div>
        ) : filteredReports.length === 0 ? (
          <div className="content-mod-empty">
            <CheckCircle size={36} opacity={0.3} />
            <p>No {filter === 'pending' ? 'pending' : filter} reports</p>
          </div>
        ) : (
          filteredReports.map(report => (
            <div key={report.id} className={`content-mod-report-item ${report.resolved ? 'resolved' : ''}`}>
              <div className="content-mod-report-header">
                <div className="content-mod-report-target">
                  <Flag size={12} />
                  <strong>{report.targetUsername || report.targetUserId}</strong>
                  <span className="content-mod-report-reason">{REASON_LABELS[report.reason] || report.reason}</span>
                </div>
                <div className={`content-mod-report-status ${report.resolved ? 'resolved' : 'pending'}`}>
                  {report.resolved ? <><CheckCircle size={11} /> Resolved</> : <><AlertCircle size={11} /> Pending</>}
                </div>
              </div>
              {report.description && (
                <div className="content-mod-report-desc">"{report.description}"</div>
              )}
              <div className="content-mod-report-meta">
                Reported {new Date(report.timestamp).toLocaleString()}
              </div>
              {!report.resolved && (
                <div className="content-mod-report-actions">
                  <button
                    className="content-mod-action-btn"
                    onClick={() => resolveReport(report.id)}
                    disabled={actionLoading === report.id}
                  >
                    <CheckCircle size={12} />
                    {actionLoading === report.id ? 'Resolving...' : 'Mark Resolved'}
                  </button>
                  <button
                    className="content-mod-action-btn danger"
                    onClick={() => banUserFromReport(report.targetUserId)}
                  >
                    <Ban size={12} />
                    Ban User
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {toast && <div className="gs-toast">{toast}</div>}
    </div>
  );
}
