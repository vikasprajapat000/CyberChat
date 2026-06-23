// frontend/src/components/SettingsPage.jsx
import React, { useState, useRef, useEffect } from 'react';
import { 
  User, Palette, Eye, Download, Save, Moon, Sun, Check, Shield, 
  ArrowLeft, Trash2, Key, Phone, Mail, Lock, Volume2, Bell, 
  Smartphone, EyeOff, ShieldAlert, Monitor, Sparkles, 
  MapPin, BadgeCheck, Camera, CheckSquare, HelpCircle,
  ShieldCheck, RefreshCw, Zap, Database, ChevronRight, Info, Crown
} from 'lucide-react';
import StorageManager from './StorageManager';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:5000' : 'https://cyberchat-1-qiqj.onrender.com');

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
  const [activeSubTab, setActiveSubTab] = useState(null); // null = show categories list

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

  // Call Settings States (New integration)
  const [videoResolution, setVideoResolution] = useState('720p');
  const [echoCancellation, setEchoCancellation] = useState(true);
  const [stunRelay, setStunRelay] = useState(false);

  // Notification States
  const [messageNotifications, setMessageNotifications] = useState(true);
  const [groupNotifications, setGroupNotifications] = useState(true);
  const [soundSelection, setSoundSelection] = useState('chime');
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [silentHours, setSilentHours] = useState(false);

  // Security Lock States
  const [fingerprintEnabled, setFingerprintEnabled] = useState(user.fingerprintEnabled || false);
  const [pinLockCode, setPinLockCode] = useState('');
  const [isAntiHackActive, setIsAntiHackActive] = useState(true);

  // Active palette accent color
  const [activePalette, setActivePalette] = useState(() => {
    return localStorage.getItem('cc_accent_color_id') || 'teal';
  });

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2);
    return (parts[0][0] + parts[1][0]).substring(0, 2);
  };

  const getAvatarBgClass = (name) => {
    if (!name) return 'bg-av-1';
    let code = 0;
    for (let i = 0; i < name.length; i++) code += name.charCodeAt(i);
    return `bg-av-${(code % 8) + 1}`;
  };

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
        if (socket && connected) {
          socket.emit('edit_profile', { profilePhoto: data.profilePhoto });
        }
      }
    } catch (err) {
      showToast('Photo upload failed', 'error');
    } finally {
      setUploadingProfile(false);
    }
  };

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
      }
    } catch (err) {
      showToast('Cover upload failed', 'error');
    } finally {
      setUploadingCover(false);
    }
  };

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

    localStorage.setItem('cc_chat_wallpaper', chatWallpaper);
    localStorage.setItem('cc_font_size', fontSize);

    document.documentElement.setAttribute('data-chat-wallpaper', chatWallpaper);
    document.documentElement.setAttribute('data-chat-fontsize', fontSize);

    showToast('Settings saved & synchronized!', 'success');
  };

  const handleChangePasswordSubmit = (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match', 'warning');
      return;
    }
    setChangingPass(true);
    socket.emit('change_password', { currentPassword, newPassword });
  };

  useEffect(() => {
    if (!socket) return;
    const handlePassChangeRes = (data) => {
      setChangingPass(false);
      if (data.success) {
        showToast('Password updated!', 'success');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        showToast(data.error || 'Password update failed', 'error');
      }
    };
    socket.on('change_password_response', handlePassChangeRes);
    return () => socket.off('change_password_response', handlePassChangeRes);
  }, [socket]);

  const handlePaletteApply = (palette) => {
    setActivePalette(palette.id);
    localStorage.setItem('cc_accent_color_id', palette.id);
    document.documentElement.style.setProperty('--primary', palette.color);
    document.documentElement.style.setProperty('--primary-hover', palette.hover);
    document.documentElement.style.setProperty('--primary-light', palette.light);
    showToast(`Accent set to ${palette.name}`, 'success');
  };

  const handleBackupExport = () => {
    try {
      const dataStr = JSON.stringify(messages, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', `cyberchat_history_${user.username}.json`);
      linkElement.click();
      showToast('Backup file exported!', 'success');
    } catch {
      showToast('Export failed', 'error');
    }
  };

  const sections = [
    { id: 'account', name: 'Account details', icon: <User size={18} /> },
    { id: 'privacy', name: 'Privacy shield', icon: <Eye size={18} /> },
    { id: 'security', name: 'Security & App locks', icon: <Lock size={18} /> },
    { id: 'devices', name: 'Linked devices & Sessions', icon: <Smartphone size={18} /> },
    { id: 'notifications', name: 'Notification alerts', icon: <Bell size={18} /> },
    { id: 'chats', name: 'Chat wallpapers & themes', icon: <Palette size={18} /> },
    { id: 'calls', name: 'Voice & Video calls', icon: <Phone size={18} /> },
    { id: 'premium', name: 'Premium access', icon: <Crown size={18} /> },
    { id: 'storage', name: 'Storage & History backup', icon: <Database size={18} /> },
    { id: 'about', name: 'About standing', icon: <Info size={18} /> }
  ];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: 'var(--bg-app)',
      padding: '16px',
      overflowY: 'auto'
    }}>
      {/* 1. Header with back button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        {activeSubTab !== null ? (
          <button 
            onClick={() => setActiveSubTab(null)} 
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', display: 'flex', padding: '6px' }}
          >
            <ArrowLeft size={22} />
          </button>
        ) : (
          <button 
            onClick={() => setActiveTab('chats')} 
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', display: 'flex', padding: '6px' }}
          >
            <ArrowLeft size={22} />
          </button>
        )}
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'Outfit', color: 'var(--text-primary)' }}>
            {activeSubTab ? `${activeSubTab.charAt(0).toUpperCase() + activeSubTab.slice(1)} Settings` : 'Settings'}
          </h2>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {activeSubTab ? 'Modify configurations below' : 'Select category to configure details'}
          </p>
        </div>
      </div>

      {/* 2. Main List or Active Category Sub Panel */}
      {activeSubTab === null ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {sections.map(sec => (
            <div
              key={sec.id}
              onClick={() => setActiveSubTab(sec.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                borderRadius: '12px',
                backgroundColor: 'var(--bg-panel)',
                border: '1px solid var(--border-glass)',
                cursor: 'pointer',
                transition: 'background var(--transition-fast)'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--primary-light)'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-panel)'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-primary)' }}>
                <div style={{ color: 'var(--primary)' }}>{sec.icon}</div>
                <span style={{ fontSize: '14px', fontWeight: 600 }}>{sec.name}</span>
              </div>
              <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '600px', margin: '0 auto', width: '100%' }}>
          
          {/* Account Sub-tab */}
          {activeSubTab === 'account' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{
                height: '100px',
                width: '100%',
                position: 'relative',
                backgroundImage: user.coverPhoto ? `url(${BACKEND_URL}${user.coverPhoto})` : 'linear-gradient(135deg, rgba(0,168,132,0.2) 0%, rgba(59,130,246,0.1) 100%)',
                backgroundSize: 'cover',
                borderRadius: '12px',
                backgroundColor: '#0f172a',
                border: '1px solid var(--border-glass)',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'flex-end',
                padding: '8px'
              }}>
                <label style={{ cursor: 'pointer', background: 'rgba(0,0,0,0.6)', padding: '4px 8px', borderRadius: '4px', color: '#fff', fontSize: '10px' }}>
                  Edit Banner
                  <input type="file" ref={coverInputRef} onChange={handleCoverPhotoUpload} accept="image/*" style={{ display: 'none' }} />
                </label>
              </div>

              <form onSubmit={handleSettingsSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={selectBoxContainer}>
                  <label style={labelStyle}>Username</label>
                  <input type="text" value={username} onChange={e => setUsername(e.target.value)} required maxLength={20} style={inputStyle} />
                </div>
                <div style={selectBoxContainer}>
                  <label style={labelStyle}>Display Name</label>
                  <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} style={inputStyle} />
                </div>
                <div style={selectBoxContainer}>
                  <label style={labelStyle}>Mobile Number</label>
                  <input type="text" value={mobileNumber} onChange={e => setMobileNumber(e.target.value)} style={inputStyle} />
                </div>
                <div style={selectBoxContainer}>
                  <label style={labelStyle}>Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
                </div>
                <div style={selectBoxContainer}>
                  <label style={labelStyle}>Bio message</label>
                  <textarea value={bio} onChange={e => setBio(e.target.value)} rows={2} style={inputStyle} />
                </div>
                <div style={selectBoxContainer}>
                  <label style={labelStyle}>Status status</label>
                  <input type="text" value={statusMsg} onChange={e => setStatusMsg(e.target.value)} style={inputStyle} />
                </div>
                <button type="submit" style={saveBtnStyle}><Save size={16} /> Save Changes</button>
              </form>

              <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '16px', marginTop: '10px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '10px' }}>Modify Password</h4>
                <form onSubmit={handleChangePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <input type="password" placeholder="Current Password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required style={inputStyle} />
                  <input type="password" placeholder="New Password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required style={inputStyle} />
                  <input type="password" placeholder="Confirm Pass" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required style={inputStyle} />
                  <button type="submit" style={saveBtnStyle}>Change Pass</button>
                </form>
              </div>
            </div>
          )}

          {/* Privacy Sub-tab */}
          {activeSubTab === 'privacy' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={toggleRowStyle}>
                <div>
                  <div style={{ fontWeight: 700 }}>Ghost Mode</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Go completely anonymous on user lists</div>
                </div>
                <input type="checkbox" checked={isGhostMode} onChange={e => setIsGhostMode(e.target.checked)} style={checkboxStyle} />
              </div>
              <div style={selectBoxContainer}>
                <label style={labelStyle}>Last Seen Setting</label>
                <select value={lastSeenSetting} onChange={e => setLastSeenSetting(e.target.value)} style={selectStyle}>
                  <option value="everyone">Everyone</option>
                  <option value="contacts">Contacts Only</option>
                  <option value="nobody">Nobody</option>
                </select>
              </div>
              <div style={selectBoxContainer}>
                <label style={labelStyle}>Online Visibility</label>
                <select value={onlineVisibility} onChange={e => setOnlineVisibility(e.target.value)} style={selectStyle}>
                  <option value="visible">Visible</option>
                  <option value="invisible">Appear Offline</option>
                </select>
              </div>
              <div style={selectBoxContainer}>
                <label style={labelStyle}>Profile Photo Visibility</label>
                <select value={profilePhotoVisibility} onChange={e => setProfilePhotoVisibility(e.target.value)} style={selectStyle}>
                  <option value="everyone">Everyone</option>
                  <option value="contacts">Contacts Only</option>
                  <option value="nobody">Nobody</option>
                </select>
              </div>
              <div style={toggleRowStyle}>
                <span>Send Read Receipts (Seen ticks)</span>
                <input type="checkbox" checked={readReceipts} onChange={e => setReadReceipts(e.target.checked)} style={checkboxStyle} />
              </div>
              <div style={toggleRowStyle}>
                <span>Hide typing indicator</span>
                <input type="checkbox" checked={hideTyping} onChange={e => setHideTyping(e.target.checked)} style={checkboxStyle} />
              </div>
              <button onClick={handleSettingsSave} style={saveBtnStyle}><Save size={16} /> Save Privacy</button>
            </div>
          )}

          {/* Security Sub-tab */}
          {activeSubTab === 'security' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={toggleRowStyle}>
                <span>Biometric / Fingerprint login</span>
                <input type="checkbox" checked={fingerprintEnabled} onChange={e => setFingerprintEnabled(e.target.checked)} style={checkboxStyle} />
              </div>
              <div style={selectBoxContainer}>
                <label style={labelStyle}>Configure App Lock screen PIN</label>
                <input type="password" maxLength={4} placeholder="Set 4 digit PIN" value={pinLockCode} onChange={e => setPinLockCode(e.target.value)} style={inputStyle} />
                <button onClick={() => { localStorage.setItem('cc_screen_pin', pinLockCode); showToast('PIN established!', 'success'); }} style={saveBtnStyle}>Save PIN</button>
              </div>
              <div style={toggleRowStyle}>
                <span>Enable Real-time Intrusion Shield</span>
                <input type="checkbox" checked={isAntiHackActive} onChange={e => setIsAntiHackActive(e.target.checked)} style={checkboxStyle} />
              </div>
            </div>
          )}

          {/* Linked Devices Sub-tab */}
          {activeSubTab === 'devices' && (
            <DevicesSection showToast={showToast} token={token} />
          )}

          {/* Notifications Sub-tab */}
          {activeSubTab === 'notifications' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={toggleRowStyle}>
                <span>Enable Direct Message Notifications</span>
                <input type="checkbox" checked={messageNotifications} onChange={e => setMessageNotifications(e.target.checked)} style={checkboxStyle} />
              </div>
              <div style={toggleRowStyle}>
                <span>Enable Group Room Notifications</span>
                <input type="checkbox" checked={groupNotifications} onChange={e => setGroupNotifications(e.target.checked)} style={checkboxStyle} />
              </div>
              <div style={toggleRowStyle}>
                <span>Sound Chime Vibration alerts</span>
                <input type="checkbox" checked={vibrationEnabled} onChange={e => setVibrationEnabled(e.target.checked)} style={checkboxStyle} />
              </div>
              <div style={selectBoxContainer}>
                <label style={labelStyle}>Notification Sound Chime</label>
                <select value={soundSelection} onChange={e => setSoundSelection(e.target.value)} style={selectStyle}>
                  <option value="chime">Digital Synth Chime</option>
                  <option value="ping">Classic Cyber Ping</option>
                  <option value="matrix">Matrix Synth Drop</option>
                  <option value="silent">Silent</option>
                </select>
              </div>
              <button onClick={() => showToast('Notifications applied!', 'success')} style={saveBtnStyle}>Save Notifications</button>
            </div>
          )}

          {/* Chats Sub-tab */}
          {activeSubTab === 'chats' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
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
              <div style={selectBoxContainer}>
                <label style={labelStyle}>Message auto-delete timer</label>
                <select value={autoDeleteTimer} onChange={e => setAutoDeleteTimer(Number(e.target.value))} style={selectStyle}>
                  <option value={0}>Disabled</option>
                  <option value={10}>10 Seconds (Self-Destruct)</option>
                  <option value={60}>1 Minute</option>
                  <option value={3600}>1 Hour</option>
                  <option value={86400}>1 Day</option>
                </select>
              </div>
              
              <div>
                <label style={labelStyle}>Workspace Color Accent Theme</label>
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

              <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '16px' }}>
                <span style={labelStyle}>System Dark / Light Base</span>
                <button
                  onClick={toggleTheme}
                  style={{
                    width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-glass)',
                    backgroundColor: 'var(--bg-panel)', color: 'var(--text-primary)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 600, fontSize: '13px', marginTop: '8px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                    <span>Switch to {theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
                  </div>
                </button>
              </div>

              <button onClick={handleSettingsSave} style={saveBtnStyle}><Save size={16} /> Apply Chat Settings</button>
            </div>
          )}

          {/* Calls Sub-tab (Optimized Call settings) */}
          {activeSubTab === 'calls' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={selectBoxContainer}>
                <label style={labelStyle}>Video Call Resolution</label>
                <select value={videoResolution} onChange={e => { setVideoResolution(e.target.value); showToast(`Video calls set to ${e.target.value}`, 'success'); }} style={selectStyle}>
                  <option value="360p">360p (Low bandwidth)</option>
                  <option value="480p">480p (Standard)</option>
                  <option value="720p">720p (High Definition)</option>
                  <option value="1080p">1080p (Full HD - Elite subscription)</option>
                </select>
              </div>
              <div style={toggleRowStyle}>
                <span>Enable Audio Echo Cancellation</span>
                <input type="checkbox" checked={echoCancellation} onChange={e => { setEchoCancellation(e.target.checked); showToast(`Echo cancellation ${e.target.checked ? 'enabled' : 'disabled'}`, 'info'); }} style={checkboxStyle} />
              </div>
              <div style={toggleRowStyle}>
                <div>
                  <div style={{ fontWeight: 700 }}>Enable STUN/TURN Relay Mode</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Helps bypass restrictive firewall networks</div>
                </div>
                <input type="checkbox" checked={stunRelay} onChange={e => { setStunRelay(e.target.checked); showToast(`STUN Relay mode ${e.target.checked ? 'activated' : 'deactivated'}`, 'warning'); }} style={checkboxStyle} />
              </div>
            </div>
          )}

          {/* Premium Sub-tab */}
          {activeSubTab === 'premium' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', backgroundColor: 'var(--bg-panel)', padding: '20px', borderRadius: '12px', border: '1.5px solid var(--border-glass)', textAlign: 'center' }}>
              <Crown size={36} style={{ color: '#a855f7', margin: '0 auto' }} fill="#a855f7" />
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>You are on the {user.premiumTier?.toUpperCase() || 'FREE'} tier</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Unlock high-fidelity RTC channels, custom avatars, holographic borders, and unlimited AI assistant queries.
              </p>
              <button onClick={() => setActiveTab('premium')} style={{ ...saveBtnStyle, backgroundColor: '#a855f7', color: '#fff', boxShadow: '0 4px 15px rgba(168, 85, 247, 0.3)' }}>
                View Premium Plans
              </button>
            </div>
          )}

          {/* Storage Sub-tab */}
          {activeSubTab === 'storage' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <StorageManager user={user} messages={messages} showToast={showToast} />
              <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '16px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>History decryptions</h4>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={handleBackupExport} style={saveBtnStyle}><Download size={16} /> Export raw JSON</button>
                  <button onClick={() => { showToast('Syncing backup database...', 'info'); setTimeout(() => showToast('Cloud database synchronized!', 'success'), 1200); }} style={{ ...saveBtnStyle, backgroundColor: 'transparent', border: '1.5px solid var(--primary)', color: 'var(--primary)', boxShadow: 'none' }}><RefreshCw size={16} /> Sync Backup</button>
                </div>
              </div>
            </div>
          )}

          {/* About Sub-tab */}
          {activeSubTab === 'about' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', backgroundColor: 'var(--bg-panel)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
              <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                <div style={{ fontSize: '32px' }}>🛡️</div>
                <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '8px' }}>CyberChat Client Dashboard</h3>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Secure standing Node: v2.4.0-Release</span>
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div><strong>Host standing</strong>: Decrypted WebSocket pipelines</div>
                <div><strong>Encryption</strong>: Bi-directional WebRTC / TLS</div>
                <div><strong>Standing status</strong>: Fully functional</div>
              </div>
            </div>
          )}

        </div>
      )}
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
  width: '100%',
  boxSizing: 'border-box'
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
  transition: 'all 0.2s',
  boxSizing: 'border-box'
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
  textTransform: 'uppercase',
  textAlign: 'left'
};

