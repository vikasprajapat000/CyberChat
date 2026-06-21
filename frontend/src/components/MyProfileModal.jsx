// frontend/src/components/MyProfileModal.jsx
import React, { useState, useRef } from 'react';
import { X, Camera, Save, User, Info, FileText } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:5000' : 'https://cyberchat-d26c.onrender.com');

function MyProfileModal({
  user,
  onClose,
  socket,
  connected,
  onUserUpdate,
  showToast
}) {
  const [username, setUsername] = useState(user.username || '');
  const [bio, setBio] = useState(user.bio || '');
  const [statusMsg, setStatusMsg] = useState(user.statusMsg || '');
  
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);

  const profileInputRef = useRef(null);
  const coverInputRef = useRef(null);
  const token = localStorage.getItem('cc_token');

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

  // Upload Profile Photo Handler
  const handleProfilePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('Image size must be less than 5MB', 'error');
      return;
    }

    setUploadingProfile(true);
    const formData = new FormData();
    formData.append('photo', file);

    try {
      const res = await fetch(`${BACKEND_URL}/api/upload/profile-photo`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();
      if (data.success && data.profilePhoto) {
        // Sync local state in App.jsx
        onUserUpdate({ profilePhoto: data.profilePhoto });
        showToast('Profile photo uploaded successfully!', 'success');
      } else {
        showToast(data.error || 'Failed to upload profile photo', 'error');
      }
    } catch (err) {
      console.error('Profile photo upload error:', err);
      showToast('Network error during profile photo upload', 'error');
    } finally {
      setUploadingProfile(false);
    }
  };

  // Upload Cover Photo Handler
  const handleCoverPhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      showToast('Image size must be less than 8MB', 'error');
      return;
    }

    setUploadingCover(true);
    const formData = new FormData();
    formData.append('photo', file);

    try {
      const res = await fetch(`${BACKEND_URL}/api/upload/cover-photo`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();
      if (data.success && data.coverPhoto) {
        // Sync local state in App.jsx
        onUserUpdate({ coverPhoto: data.coverPhoto });
        showToast('Cover photo uploaded successfully!', 'success');
      } else {
        showToast(data.error || 'Failed to upload cover photo', 'error');
      }
    } catch (err) {
      console.error('Cover photo upload error:', err);
      showToast('Network error during cover photo upload', 'error');
    } finally {
      setUploadingCover(false);
    }
  };

  // Save Info (Bio, statusMsg, username) Handler
  const handleDetailsSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      showToast('Username is required', 'warning');
      return;
    }

    setSavingDetails(true);

    try {
      if (connected && socket) {
        socket.emit('edit_profile', {
          username: username.trim(),
          bio: bio.trim(),
          statusMsg: statusMsg.trim(),
          onlineVisibility: user.onlineVisibility || 'visible',
          lastSeenSetting: user.lastSeenSetting || 'everyone'
        });
        
        // Sync local state immediately
        onUserUpdate({
          username: username.trim(),
          bio: bio.trim(),
          statusMsg: statusMsg.trim()
        });
        
        showToast('Profile details updated!', 'success');
        setTimeout(onClose, 800);
      } else {
        showToast('Socket not connected. Details cannot sync.', 'error');
      }
    } catch (err) {
      console.error('Details submit error:', err);
      showToast('Failed to update details', 'error');
    } finally {
      setSavingDetails(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 1000,
      backgroundColor: 'rgba(5, 10, 14, 0.75)',
      backdropFilter: 'blur(10px)',
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
          maxWidth: '450px',
          backgroundColor: 'var(--bg-panel)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          margin: 'auto',
          border: '1.5px solid var(--border-glass)'
        }}
      >
        {/* Cover Photo Banner */}
        <div style={{
          height: '140px',
          width: '100%',
          position: 'relative',
          backgroundImage: user.coverPhoto ? `url(${BACKEND_URL}${user.coverPhoto})` : 'linear-gradient(135deg, rgba(0, 168, 132, 0.3) 0%, rgba(59, 130, 246, 0.2) 100%)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundColor: '#0f172a'
        }}>
          {/* Close button */}
          <button 
            onClick={onClose} 
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              background: 'rgba(5, 10, 14, 0.6)',
              border: 'none',
              cursor: 'pointer',
              color: '#fff',
              display: 'flex',
              padding: '6px',
              borderRadius: '50%',
              zIndex: 10
            }}
          >
            <X size={18} />
          </button>

          {/* Change Cover button overlay */}
          <label style={{
            position: 'absolute',
            bottom: '12px',
            right: '12px',
            backgroundColor: 'rgba(5, 10, 14, 0.65)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '6px',
            padding: '6px 10px',
            color: '#e2e8f0',
            fontSize: '11px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'background-color 0.2s'
          }}>
            <Camera size={13} />
            {uploadingCover ? 'Uploading...' : 'Change Cover'}
            <input 
              type="file" 
              ref={coverInputRef} 
              onChange={handleCoverPhotoChange} 
              accept="image/*" 
              style={{ display: 'none' }} 
            />
          </label>
        </div>

        {/* Profile Details Container */}
        <div style={{ padding: '0 24px 30px 24px', position: 'relative' }}>
          
          {/* Overlapping Profile Photo */}
          <div style={{
            position: 'absolute',
            top: '-45px',
            left: '24px',
            width: '90px',
            height: '90px',
            borderRadius: '50%',
            border: '4px solid var(--bg-panel)',
            boxShadow: 'var(--shadow-md)',
            overflow: 'hidden',
            backgroundColor: '#1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 5
          }}>
            {user.profilePhoto ? (
              <img 
                src={`${BACKEND_URL}${user.profilePhoto}`} 
                alt={user.username} 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              />
            ) : (
              <div 
                className={`initials-avatar ${getAvatarBgClass(user.username)}`}
                style={{ width: '100%', height: '100%', fontSize: '32px' }}
              >
                {getInitials(user.username)}
              </div>
            )}

            {/* Upload Overlay */}
            <label style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(5, 10, 14, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              cursor: 'pointer',
              opacity: 0,
              transition: 'opacity 0.2s'
            }}
            className="profile-photo-hover-overlay"
            onMouseOver={(e) => e.currentTarget.style.opacity = '1'}
            onMouseOut={(e) => e.currentTarget.style.opacity = '0'}
            >
              <Camera size={20} />
              <input 
                type="file" 
                ref={profileInputRef} 
                onChange={handleProfilePhotoChange} 
                accept="image/*" 
                style={{ display: 'none' }} 
              />
            </label>
          </div>

          <div style={{ height: '55px' }} />

          {/* Form */}
          <form onSubmit={handleDetailsSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Header info */}
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
                Profile Identity
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Configure how other nodes decrypt your credentials on the network.
              </p>
            </div>

            {/* Username Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Username</label>
              <input 
                type="text" 
                value={username}
                onChange={e => setUsername(e.target.value)}
                maxLength={20}
                required
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1.5px solid var(--border-glass)',
                  backgroundColor: 'var(--bg-app)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  fontSize: '14px'
                }}
              />
            </div>

            {/* Status Message Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Status Message</label>
              <input 
                type="text" 
                value={statusMsg}
                onChange={e => setStatusMsg(e.target.value)}
                maxLength={30}
                placeholder="Active, In a meeting, Cryptography..."
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1.5px solid var(--border-glass)',
                  backgroundColor: 'var(--bg-app)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  fontSize: '14px'
                }}
              />
            </div>

            {/* Bio/About Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Bio Details</label>
              <textarea 
                value={bio}
                onChange={e => setBio(e.target.value)}
                maxLength={120}
                rows={3}
                placeholder="Write something about your nodes..."
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1.5px solid var(--border-glass)',
                  backgroundColor: 'var(--bg-app)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  fontSize: '14px',
                  resize: 'none',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
              <button 
                type="button" 
                onClick={onClose}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  backgroundColor: 'transparent',
                  color: 'var(--text-secondary)',
                  border: '1.5px solid var(--border-glass)',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={savingDetails || uploadingProfile || uploadingCover}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--primary)',
                  color: '#050a0e',
                  border: 'none',
                  fontWeight: 800,
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 15px rgba(0, 168, 132, 0.3)'
                }}
              >
                <Save size={16} />
                {savingDetails ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default MyProfileModal;
