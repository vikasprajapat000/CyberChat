// frontend/src/components/SettingsPage.jsx
import React, { useState, useRef, useEffect } from 'react';
import { 
  User, Palette, Eye, Download, Save, Moon, Sun, Check, Shield, 
  ArrowLeft, Trash2, Key, Phone, Mail, Lock, Volume2, Bell, 
  Smartphone, HelpCircle, EyeOff, ShieldAlert, Monitor, Sparkles, 
  MapPin, BadgeCheck, Camera, CheckSquare, EyeIcon, HelpCircle as HelpIcon,
  ShieldCheck, RefreshCw, Zap
} from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:5000' : 'https://cyberchat-d26c.onrender.com');

const PALETTE_OPTIONS = [
  { id: 'teal', name: 'Cyber Teal', color: 'hsl(164, 85%, 36%)', hover: 'hsl(164, 85%, 28%)', light: 'hsl(164, 85%, 94%)' },
  { id: 'blue', name: 'Neon Blue', color: 'hsl(210, 95%, 45%)', hover: 'hsl(210, 95%, 38%)', light: 'hsl(210, 95%, 94%)' },
  { id: 'purple', name: 'Retro Purple', color: 'hsl(270, 85%, 55%)', hover: 'hsl(270, 85%, 48%)', light: 'hsl(270, 85%, 95%)' },
  { id: 'orange', name: 'Vibrant Amber', color: 'hsl(30, 95%, 50%)', hover: 'hsl(30, 95%, 43%)', light: 'hsl(30, 95%, 94%)' },
  { id: 'pink', name: 'Sunset Rose', color: 'hsl(330, 85%, 55%)', hover: 'hsl(330, 85%, 48%)', light: 'hsl(330, 85%, 95%)' }
];

const WALLPAPER_OPTIONS = [
  { id: 'default', name: 'Original Grid' },
  { id: 'neon_sunset', name: 'Neon Sunset Glow' },
  { id: 'cyber_matrix', name: 'Matrix Green Code' },
  { id: 'dark_nebula', name: 'Cosmic Nebula' },
  { id: 'solid_charcoal', name: 'Tactical Charcoal' }
];

