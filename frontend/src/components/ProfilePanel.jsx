// frontend/src/components/ProfilePanel.jsx
import React, { useState, useRef } from 'react';
import { 
  Settings, Camera, Shield, Crown, Link, Heart, Users, MapPin, 
  Sparkles, Calendar, BadgeCheck, FileText, CheckCircle2, ChevronRight,
  TrendingUp, Award, Activity
} from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:5000' : 'https://cyberchat-d26c.onrender.com');

export default function ProfilePanel({
  user,
  socket,
  connected,
  onUserUpdate,
  showToast,
  setActiveTab,
  onlineUsers,
  rooms
}) {
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const profileInputRef = useRef(null);
  const coverInputRef = useRef(null);
  const token = localStorage.getItem('cc_token');

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
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (data.success && data.profilePhoto) {
        onUserUpdate({ profilePhoto: data.profilePhoto });
        showToast('Profile photo updated!', 'success');
      } else {
        showToast(data.error || 'Failed to upload photo', 'error');
      }
    } catch (err) {
      showToast('Network error during upload', 'error');
    } finally {
      setUploadingProfile(false);
    }
  };

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
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (data.success && data.coverPhoto) {
        onUserUpdate({ coverPhoto: data.coverPhoto });
        showToast('Cover photo updated!', 'success');
      } else {
        showToast(data.error || 'Failed to upload cover', 'error');
      }
    } catch (err) {
      showToast('Network error during upload', 'error');
    } finally {
      setUploadingCover(false);
    }
  };

  // Mock stats
  const contactsCount = user.contacts?.length || 0;
  const groupsCount = rooms.filter(r => r.members?.includes(user.id) || r.creatorId === user.id).length;
  const isPremium = user.premiumTier && user.premiumTier !== 'free';

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: 'var(--bg-app)',
      overflowY: 'auto',
      position: 'relative'
    }}>
      {/* 1. Header Banner & Settings gear */}
      <div style={{
        height: '180px',
        width: '100%',
        position: 'relative',
        backgroundImage: user.coverPhoto ? `url(${BACKEND_URL}${user.coverPhoto})` : 'linear-gradient(135deg, rgba(0, 168, 132, 0.4) 0%, rgba(168, 85, 247, 0.3) 100%)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundColor: '#050a0e',
        flexShrink: 0
      }}>
        {/* Settings button overlay */}
        <button
          onClick={() => setActiveTab('settings')}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'rgba(5, 10, 14, 0.65)',
            backdropFilter: 'blur(8px)',
            border: '1.5px solid var(--border-glass)',
            cursor: 'pointer',
            color: '#fff',
            display: 'flex',
            padding: '10px',
            borderRadius: '50%',
            zIndex: 10,
            transition: 'transform 0.2s',
            boxShadow: 'var(--shadow-md)'
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'rotate(45deg)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'rotate(0)'}
        >
          <Settings size={20} />
        </button>

        {/* Change Cover Camera button */}
        <label style={{
          position: 'absolute',
          bottom: '12px',
          right: '12px',
          backgroundColor: 'rgba(5, 10, 14, 0.7)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '20px',
          padding: '6px 12px',
          color: '#fff',
          fontSize: '11px',
          fontWeight: 700,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <Camera size={13} />
          <span>{uploadingCover ? 'Syncing...' : 'Edit Cover'}</span>
          <input type="file" ref={coverInputRef} onChange={handleCoverPhotoChange} accept="image/*" style={{ display: 'none' }} />
        </label>
      </div>

      {/* 2. Main Profile Info */}
      <div style={{
        padding: '0 20px 24px 20px',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        marginTop: '-50px'
      }}>
        {/* Avatar badge */}
        <div style={{
          width: '100px',
          height: '100px',
          borderRadius: '50%',
          border: '4px solid var(--bg-panel)',
          boxShadow: 'var(--shadow-md)',
          overflow: 'hidden',
          backgroundColor: 'var(--bg-panel)',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 5
        }}>
          {user.profilePhoto ? (
            <img src={`${BACKEND_URL}${user.profilePhoto}`} alt="User profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div className={`initials-avatar ${getAvatarBgClass(user.username)}`} style={{ width: '100%', height: '100%', fontSize: '36px' }}>
              {getInitials(user.username)}
            </div>
          )}

          {/* Upload camera overlay */}
          <label style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(5, 10, 14, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            cursor: 'pointer',
            opacity: 0,
            transition: 'opacity 0.2s',
            zIndex: 6
          }}
          className="profile-photo-upload-label"
          onMouseOver={(e) => e.currentTarget.style.opacity = '1'}
          onMouseOut={(e) => e.currentTarget.style.opacity = '0'}
          >
            <Camera size={22} />
            <input type="file" ref={profileInputRef} onChange={handleProfilePhotoChange} accept="image/*" style={{ display: 'none' }} />
          </label>
        </div>

        {/* Verification pulse badge */}
        {user.isVerified && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            backgroundColor: 'var(--primary-light)',
            color: 'var(--primary)',
            padding: '3px 8px',
            borderRadius: '12px',
            fontSize: '10px',
            fontWeight: 700,
            marginTop: '8px',
            border: '1px solid var(--primary)'
          }}>
            <BadgeCheck size={12} fill="var(--primary)" stroke="var(--bg-panel)" />
            <span>VERIFIED IDENTITY</span>
          </div>
        )}

        {/* Username Details */}
        <h2 style={{
          fontSize: '22px',
          fontWeight: 800,
          fontFamily: 'Outfit, sans-serif',
          color: 'var(--text-primary)',
          marginTop: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          {user.displayName || user.username}
          {isPremium && <Crown size={18} style={{ color: '#a855f7' }} fill="#a855f7" />}
        </h2>
        
        <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
          @{user.username}
        </span>

        {/* Status vibe bubble */}
        <div style={{
          marginTop: '10px',
          backgroundColor: 'var(--bg-panel)',
          border: '1.5px solid var(--border-glass)',
          padding: '6px 16px',
          borderRadius: '20px',
          fontSize: '12px',
          color: 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--success)' }} />
          <span>Vibe: <strong>{user.statusMsg || 'Active'}</strong></span>
        </div>

        {/* User Stats Count row */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-around',
          width: '100%',
          maxWidth: '320px',
          marginTop: '20px',
          padding: '12px',
          borderRadius: '14px',
          backgroundColor: 'var(--bg-panel)',
          border: '1px solid var(--border-glass)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>{contactsCount}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Contacts</div>
          </div>
          <div style={{ width: '1px', backgroundColor: 'var(--border-glass)' }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>{groupsCount}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Groups</div>
          </div>
          <div style={{ width: '1px', backgroundColor: 'var(--border-glass)' }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>{isPremium ? 'PRO' : 'FREE'}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase' }}>Plan</div>
          </div>
        </div>

        {/* Bio text block */}
        <div style={{
          width: '100%',
          marginTop: '20px',
          textAlign: 'center',
          padding: '0 10px'
        }}>
          <p style={{
            fontSize: '13px',
            lineHeight: '1.5',
            color: 'var(--text-secondary)',
            fontStyle: user.bio ? 'normal' : 'italic'
          }}>
            {user.bio || '"Hey there! I\'m using CyberChat to encrypt my node traffic."'}
          </p>
        </div>

        {/* Premium Upgrade Badge Banner */}
        {!isPremium && (
          <div 
            onClick={() => setActiveTab('premium')}
            style={{
              width: '100%',
              marginTop: '20px',
              padding: '16px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #a855f7 0%, #3b82f6 100%)',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 8px 24px rgba(168, 85, 247, 0.25)',
              transition: 'transform 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ background: 'rgba(255, 255, 255, 0.2)', padding: '8px', borderRadius: '50%' }}>
                <Crown size={20} style={{ color: '#fff' }} />
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 800, fontSize: '14px' }}>Upgrade to Cyber Premium</div>
                <div style={{ fontSize: '11px', opacity: 0.9 }}>Exclusive avatars, themes, and unlimited AI assistant</div>
              </div>
            </div>
            <ChevronRight size={18} />
          </div>
        )}

        {/* Premium Active display badge */}
        {isPremium && (
          <div style={{
            width: '100%',
            marginTop: '20px',
            padding: '16px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #120c1f 0%, #201335 100%)',
            border: '1.5px solid #a855f7',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 8px 32px rgba(168, 85, 247, 0.15)'
          }}>
            <div style={{ background: 'rgba(168, 85, 247, 0.2)', padding: '8px', borderRadius: '50%', border: '1px solid #a855f7' }}>
              <Crown size={20} style={{ color: '#a855f7' }} />
            </div>
            <div style={{ textAlign: 'left', flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: '14px', color: '#e2d5ff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                Cyber Premium Active <Sparkles size={13} fill="#a855f7" stroke="none" />
              </div>
              <div style={{ fontSize: '11px', color: '#c5b8df' }}>Tier: {user.premiumTier?.toUpperCase()} · Expires soon</div>
            </div>
          </div>
        )}
        
        {/* Social Feed highlights grid */}
        <div style={{ width: '100%', marginTop: '24px' }}>
          <h4 style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '12px', textAlign: 'left', letterSpacing: '0.05em' }}>
            System Statistics & Badges
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={16} style={{ color: 'var(--primary)' }} />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Activity Rating</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>Outstanding</div>
              </div>
            </div>
            <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: 'var(--bg-panel)', border: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Award size={16} style={{ color: 'var(--warning)' }} />
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Node Standing</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>Secure Tier 1</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
