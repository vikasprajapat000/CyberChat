import { useState, useEffect } from 'react';
import { Phone, Video, PhoneMissed, PhoneOff, Clock, Search, X, RefreshCw } from 'lucide-react';

export default function CallHistoryPanel({ socket, currentUser, allUsers, onStartCall, onClose }) {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!socket) return;
    socket.emit('get_call_history');

    const handleHistory = ({ calls: callList }) => {
      setCalls(callList || []);
      setLoading(false);
    };

    socket.on('call_history', handleHistory);
    return () => socket.off('call_history', handleHistory);
  }, [socket]);

  const getUserName = (userId) => {
    if (userId === currentUser?.id) return 'You';
    const u = allUsers?.find(u => u.id === userId);
    return u?.username || userId;
  };

  const getCallPartner = (call) => {
    return call.callerId === currentUser?.id ? call.receiverId : call.callerId;
  };

  const getCallPartnerName = (call) => {
    return call.callerId === currentUser?.id
      ? (call.receiverName || getUserName(call.receiverId))
      : (call.callerName || getUserName(call.callerId));
  };

  const isOutgoing = (call) => call.callerId === currentUser?.id;

  const formatDuration = (secs) => {
    if (!secs) return '0:00';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const formatTime = (ts) => {
    const d = new Date(ts);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getStatusIcon = (call) => {
    if (call.status === 'missed') return <PhoneMissed size={14} className="call-status-missed" />;
    if (call.status === 'declined') return <PhoneOff size={14} className="call-status-declined" />;
    if (isOutgoing(call)) return <Phone size={14} className="call-status-outgoing" />;
    return <Phone size={14} className="call-status-incoming" />;
  };

  const filteredCalls = calls.filter(call => {
    const partnerName = getCallPartnerName(call).toLowerCase();
    return partnerName.includes(search.toLowerCase());
  });

  return (
    <div className="call-history-panel">
      {/* Header */}
      <div className="call-history-header">
        <h3>Call History</h3>
        <button className="modal-close-btn" onClick={onClose}><X size={18} /></button>
      </div>

      {/* Search */}
      <div className="call-history-search">
        <Search size={15} />
        <input
          type="text"
          placeholder="Search calls..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && <button onClick={() => setSearch('')}><X size={13} /></button>}
      </div>

      {/* Content */}
      <div className="call-history-list">
        {loading ? (
          <div className="call-history-empty">
            <RefreshCw size={30} className="spin" />
            <p>Loading calls...</p>
          </div>
        ) : filteredCalls.length === 0 ? (
          <div className="call-history-empty">
            <Phone size={40} opacity={0.2} />
            <p>No calls found</p>
          </div>
        ) : (
          filteredCalls.map(call => (
            <div key={call.id} className={`call-history-item ${call.status}`}>
              {/* Avatar */}
              <div className={`call-history-avatar ${call.type === 'video' ? 'video' : ''}`}>
                {getCallPartnerName(call)[0]?.toUpperCase() || '?'}
              </div>

              {/* Info */}
              <div className="call-history-info">
                <div className="call-history-name">{getCallPartnerName(call)}</div>
                <div className="call-history-meta">
                  {getStatusIcon(call)}
                  <span className={`call-history-status ${call.status}`}>
                    {call.status === 'missed' ? 'Missed' :
                     call.status === 'declined' ? 'Declined' :
                     isOutgoing(call) ? 'Outgoing' : 'Incoming'}
                  </span>
                  {call.duration > 0 && (
                    <>
                      <span className="call-history-dot">·</span>
                      <Clock size={11} />
                      <span>{formatDuration(call.duration)}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Right side */}
              <div className="call-history-right">
                <div className="call-history-time">{formatTime(call.startedAt)}</div>
                <div className="call-history-recall">
                  <button
                    className={`call-history-recall-btn ${call.type === 'video' ? 'video' : 'audio'}`}
                    onClick={() => onStartCall(getCallPartner(call), call.type === 'video')}
                    title={`Start ${call.type} call`}
                  >
                    {call.type === 'video' ? <Video size={14} /> : <Phone size={14} />}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