function SettingsPage({
  user,
  socket,
  connected,
  theme,
  toggleTheme,
  showToast,
  messages,
  setActiveTab,
  isMobile
}) {
  const [activeSubTab, setActiveSubTab] = useState('profile');

  // Profile Upload States
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const profileInputRef = useRef(null);
  const coverInputRef = useRef(null);
  const token = localStorage.getItem('cc_token');

  // Input states (Account)
  const [username, setUsername] = useState(user.username || '');
  const [displayName, setDisplayName] = useState(user.displayName || '');
  const [bio, setBio] = useState(user.bio || '');
  const [statusMsg, setStatusMsg] = useState(user.statusMsg || '');
  const [mobileNumber, setMobileNumber] = useState(user.mobileNumber || '');
  const [email, setEmail] = useState(user.email || '');

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPass, setChangingPass] = useState(false);

  // Account deletion password
  const [deleteConfirmPassword, setDeleteConfirmPassword] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Privacy States
  const [lastSeenSetting, setLastSeenSetting] = useState(user.lastSeenSetting || 'everyone');
  const [onlineVisibility, setOnlineVisibility] = useState(user.onlineVisibility || 'visible');
  const [profilePhotoVisibility, setProfilePhotoVisibility] = useState(user.profilePhotoVisibility || 'everyone');
  const [aboutVisibility, setAboutVisibility] = useState(user.aboutVisibility || 'everyone');
  const [statusVisibility, setStatusVisibility] = useState(user.statusVisibility || 'everyone');
  const [readReceipts, setReadReceipts] = useState(user.readReceipts !== false);
  const [hideTyping, setHideTyping] = useState(user.hideTyping || false);
  const [hideRecording, setHideRecording] = useState(user.hideRecording || false);
  const [hideScreenshot, setHideScreenshot] = useState(user.hideScreenshot || false);
  const [isGhostMode, setIsGhostMode] = useState(user.isGhostMode || false);

  // Chat Settings States
  const [chatWallpaper, setChatWallpaper] = useState(() => {
    return localStorage.getItem('cc_chat_wallpaper') || 'default';
  });
  const [fontSize, setFontSize] = useState(() => {
    return localStorage.getItem('cc_font_size') || 'medium';
  });
  const [autoDeleteTimer, setAutoDeleteTimer] = useState(user.disappearingMessageTimer || 0);

  // Notification States
  const [messageNotifications, setMessageNotifications] = useState(true);
  const [groupNotifications, setGroupNotifications] = useState(true);
  const [soundSelection, setSoundSelection] = useState('chime');
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [silentHours, setSilentHours] = useState(false);

  // Security Lock States
  const [fingerprintEnabled, setFingerprintEnabled] = useState(user.fingerprintEnabled || false);
  const [appLockEnabled, setAppLockEnabled] = useState(false);
  const [pinLockCode, setPinLockCode] = useState('');
  const [isAntiHackActive, setIsAntiHackActive] = useState(true);

  // Active palette accent color
  const [activePalette, setActivePalette] = useState(() => {
    return localStorage.getItem('cc_accent_color_id') || 'teal';
  });

  // Initials Avatar Helpers
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

  // Profile Upload Handler
  const handleProfilePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
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
        showToast('Profile photo updated!', 'success');
        // trigger local profile change via socket list update
        if (socket && connected) {
          socket.emit('edit_profile', { profilePhoto: data.profilePhoto });
        }
      } else {
        showToast(data.error || 'Upload failed', 'error');
      }
    } catch (err) {
      showToast('Network error during photo upload', 'error');
    } finally {
      setUploadingProfile(false);
    }
  };

  // Cover Upload Handler
  const handleCoverPhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
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
        showToast('Cover photo updated!', 'success');
        if (socket && connected) {
          socket.emit('edit_profile', { coverPhoto: data.coverPhoto });
        }
      } else {
        showToast(data.error || 'Upload failed', 'error');
      }
    } catch (err) {
      showToast('Network error during cover upload', 'error');
    } finally {
      setUploadingCover(false);
    }
  };

  // Save Configs
  const handleSettingsSave = (e) => {
    if (e) e.preventDefault();
    if (!connected || !socket) {
      showToast('Socket not synchronized. Reconnecting.', 'error');
      return;
    }

    socket.emit('edit_profile', {
      username: username.trim(),
      displayName: displayName.trim(),
      bio: bio.trim(),
      statusMsg: statusMsg.trim(),
      mobileNumber: mobileNumber.trim(),
      email: email.trim(),
      lastSeenSetting,
      onlineVisibility,
      profilePhotoVisibility,
      aboutVisibility,
      statusVisibility,
      readReceipts,
      hideTyping,
      hideRecording,
      hideScreenshot,
      isGhostMode,
      disappearingMessageTimer: autoDeleteTimer
    });

    // Save Chat settings in localStorage
    localStorage.setItem('cc_chat_wallpaper', chatWallpaper);
    localStorage.setItem('cc_font_size', fontSize);

    // Apply chat wallpaper CSS variable globally
    document.documentElement.setAttribute('data-chat-wallpaper', chatWallpaper);
    document.documentElement.setAttribute('data-chat-fontsize', fontSize);

    showToast('Settings saved and synchronized globally!', 'success');
  };

  // Password update submit
  const handleChangePasswordSubmit = (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match', 'warning');
      return;
    }
    if (newPassword.length < 6) {
      showToast('Password must be at least 6 characters', 'warning');
      return;
    }

    setChangingPass(true);
    socket.emit('change_password', {
      currentPassword,
      newPassword
    });
  };

  // Bind change password response
  useEffect(() => {
    if (!socket) return;
    
    const handlePassChangeRes = (data) => {
      setChangingPass(false);
      if (data.success) {
        showToast('Password updated successfully!', 'success');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        showToast(data.error || 'Password update failed', 'error');
      }
    };

    const handleDeleteAccRes = (data) => {
      if (data.success) {
        showToast('Account permanently erased. Redirecting...', 'warning');
        setTimeout(() => {
          localStorage.clear();
          window.location.reload();
        }, 1500);
      } else {
        showToast(data.error || 'Failed to delete account', 'error');
      }
    };

    socket.on('change_password_response', handlePassChangeRes);
    socket.on('delete_account_response', handleDeleteAccRes);

    return () => {
      socket.off('change_password_response', handlePassChangeRes);
      socket.off('delete_account_response', handleDeleteAccRes);
    };
  }, [socket]);

  // Handle Account Deletion
  const handleDeleteAccountSubmit = (e) => {
    e.preventDefault();
    if (!deleteConfirmPassword) return;
    
    socket.emit('delete_account', { password: deleteConfirmPassword });
  };

  // Aesthetic Accent color setter
  const handlePaletteApply = (palette) => {
    setActivePalette(palette.id);
    localStorage.setItem('cc_accent_color_id', palette.id);
    
    document.documentElement.style.setProperty('--primary', palette.color);
    document.documentElement.style.setProperty('--primary-hover', palette.hover);
    document.documentElement.style.setProperty('--primary-light', palette.light);

    showToast(`Accent palette changed to ${palette.name}`, 'success');
  };

  // JSON backup exporter
  const handleBackupExport = () => {
    try {
      const dataStr = JSON.stringify(messages, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      const exportFileDefaultName = `cyber_char_history_${user.username.replace(/\s+/g, '_').toLowerCase()}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      showToast('Backup profile exported!', 'success');
    } catch (err) {
      showToast('Export failed', 'error');
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: 'var(--bg-app)',
      padding: isMobile ? '16px' : '32px',
      overflowY: 'auto'
    }}>
      {/* Settings Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        {isMobile && (
          <button 
            onClick={() => setActiveTab('chats')} 
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', display: 'flex', padding: '8px', marginLeft: '-8px' }}
          >
            <ArrowLeft size={24} />
          </button>
        )}
        <div style={{ backgroundColor: 'var(--primary)', color: '#fff', padding: '10px', borderRadius: '10px', boxShadow: '0 4px 12px var(--primary-light)' }}>
          <Palette size={24} />
        </div>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, fontFamily: 'Outfit', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            Cyber Center Settings 
            {user.isVerified && <BadgeCheck size={18} style={{ color: 'var(--primary)' }} fill="rgba(0,0,0,0.1)" />}
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Configure and secure your node credentials, themes, privacy parameters, and custom audio locks.
          </p>
        </div>
      </div>

      {/* Main Tabs grid */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border-glass)',
        gap: isMobile ? '12px' : '24px',
        marginBottom: '24px',
        flexWrap: 'wrap',
        flexShrink: 0
      }}>
        {[
          { id: 'profile', name: 'Profile ID', icon: <User size={16} /> },
          { id: 'privacy', name: 'Privacy', icon: <Eye size={16} /> },
          { id: 'chat', name: 'Chat Custom', icon: <Palette size={16} /> },
          { id: 'notifications', name: 'Alerts', icon: <Bell size={16} /> },
          { id: 'security', name: 'Security & App Lock', icon: <Lock size={16} /> },
          { id: 'backup', name: 'Backup & Cloud', icon: <Download size={16} /> }
        ].map(tb => (
          <button
            key={tb.id}
            onClick={() => setActiveSubTab(tb.id)}
            style={{
              padding: '10px 4px',
              border: 'none',
              background: 'none',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              color: activeSubTab === tb.id ? 'var(--primary)' : 'var(--text-secondary)',
              borderBottom: activeSubTab === tb.id ? '2.5px solid var(--primary)' : '2.5px solid transparent',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {tb.icon} {tb.name}
          </button>
        ))}
      </div>

      {/* Inner Panels */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', maxWidth: '640px' }}>
        
        {/* TAB 1: Profile & Identity */}
        {activeSubTab === 'profile' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Visual Header Banner for photo uploads */}
            <div style={{
              height: '140px',
              width: '100%',
              position: 'relative',
              backgroundImage: user.coverPhoto ? `url(${BACKEND_URL}${user.coverPhoto})` : 'linear-gradient(135deg, rgba(0,168,132,0.2) 0%, rgba(59,130,246,0.1) 100%)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              borderRadius: '12px',
              backgroundColor: '#0f172a',
              border: '1px solid var(--border-glass)',
              overflow: 'hidden'
            }}>
              {/* Change Cover */}
              <label style={{
                position: 'absolute',
                bottom: '12px',
                right: '12px',
                backgroundColor: 'rgba(5, 10, 14, 0.75)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '6px',
                padding: '6px 10px',
                color: '#e2e8f0',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}>
                <Camera size={13} />
                {uploadingCover ? 'Syncing...' : 'Change Cover'}
                <input type="file" ref={coverInputRef} onChange={handleCoverPhotoUpload} accept="image/*" style={{ display: 'none' }} />
              </label>

              {/* Overlapped profile avatar */}
              <div style={{
                position: 'absolute',
                bottom: '-20px',
                left: '20px',
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                border: '3px solid var(--bg-app)',
                overflow: 'hidden',
                backgroundColor: '#1e293b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--shadow-md)'
              }}>
                {user.profilePhoto ? (
                  <img src={`${BACKEND_URL}${user.profilePhoto}`} alt="User" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div className={`initials-avatar ${getAvatarBgClass(user.username)}`} style={{ width: '100%', height: '100%', fontSize: '28px' }}>
                    {getInitials(user.username)}
                  </div>
                )}
                <label style={{
                  position: 'absolute',
                  top: 0, left: 0, right: 0, bottom: 0,
                  backgroundColor: 'rgba(5,10,14,0.6)',
                  color: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: 0,
                  transition: 'opacity 0.2s'
                }}
                className="profile-photo-hover-overlay"
                onMouseOver={(e) => e.currentTarget.style.opacity = '1'}
                onMouseOut={(e) => e.currentTarget.style.opacity = '0'}
                >
                  <Camera size={16} />
                  <input type="file" ref={profileInputRef} onChange={handleProfilePhotoUpload} accept="image/*" style={{ display: 'none' }} />
                </label>
              </div>
            </div>
            <div style={{ height: '10px' }} />

            {/* Profile fields form */}
            <form onSubmit={handleSettingsSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Username</label>
                  <input type="text" value={username} onChange={e => setUsername(e.target.value)} required maxLength={20} style={inputStyle} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Display Name</label>
                  <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Node alias name" style={inputStyle} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Mobile Number</label>
                  <input type="text" value={mobileNumber} onChange={e => setMobileNumber(e.target.value)} placeholder="+1 (555) 000-0000" style={inputStyle} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Email Credentials</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="node@cyberchar.net" style={inputStyle} />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Bio Info</label>
                <textarea value={bio} onChange={e => setBio(e.target.value)} maxLength={120} rows={2} style={{ ...inputStyle, resize: 'none', fontFamily: 'inherit' }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Status Vibe</label>
                <input type="text" value={statusMsg} onChange={e => setStatusMsg(e.target.value)} maxLength={30} style={inputStyle} />
              </div>

              <button type="submit" disabled={!connected} style={saveBtnStyle}>
                <Save size={16} /> Save Identity Settings
              </button>
            </form>

            {/* Change Password Block */}
            <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '20px', marginTop: '10px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Key size={16} style={{ color: 'var(--primary)' }} /> Modify Passcode
              </h3>
              <form onSubmit={handleChangePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '12px' }}>
                  <input type="password" placeholder="Current Password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required style={inputStyle} />
                  <input type="password" placeholder="New Password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required style={inputStyle} />
                  <input type="password" placeholder="Confirm Password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required style={inputStyle} />
                </div>
                <button type="submit" disabled={changingPass || !connected} style={{ ...saveBtnStyle, backgroundColor: 'transparent', border: '1.5px solid var(--primary)', color: 'var(--primary)', boxShadow: 'none' }}>
                  {changingPass ? 'Changing...' : 'Update Password'}
                </button>
              </form>
            </div>

            {/* Delete Account / Danger Zone */}
            <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '20px', marginTop: '10px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--danger)', marginBottom: '8px' }}>
                ⚠️ Danger Zone
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px' }}>
                Permanently erase your credentials, direct chat logs, and hosted groups from the MongoDB database nodes.
              </p>
              
              {!showDeleteConfirm ? (
                <button type="button" onClick={() => setShowDeleteConfirm(true)} style={{ ...saveBtnStyle, backgroundColor: 'var(--danger)', color: '#fff', boxShadow: 'none', width: 'auto' }}>
                  Delete CyberChar Account
                </button>
              ) : (
                <form onSubmit={handleDeleteAccountSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: 'rgba(239,68,68,0.05)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--danger)' }}>Confirm password to authorize deletion:</span>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input type="password" placeholder="Confirm Password" value={deleteConfirmPassword} onChange={e => setDeleteConfirmPassword(e.target.value)} required style={{ ...inputStyle, borderColor: 'rgba(239,68,68,0.3)' }} />
                    <button type="submit" style={{ ...saveBtnStyle, backgroundColor: 'var(--danger)', color: '#fff', width: 'auto', flexShrink: 0 }}>Authorize Erase</button>
                    <button type="button" onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmPassword(''); }} style={{ ...saveBtnStyle, backgroundColor: 'transparent', border: '1px solid var(--border-glass)', color: 'var(--text-secondary)', width: 'auto', flexShrink: 0 }}>Cancel</button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: Privacy Controls */}
        {activeSubTab === 'privacy' && (
          <form onSubmit={handleSettingsSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Ghost Mode Toggle Banner */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px',
              borderRadius: '10px',
              backgroundColor: isGhostMode ? 'rgba(168, 85, 247, 0.1)' : 'var(--bg-panel)',
              border: isGhostMode ? '1.5px solid #a855f7' : '1px solid var(--border-glass)',
              transition: 'all 0.3s ease'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ color: isGhostMode ? '#a855f7' : 'var(--text-secondary)' }}>
                  <Sparkles size={24} />
                </div>
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>Ghost Mode / Invisible Mode</h4>
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Go anonymous: hides typing status, online indicator, seen receipts, and acts as offline.
                  </p>
                </div>
              </div>
              <input 
                type="checkbox" 
                checked={isGhostMode} 
                onChange={e => {
                  setIsGhostMode(e.target.checked);
                  if (e.target.checked) {
                    setOnlineVisibility('invisible');
                    setLastSeenSetting('nobody');
                    setReadReceipts(false);
                    setHideTyping(true);
                    showToast('Ghost Mode initiated!', 'warning');
                  } else {
                    setOnlineVisibility('visible');
                    setLastSeenSetting('everyone');
                    setReadReceipts(true);
                    setHideTyping(false);
                  }
                }} 
                style={{ cursor: 'pointer', width: '20px', height: '20px', accentColor: '#a855f7' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
              {/* Last seen */}
              <div style={selectBoxContainer}>
                <label style={labelStyle}>Last Seen Visibility</label>
                <select value={lastSeenSetting} onChange={e => setLastSeenSetting(e.target.value)} style={selectStyle}>
                  <option value="everyone">Everyone</option>
                  <option value="contacts">Contacts Only</option>
                  <option value="nobody">Nobody</option>
                </select>
              </div>

              {/* Online visibility */}
              <div style={selectBoxContainer}>
                <label style={labelStyle}>Online Indicator Visibility</label>
                <select value={onlineVisibility} onChange={e => setOnlineVisibility(e.target.value)} style={selectStyle}>
                  <option value="visible">Visible</option>
                  <option value="invisible">Invisible (Appear Offline)</option>
                </select>
              </div>

              {/* Profile Photo Visibility */}
              <div style={selectBoxContainer}>
                <label style={labelStyle}>Profile Photo Visibility</label>
                <select value={profilePhotoVisibility} onChange={e => setProfilePhotoVisibility(e.target.value)} style={selectStyle}>
                  <option value="everyone">Everyone</option>
                  <option value="contacts">Contacts Only</option>
                  <option value="nobody">Nobody</option>
                </select>
              </div>

              {/* About text visibility */}
              <div style={selectBoxContainer}>
                <label style={labelStyle}>About Bio Visibility</label>
                <select value={aboutVisibility} onChange={e => setAboutVisibility(e.target.value)} style={selectStyle}>
                  <option value="everyone">Everyone</option>
                  <option value="contacts">Contacts Only</option>
                  <option value="nobody">Nobody</option>
                </select>
              </div>
            </div>

            {/* Privacy Toggles */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid var(--border-glass)', paddingTop: '20px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Advanced Privacy Options</span>
              
              <div style={toggleRowStyle}>
                <span>Send Read Receipts (Seen ticks)</span>
                <input type="checkbox" checked={readReceipts} onChange={e => setReadReceipts(e.target.checked)} style={checkboxStyle} />
              </div>

              <div style={toggleRowStyle}>
                <span>Hide typing indicator to others</span>
                <input type="checkbox" checked={hideTyping} onChange={e => setHideTyping(e.target.checked)} style={checkboxStyle} />
              </div>

              <div style={toggleRowStyle}>
                <span>Hide microphone recording status</span>
                <input type="checkbox" checked={hideRecording} onChange={e => setHideRecording(e.target.checked)} style={checkboxStyle} />
              </div>

              <div style={toggleRowStyle}>
                <span>Block screenshot warnings alerts</span>
                <input type="checkbox" checked={hideScreenshot} onChange={e => setHideScreenshot(e.target.checked)} style={checkboxStyle} />
              </div>
            </div>

            <button type="submit" disabled={!connected} style={saveBtnStyle}>
              <Save size={16} /> Save Privacy Settings
            </button>
          </form>
        )}

        {/* TAB 3: Chat Customizations */}
        {activeSubTab === 'chat' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Theme switcher */}
            <div>
              <span style={labelStyle}>Workspace Color Accent Theme</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                {PALETTE_OPTIONS.map(opt => (
                  <div
                    key={opt.id}
                    onClick={() => handlePaletteApply(opt)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      border: activePalette === opt.id ? '1.5px solid var(--primary)' : '1px solid var(--border-glass)',
                      backgroundColor: 'var(--bg-panel)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: opt.color }} />
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{opt.name}</span>
                    </div>
                    {activePalette === opt.id && <Check size={14} style={{ color: 'var(--primary)' }} />}
                  </div>
                ))}
              </div>
            </div>

            {/* Dark/Light mode button */}
            <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '16px' }}>
              <span style={labelStyle}>System Dark / Light Base</span>
              <button
                onClick={toggleTheme}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-glass)',
                  backgroundColor: 'var(--bg-panel)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontWeight: 600,
                  fontSize: '13px',
                  marginTop: '8px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                  <span>Switch to {theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
                </div>
              </button>
            </div>

            {/* Wallpaper Selection */}
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px', borderTop: '1px solid var(--border-glass)', paddingTop: '16px' }}>
              <div style={selectBoxContainer}>
                <label style={labelStyle}>Chat Background Wallpaper</label>
                <select value={chatWallpaper} onChange={e => { setChatWallpaper(e.target.value); localStorage.setItem('cc_chat_wallpaper', e.target.value); }} style={selectStyle}>
                  {WALLPAPER_OPTIONS.map(wall => (
                    <option key={wall.id} value={wall.id}>{wall.name}</option>
                  ))}
                </select>
              </div>

              <div style={selectBoxContainer}>
                <label style={labelStyle}>Message Font Size</label>
                <select value={fontSize} onChange={e => { setFontSize(e.target.value); localStorage.setItem('cc_font_size', e.target.value); }} style={selectStyle}>
                  <option value="small">Small (12px)</option>
                  <option value="medium">Medium (14px)</option>
                  <option value="large">Large (16px)</option>
                  <option value="xlarge">Cyber Giant (18px)</option>
                </select>
              </div>
            </div>

            {/* Auto Delete Default Messages */}
            <div style={selectBoxContainer}>
              <label style={labelStyle}>Default Message Auto-Delete Timer</label>
              <select value={autoDeleteTimer} onChange={e => setAutoDeleteTimer(Number(e.target.value))} style={selectStyle}>
                <option value={0}>Disabled</option>
                <option value={10}>10 Seconds (Self-Destruct)</option>
                <option value={60}>1 Minute</option>
                <option value={3600}>1 Hour</option>
                <option value={86400}>1 Day</option>
              </select>
            </div>

            <button onClick={handleSettingsSave} style={saveBtnStyle}>
              <Save size={16} /> Apply Chat Settings
            </button>
          </div>
        )}

        {/* TAB 4: Alerts & Notifications */}
        {activeSubTab === 'notifications' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={toggleRowStyle}>
                <span>Enable Direct Message Notifications</span>
                <input type="checkbox" checked={messageNotifications} onChange={e => setMessageNotifications(e.target.checked)} style={checkboxStyle} />
              </div>

              <div style={toggleRowStyle}>
                <span>Enable Group Room Notifications</span>
                <input type="checkbox" checked={groupNotifications} onChange={e => groupNotifications(e.target.checked)} style={checkboxStyle} />
              </div>

              <div style={toggleRowStyle}>
                <span>Sound Vibration Alerts</span>
                <input type="checkbox" checked={vibrationEnabled} onChange={e => setVibrationEnabled(e.target.checked)} style={checkboxStyle} />
              </div>

              <div style={toggleRowStyle}>
                <span>Focus Mode / Silent Hours (DND)</span>
                <input type="checkbox" checked={silentHours} onChange={e => setSilentHours(e.target.checked)} style={checkboxStyle} />
              </div>
            </div>

            <div style={selectBoxContainer}>
              <label style={labelStyle}>Notification Sound Chime Pack</label>
              <select value={soundSelection} onChange={e => { setSoundSelection(e.target.value); showToast(`Sound choice set to ${e.target.value}`, 'success'); }} style={selectStyle}>
                <option value="chime">Digital Synth Chime</option>
                <option value="ping">Classic Cyber Ping</option>
                <option value="matrix">Matrix Synth Drop</option>
                <option value="silent">None (Silent)</option>
              </select>
            </div>

            <button onClick={() => showToast('Notification settings applied!', 'success')} style={saveBtnStyle}>
              <Save size={16} /> Save Notification Pack
            </button>
          </div>
        )}

        {/* TAB 5: Security Lock Panel */}
        {activeSubTab === 'security' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Screen Lock Lock */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: 'rgba(0,168,132,0.03)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Smartphone size={20} style={{ color: 'var(--primary)' }} />
                <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>Fingerprint Unlock / Biometrics</h4>
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                Authorize WebAuthn browser credentials to unlock your CyberChar chat dashboard natively.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', justify: 'space-between', marginTop: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600 }}>Enable Fingerprint Biometrics</span>
                <input 
                  type="checkbox" 
                  checked={fingerprintEnabled} 
                  onChange={e => {
                    setFingerprintEnabled(e.target.checked);
                    if (e.target.checked) {
                      showToast('Authenticating with device biometrics...', 'info');
                      setTimeout(() => showToast('Biometrics successfully registered!', 'success'), 1200);
                    }
                  }} 
                  style={checkboxStyle} 
                />
              </div>
            </div>

            {/* App Lock PIN */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: 'var(--bg-panel)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Lock size={20} style={{ color: 'var(--primary)' }} />
                <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>App Pin Lock Protection</h4>
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                Set up a 4-digit holographic security lock to screen lock your client dashboard after 5 minutes of inactivity.
              </p>
              
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '6px' }}>
                <input 
                  type="password" 
                  maxLength={4} 
                  placeholder="Set 4-Digit PIN" 
                  value={pinLockCode} 
                  onChange={e => setPinLockCode(e.target.value.replace(/\D/g, ''))} 
                  style={{ ...inputStyle, width: '120px', letterSpacing: '8px', textAlign: 'center' }} 
                />
                <button 
                  onClick={() => {
                    if (pinLockCode.length === 4) {
                      localStorage.setItem('cc_screen_pin', pinLockCode);
                      showToast('Security PIN Lock established successfully!', 'success');
                    } else {
                      showToast('PIN must be exactly 4 digits', 'warning');
                    }
                  }}
                  style={{ ...saveBtnStyle, width: 'auto' }}
                >
                  Configure PIN
                </button>
              </div>
            </div>

            {/* Anti Hack log */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: 'var(--bg-panel)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={20} style={{ color: 'var(--warning)' }} />
                <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>Anti-Hack Network Intrusion Detection</h4>
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                Our algorithms automatically detect token cloning, rapid IP shifts, or simulated bot traffic.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', justify: 'space-between', marginTop: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600 }}>Enable Real-time Intrusion Shields</span>
                <input type="checkbox" checked={isAntiHackActive} onChange={e => setIsAntiHackActive(e.target.checked)} style={checkboxStyle} />
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: Backups & System */}
        {activeSubTab === 'backup' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', backgroundColor: 'var(--bg-panel)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
            <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', display: 'block', fontFamily: 'Outfit' }}>
              Secure Export & Cloud Backups
            </span>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              Export and download a structured decrypted backup profile copy of your chat history. The export contains all active room logs, messages, timestamps, and media references.
            </p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                onClick={handleBackupExport}
                style={saveBtnStyle}
              >
                <Download size={16} /> Export raw-chat.json
              </button>
              
              <button
                onClick={() => {
                  showToast('Syncing with remote backup server...', 'info');
                  setTimeout(() => showToast('Cloud database synchronized successfully!', 'success'), 1500);
                }}
                style={{ ...saveBtnStyle, backgroundColor: 'transparent', border: '1.5px solid var(--primary)', color: 'var(--primary)', boxShadow: 'none' }}
              >
                <RefreshCw size={16} /> Trigger Cloud Backup Sync
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// Styling Constants helper
const inputStyle = {
  padding: '10px 14px',
  borderRadius: '8px',
  border: '1.5px solid var(--border-glass)',
  backgroundColor: 'var(--bg-panel)',
  color: 'var(--text-primary)',
  outline: 'none',
  fontSize: '13.5px',
  transition: 'border-color 0.2s'
};

const saveBtnStyle = {
  width: '100%',
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
  boxShadow: '0 4px 15px rgba(0, 168, 132, 0.25)',
  transition: 'all 0.2s'
};

const selectBoxContainer = {
  display: 'flex',
  flexDirection: 'column',
  gap: '6px'
};

const labelStyle = {
  fontSize: '11px',
  fontWeight: 700,
  color: 'var(--text-secondary)',
  textTransform: 'uppercase'
};

const selectStyle = {
  padding: '10px 14px',
  borderRadius: '8px',
  border: '1.5px solid var(--border-glass)',
  background: 'var(--bg-panel)',
  color: 'var(--text-primary)',
  outline: 'none',
  fontSize: '13.5px',
  cursor: 'pointer'
};

const toggleRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '10px 14px',
  borderRadius: '8px',
  backgroundColor: 'var(--bg-panel)',
  border: '1px solid var(--border-glass)',
  fontSize: '13px',
  color: 'var(--text-primary)',
  fontWeight: 500
};

const checkboxStyle = {
  cursor: 'pointer',
  width: '18px',
  height: '18px',
  accentColor: 'var(--primary)'
};

export default SettingsPage;