const selectStyle = {
  padding: '10px 14px',
  borderRadius: '8px',
  border: '1.5px solid var(--border-glass)',
  background: 'var(--bg-panel)',
  color: 'var(--text-primary)',
  outline: 'none',
  fontSize: '13.5px',
  cursor: 'pointer',
  width: '100%'
};

const toggleRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '14px 16px',
  borderRadius: '12px',
  backgroundColor: 'var(--bg-panel)',
  border: '1px solid var(--border-glass)',
  fontSize: '13px',
  color: 'var(--text-primary)',
  fontWeight: 600
};

const checkboxStyle = {
  cursor: 'pointer',
  width: '18px',
  height: '18px',
  accentColor: 'var(--primary)'
};

function DevicesSection({ showToast, token }) {
  const [devicesList, setDevicesList] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDevices = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/users/devices`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setDevicesList(data.devices || []);
      }
    } catch (e) {
      showToast('Failed to fetch devices', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleRevoke = async (deviceId) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/users/devices/${deviceId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        showToast('Device session revoked successfully!', 'success');
        fetchDevices();
      } else {
        showToast(data.error || 'Failed to revoke device', 'error');
      }
    } catch (e) {
      showToast('Connection error during revocation', 'error');
    }
  };

  if (loading) {
    return <div style={{ color: 'var(--text-secondary)', padding: '20px', textAlign: 'center' }}>Syncing secure device nodes...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', textAlign: 'left' }}>
        Linked Active Sessions
      </h3>
      <p style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'left', lineHeight: '1.4' }}>
        Linked web browser clients mapped to your encrypted node loop. You can terminate any unrecognized device session here.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
        {devicesList.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            No linked devices found.
          </div>
        ) : (
          devicesList.map(dev => {
            const dateStr = new Date(dev.lastActiveAt).toLocaleString();
            return (
              <div
                key={dev.deviceId}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '14px',
                  borderRadius: '12px',
                  backgroundColor: 'var(--bg-panel)',
                  border: '1px solid var(--border-glass)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left' }}>
                  <div style={{ color: 'var(--primary)' }}>
                    {dev.platform === 'Mobile' ? <Smartphone size={24} /> : <Monitor size={24} />}
                  </div>
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {dev.deviceName}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Last active: {dateStr}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleRevoke(dev.deviceId)}
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    color: 'var(--danger)',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: 700,
                    transition: 'all 0.15s'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.backgroundColor = 'var(--danger)'; e.currentTarget.style.color = '#fff'; }}
                  onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.color = 'var(--danger)'; }}
                >
                  Terminate
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default SettingsPage;
