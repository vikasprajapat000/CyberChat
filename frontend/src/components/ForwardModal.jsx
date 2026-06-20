// frontend/src/components/ForwardModal.jsx
import React, { useState } from 'react';
import { X, Search, Send, Check } from 'lucide-react';

function ForwardModal({
  message,
  rooms,
  onlineUsers,
  user,
  onClose,
  socket,
  showToast
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [forwardedTargets, setForwardedTargets] = useState(new Set()); // IDs of target rooms/users already sent to

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2);
    return (parts[0][0] + parts[1][0]).substring(0, 2);
  };

  const getAvatarBgClass = (name) => {
    if (!name) return 'bg-av-1';
    let code = 0;
    for (let i = 0; i < name.length; i++) {
      code += name.charCodeAt(i);
    }
    const idx = (code % 8) + 1;
    return `bg-av-${idx}`;
  };

  const handleForward = (targetId, isGroup) => {
    if (!socket || forwardedTargets.has(targetId)) return;

    // Build the forwarded message payload
    const forwardPayload = {
      senderId: user.id,
      recipientId: isGroup ? null : targetId,
      roomId: isGroup ? targetId : null,
      text: `[Forwarded]: ${message.text || ''}`,
      mediaUrl: message.mediaUrl || null,
      mediaType: message.mediaType || null,
      mediaName: message.mediaName || null
    };

    socket.emit('send_message', forwardPayload);
    
    // Add to forwarded targets set to prevent double forwards
    setForwardedTargets(prev => {
      const updated = new Set(prev);
      updated.add(targetId);
      return updated;
    });

    showToast('Message forwarded successfully!', 'success');
  };

  // Filter items
  const filteredRooms = rooms.filter(r => r.name.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredUsers = onlineUsers.filter(u => u.id !== user.id && u.username.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 1100,
      backgroundColor: 'rgba(0,0,0,0.5)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div 
        className="glass-panel animate-scale"
        style={{
          width: '100%',
          maxWidth: '440px',
          backgroundColor: 'var(--bg-panel)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-glass)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Outfit' }}>
            Forward Message
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
            <X size={20} />
          </button>
        </div>

        {/* Selected message preview */}
        <div style={{
          padding: '12px 20px',
          backgroundColor: 'var(--bg-app)',
          borderBottom: '1px solid var(--border-glass)',
          fontSize: '13px',
          color: 'var(--text-secondary)',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          <span style={{ fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Message Content</span>
          <p style={{ fontStyle: 'italic', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
            {message.text || '📁 Shared file / attachment'}
          </p>
        </div>

        {/* Search */}
        <div style={{ padding: '12px 20px', position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '32px', top: '22px', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search channels & users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px 10px 36px',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              backgroundColor: 'var(--bg-app)',
              color: 'var(--text-primary)',
              outline: 'none',
              fontSize: '13px'
            }}
          />
        </div>

        {/* Target List */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0 12px 16px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          {/* Rooms */}
          {filteredRooms.length > 0 && (
            <div>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', padding: '6px 12px', textTransform: 'uppercase' }}>Channels</span>
              {filteredRooms.map(r => {
                const sent = forwardedTargets.has(r.id);
                return (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '6px', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justify: 'center', fontWeight: 600 }}>#</div>
                      <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</span>
                    </div>
                    <button
                      onClick={() => handleForward(r.id, true)}
                      disabled={sent}
                      style={{
                        backgroundColor: sent ? 'var(--success)' : 'var(--primary)',
                        color: 'var(--text-on-primary)',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '6px 12px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: sent ? 'default' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      {sent ? (
                        <>
                          <Check size={12} /> Sent
                        </>
                      ) : (
                        <>
                          <Send size={12} /> Forward
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Users */}
          {filteredUsers.length > 0 && (
            <div style={{ marginTop: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', padding: '6px 12px', textTransform: 'uppercase' }}>Contacts</span>
              {filteredUsers.map(u => {
                const sent = forwardedTargets.has(u.id);
                return (
                  <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <div className={`initials-avatar ${getAvatarBgClass(u.username)}`} style={{ width: '32px', height: '32px', fontSize: '12px' }}>
                        {getInitials(u.username)}
                      </div>
                      <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.username}</span>
                    </div>
                    <button
                      onClick={() => handleForward(u.id, false)}
                      disabled={sent}
                      style={{
                        backgroundColor: sent ? 'var(--success)' : 'var(--primary)',
                        color: 'var(--text-on-primary)',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '6px 12px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: sent ? 'default' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      {sent ? (
                        <>
                          <Check size={12} /> Sent
                        </>
                      ) : (
                        <>
                          <Send size={12} /> Forward
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {filteredRooms.length === 0 && filteredUsers.length === 0 && (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
              No matches found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ForwardModal;
