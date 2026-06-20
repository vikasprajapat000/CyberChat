// frontend/src/components/UserProfileModal.jsx
import React, { useState } from 'react';
import { X, ShieldAlert, VolumeX, Volume2, ShieldCheck, Flag } from 'lucide-react';

function UserProfileModal({
  user,           // Current user profile
  targetUser,     // Inspected user object
  onClose,
  socket,
  connected
}) {
  const [reportReason, setReportReason] = useState('');
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);

  // Helper Initials
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

  const isBlocked = user.blockedUsers?.includes(targetUser.id);
  const isMuted = user.mutedUsers?.includes(targetUser.id);

  const handleBlockToggle = () => {
    if (!connected || !socket) return;
    socket.emit('block_user', {
      userId: user.id,
      targetUserId: targetUser.id,
      isBlocked: !isBlocked
    });
  };

  const handleMuteToggle = () => {
    if (!connected || !socket) return;
    socket.emit('mute_user', {
      userId: user.id,
      targetId: targetUser.id,
      isMuted: !isMuted
    });
  };

  const handleReportSubmit = (e) => {
    e.preventDefault();
    if (!connected || !socket || !reportReason.trim()) return;

    socket.emit('report_user', {
      reporterId: user.id,
      reportedId: targetUser.id,
      reason: reportReason.trim()
    });

    setReportSubmitted(true);
    setReportReason('');
    setTimeout(() => {
      setReportSubmitted(false);
      setShowReportForm(false);
    }, 2000);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 1000,
      backgroundColor: 'rgba(0,0,0,0.5)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '40px 20px',
      overflowY: 'auto',
      boxSizing: 'border-box'
    }}>
      <div 
        className="glass-panel animate-scale"
        style={{
          width: '100%',
          maxWidth: '400px',
          backgroundColor: 'var(--bg-panel)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          margin: 'auto'
        }}
      >
        {/* Modal Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-glass)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>Contact Details</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
            <X size={20} />
          </button>
        </div>

        {/* Modal Content */}
        <div style={{ padding: '32px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          {/* Avatar circle */}
          <div style={{ position: 'relative', marginBottom: '16px' }}>
            <div 
              className={`initials-avatar ${getAvatarBgClass(targetUser.username)}`}
              style={{
                width: '80px',
                height: '80px',
                fontSize: '32px',
                border: '4px solid var(--bg-app)',
                boxShadow: 'var(--shadow-md)'
              }}
            >
              {getInitials(targetUser.username)}
            </div>
            <span style={{
              position: 'absolute',
              bottom: '2px',
              right: '2px',
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              backgroundColor: targetUser.status === 'online' ? 'var(--success)' : 'var(--text-muted)',
              border: '2px solid var(--bg-panel)'
            }} />
          </div>

          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
            {targetUser.username}
          </h2>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '24px', wordBreak: 'break-all' }}>
            ID: {targetUser.id}
          </span>

          {/* Block banner message */}
          {isBlocked && (
            <div style={{
              width: '100%',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              color: 'var(--danger)',
              padding: '8px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              marginBottom: '20px'
            }}>
              <ShieldAlert size={14} /> You have blocked this contact
            </div>
          )}

          {/* Privacy controls grids */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', width: '100%', marginBottom: '20px' }}>
            {/* Block / Unblock Button */}
            <button
              onClick={handleBlockToggle}
              disabled={!connected}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px',
                border: '1px solid var(--border-glass)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-app)',
                color: isBlocked ? 'var(--success)' : 'var(--danger)',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
                transition: 'background-color var(--transition-fast)'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--border-glass)'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-app)'}
            >
              {isBlocked ? (
                <>
                  <ShieldCheck size={20} /> Unblock User
                </>
              ) : (
                <>
                  <ShieldAlert size={20} /> Block User
                </>
              )}
            </button>

            {/* Mute / Unmute Button */}
            <button
              onClick={handleMuteToggle}
              disabled={!connected}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px',
                border: '1px solid var(--border-glass)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-app)',
                color: isMuted ? 'var(--primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 600,
                transition: 'background-color var(--transition-fast)'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--border-glass)'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-app)'}
            >
              {isMuted ? (
                <>
                  <Volume2 size={20} /> Unmute Chats
                </>
              ) : (
                <>
                  <VolumeX size={20} /> Mute Chats
                </>
              )}
            </button>
          </div>

          {/* Admin Controls Area */}
          {user.isAdmin && targetUser.id !== user.id && (
            <div style={{
              width: '100%',
              borderTop: '1px dashed var(--border-glass)',
              paddingTop: '16px',
              marginBottom: '20px',
              textAlign: 'left'
            }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--danger)', display: 'block', marginBottom: '10px', textTransform: 'uppercase' }}>
                Server Admin Commands
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => {
                    socket.emit('admin_mute_user', { targetUserId: targetUser.id, adminId: user.id, isMuted: !targetUser.isMutedGlobally });
                    onClose();
                  }}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-glass)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: targetUser.isMutedGlobally ? 'var(--primary-light)' : 'var(--bg-app)',
                    color: 'var(--text-primary)'
                  }}
                >
                  {targetUser.isMutedGlobally ? '🔊 Unmute Global' : '🔇 Mute Global'}
                </button>
                <button
                  onClick={() => {
                    const confirmBan = window.confirm(`Globally ban user "${targetUser.username}"?`);
                    if (confirmBan) {
                      socket.emit('admin_ban_user', { targetUserId: targetUser.id, adminId: user.id });
                      onClose();
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: 'var(--danger)',
                    color: '#fff'
                  }}
                >
                  🚫 Ban User
                </button>
              </div>
            </div>
          )}

          {/* Report Abuse Button */}
          {!showReportForm ? (
            <button
              onClick={() => setShowReportForm(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 500
              }}
            >
              <Flag size={14} /> Report Abuse
            </button>
          ) : (
            <form onSubmit={handleReportSubmit} style={{ width: '100%', marginTop: '10px', textAlign: 'left', borderTop: '1px solid var(--border-glass)', paddingTop: '16px' }}>
              <label htmlFor="reason" style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                Why are you reporting this user?
              </label>
              <input
                id="reason"
                type="text"
                placeholder="e.g. Offensive language or spam"
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-glass)',
                  background: 'var(--bg-app)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  outline: 'none',
                  marginBottom: '10px'
                }}
              />
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowReportForm(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    padding: '6px 12px'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    backgroundColor: 'var(--danger)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    padding: '6px 12px'
                  }}
                >
                  {reportSubmitted ? 'Submitted!' : 'Submit'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default UserProfileModal;
