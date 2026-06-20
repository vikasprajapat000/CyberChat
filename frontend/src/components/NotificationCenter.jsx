import { useState, useEffect, useRef } from 'react';
import { Bell, X, Check, CheckCheck, Phone, Video, AtSign, Users, Megaphone, Calendar, Radio, Shield, Trash2 } from 'lucide-react';

const NOTIF_ICONS = {
  message: '💬',
  mention: '📢',
  call_missed: '📞',
  call_incoming: '📲',
  friend_request: '🤝',
  friend_accepted: '✅',
  follow: '👤',
  group_invite: '👥',
  group_announcement: '📣',
  group_event: '📅',
  broadcast: '📡',
  login_alert: '🔒',
  report_resolved: '🛡️',
  system: '⚙️'
};

export default function NotificationCenter({ socket, currentUser, apiBase, onClose }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const panelRef = useRef(null);

  const token = localStorage.getItem('cc_token');

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${apiBase}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch (e) {
      console.error('Fetch notifications error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Listen for real-time notification events
    if (socket) {
      const handleBroadcast = (data) => {
        const newNotif = {
          id: `tmp_${Date.now()}`,
          type: 'broadcast',
          title: data.title,
          body: data.body,
          read: false,
          createdAt: data.timestamp
        };
        setNotifications(prev => [newNotif, ...prev]);
        setUnreadCount(prev => prev + 1);
      };

      const handleMention = (data) => {
        const newNotif = {
          id: `tmp_${Date.now()}`,
          type: 'mention',
          title: data.title,
          body: data.body,
          read: false,
          metadata: data.metadata,
          createdAt: new Date().toISOString()
        };
        setNotifications(prev => [newNotif, ...prev]);
        setUnreadCount(prev => prev + 1);
      };

      const handleLoginAlert = (data) => {
        const newNotif = {
          id: `tmp_${Date.now()}`,
          type: 'login_alert',
          title: 'New Login Detected',
          body: `Login from IP: ${data.ip}`,
          read: false,
          createdAt: data.timestamp
        };
        setNotifications(prev => [newNotif, ...prev]);
        setUnreadCount(prev => prev + 1);
      };

      socket.on('broadcast_notification', handleBroadcast);
      socket.on('mention_notification', handleMention);
      socket.on('login_alert', handleLoginAlert);

      return () => {
        socket.off('broadcast_notification', handleBroadcast);
        socket.off('mention_notification', handleMention);
        socket.off('login_alert', handleLoginAlert);
      };
    }
  }, [socket]);

  const markRead = async (id) => {
    try {
      await fetch(`${apiBase}/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) { /* silent */ }
  };

  const markAllRead = async () => {
    try {
      await fetch(`${apiBase}/api/notifications/mark-all-read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (e) { /* silent */ }
  };

  const clearAll = async () => {
    try {
      await fetch(`${apiBase}/api/notifications/clear`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications([]);
      setUnreadCount(0);
    } catch (e) { /* silent */ }
  };

  const filtered = filter === 'all'
    ? notifications
    : filter === 'unread'
    ? notifications.filter(n => !n.read)
    : notifications.filter(n => n.type === filter);

  const formatTime = (ts) => {
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return d.toLocaleDateString();
  };

  return (
    <div className="notif-center-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="notif-center-panel" ref={panelRef}>
        {/* Header */}
        <div className="notif-header">
          <div className="notif-header-left">
            <Bell size={20} />
            <h3>Notifications</h3>
            {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
          </div>
          <div className="notif-header-actions">
            {unreadCount > 0 && (
              <button className="notif-action-btn" onClick={markAllRead} title="Mark all read">
                <CheckCheck size={16} />
              </button>
            )}
            <button className="notif-action-btn" onClick={clearAll} title="Clear all">
              <Trash2 size={16} />
            </button>
            <button className="notif-action-btn" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="notif-filters">
          {['all', 'unread', 'mention', 'broadcast', 'login_alert'].map(f => (
            <button
              key={f}
              className={`notif-filter-btn ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All' :
               f === 'unread' ? `Unread${unreadCount > 0 ? ` (${unreadCount})` : ''}` :
               f === 'mention' ? '@Mentions' :
               f === 'broadcast' ? 'Broadcasts' : 'Alerts'}
            </button>
          ))}
        </div>

        {/* Notifications list */}
        <div className="notif-list">
          {loading ? (
            <div className="notif-empty">
              <div className="notif-loading-pulse" />
              <p>Loading...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="notif-empty">
              <Bell size={40} opacity={0.3} />
              <p>No notifications</p>
            </div>
          ) : (
            filtered.map(notif => (
              <div
                key={notif.id}
                className={`notif-item ${!notif.read ? 'unread' : ''}`}
                onClick={() => !notif.read && markRead(notif.id)}
              >
                <div className="notif-icon">{NOTIF_ICONS[notif.type] || '🔔'}</div>
                <div className="notif-content">
                  <div className="notif-title">{notif.title}</div>
                  {notif.body && <div className="notif-body">{notif.body}</div>}
                  <div className="notif-time">{formatTime(notif.createdAt)}</div>
                </div>
                {!notif.read && <div className="notif-unread-dot" />}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
