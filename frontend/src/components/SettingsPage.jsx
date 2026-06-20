// frontend/src/components/SettingsPage.jsx
import React, { useState } from 'react';
import { User, Palette, Eye, Download, Save, Moon, Sun, Check, Shield } from 'lucide-react';

const PALETTE_OPTIONS = [
  { id: 'teal', name: 'Cyber Teal', color: 'hsl(164, 85%, 36%)', hover: 'hsl(164, 85%, 28%)', light: 'hsl(164, 85%, 94%)' },
  { id: 'blue', name: 'Neon Blue', color: 'hsl(210, 95%, 45%)', hover: 'hsl(210, 95%, 38%)', light: 'hsl(210, 95%, 94%)' },
  { id: 'purple', name: 'Retro Purple', color: 'hsl(270, 85%, 55%)', hover: 'hsl(270, 85%, 48%)', light: 'hsl(270, 85%, 95%)' },
  { id: 'orange', name: 'Vibrant Amber', color: 'hsl(30, 95%, 50%)', hover: 'hsl(30, 95%, 43%)', light: 'hsl(30, 95%, 94%)' },
  { id: 'pink', name: 'Sunset Rose', color: 'hsl(330, 85%, 55%)', hover: 'hsl(330, 85%, 48%)', light: 'hsl(330, 85%, 95%)' }
];

function SettingsPage({
  user,
  socket,
  connected,
  theme,
  toggleTheme,
  showToast,
  messages,
  setActiveTab
}) {
  const [activeSubTab, setActiveSubTab] = useState('profile');

  // Input states
  const [username, setUsername] = useState(user.username);
  const [bio, setBio] = useState(user.bio || 'Hey! I am using Cyber Chat.');
  const [statusMsg, setStatusMsg] = useState(user.statusMsg || 'Active');
  
  // Privacy states
  const [lastSeenSetting, setLastSeenSetting] = useState(user.lastSeenSetting || 'everyone');
  const [onlineVisibility, setOnlineVisibility] = useState(user.onlineVisibility || 'visible');
  
  // Active palette accent color
  const [activePalette, setActivePalette] = useState(() => {
    return localStorage.getItem('cc_accent_color_id') || 'teal';
  });

  const handleProfileSave = (e) => {
    e.preventDefault();
    if (!connected || !socket) return;

    socket.emit('edit_profile', {
      username: username.trim(),
      bio: bio.trim(),
      statusMsg: statusMsg.trim(),
      lastSeenSetting,
      onlineVisibility
    });

    showToast('Profile configurations updated successfully!', 'success');
  };

  const handlePaletteApply = (palette) => {
    setActivePalette(palette.id);
    localStorage.setItem('cc_accent_color_id', palette.id);
    
    // Set custom CSS custom variables on the document element
    document.documentElement.style.setProperty('--primary', palette.color);
    document.documentElement.style.setProperty('--primary-hover', palette.hover);
    document.documentElement.style.setProperty('--primary-light', palette.light);

    showToast(`Applied ${palette.name} accent theme!`, 'success');
  };

  const handleBackupExport = () => {
    try {
      const dataStr = JSON.stringify(messages, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `cyber_chat_history_${user.username.replace(/\s+/g, '_').toLowerCase()}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      showToast('Chat history exported successfully!', 'success');
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
      padding: '32px',
      overflowY: 'auto'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
        <div style={{ backgroundColor: 'var(--primary)', color: '#fff', padding: '8px', borderRadius: '8px' }}>
          <Palette size={24} />
        </div>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'Outfit', color: 'var(--text-primary)' }}>
            Workspace Settings
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Personalize your identity, custom theme colors, and safety settings.
          </p>
        </div>
      </div>

      {/* Tabs navigation */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border-glass)',
        gap: '24px',
        marginBottom: '28px',
        flexShrink: 0
      }}>
        {/* Profile */}
        <button
          onClick={() => setActiveSubTab('profile')}
          style={{
            padding: '10px 4px',
            border: 'none',
            background: 'none',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            color: activeSubTab === 'profile' ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: activeSubTab === 'profile' ? '2px solid var(--primary)' : '2px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <User size={16} /> My Profile
        </button>

        {/* Theme Settings */}
        <button
          onClick={() => setActiveSubTab('theme')}
          style={{
            padding: '10px 4px',
            border: 'none',
            background: 'none',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            color: activeSubTab === 'theme' ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: activeSubTab === 'theme' ? '2px solid var(--primary)' : '2px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Palette size={16} /> Aesthetics
        </button>

        {/* Privacy */}
        <button
          onClick={() => setActiveSubTab('privacy')}
          style={{
            padding: '10px 4px',
            border: 'none',
            background: 'none',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            color: activeSubTab === 'privacy' ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: activeSubTab === 'privacy' ? '2px solid var(--primary)' : '2px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Eye size={16} /> Privacy Settings
        </button>

        {/* Data export */}
        <button
          onClick={() => setActiveSubTab('backup')}
          style={{
            padding: '10px 4px',
            border: 'none',
            background: 'none',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            color: activeSubTab === 'backup' ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: activeSubTab === 'backup' ? '2px solid var(--primary)' : '2px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Download size={16} /> System Backup
        </button>
      </div>

      {/* Tab Contents */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', maxWidth: '520px' }}>
        
        {/* Tab 1: Profile settings */}
        {activeSubTab === 'profile' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* If Admin, render Admin Profile Card */}
            {(user.role === 'admin' || user.isAdmin) && (
              <div 
                className="glass-panel" 
                onClick={() => setActiveTab && setActiveTab('admin')}
                style={{
                  padding: '20px',
                  borderRadius: '12px',
                  border: '1.5px solid var(--primary)',
                  background: 'var(--primary-light)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  boxShadow: 'var(--shadow-md)',
                  marginBottom: '10px',
                  transition: 'transform var(--transition-fast)'
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'none'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Shield style={{ color: 'var(--primary)' }} size={24} />
                  <div>
                    <h4 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--primary)' }}>Admin Control Panel Dashboard</h4>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>You have system administrator access</span>
                  </div>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-primary)', margin: '4px 0' }}>
                  Click this access card to open the administrative control panel, search and ban users, audit rooms, and export chat histories.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                  <span style={{ backgroundColor: 'var(--primary)', color: '#fff', fontSize: '9px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px' }}>USER MANAGEMENT</span>
                  <span style={{ backgroundColor: 'var(--primary)', color: '#fff', fontSize: '9px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px' }}>ROOM MODERATION</span>
                  <span style={{ backgroundColor: 'var(--primary)', color: '#fff', fontSize: '9px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px' }}>PDF LOG EXPORT</span>
                </div>
              </div>
            )}

            <form onSubmit={handleProfileSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Username */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label htmlFor="settings-username" style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Username</label>
              <input
                id="settings-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                maxLength={20}
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-glass)',
                  background: 'var(--bg-panel)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  fontSize: '14px'
                }}
              />
            </div>

            {/* Status Message */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label htmlFor="settings-status" style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Status Message</label>
              <input
                id="settings-status"
                type="text"
                value={statusMsg}
                onChange={(e) => setStatusMsg(e.target.value)}
                maxLength={30}
                placeholder="Active, Away, Coding..."
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-glass)',
                  background: 'var(--bg-panel)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  fontSize: '14px'
                }}
              />
            </div>

            {/* Bio/About */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label htmlFor="settings-bio" style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>About Me</label>
              <textarea
                id="settings-bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                maxLength={120}
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-glass)',
                  background: 'var(--bg-panel)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  fontSize: '14px',
                  resize: 'none'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={!connected}
              style={{
                backgroundColor: 'var(--primary)',
                color: 'var(--text-on-primary)',
                border: 'none',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '10px'
              }}
            >
              <Save size={16} /> Save Profiles
            </button>
          </form>
          </div>
        )}

        {/* Tab 2: Theme customization */}
        {activeSubTab === 'theme' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Color Accent Picker */}
            <div>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '12px' }}>
                Color Accent Themes
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {PALETTE_OPTIONS.map(opt => {
                  const isApplied = activePalette === opt.id;
                  return (
                    <div
                      key={opt.id}
                      onClick={() => handlePaletteApply(opt)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        border: isApplied ? '1.5px solid var(--primary)' : '1px solid var(--border-glass)',
                        backgroundColor: 'var(--bg-panel)',
                        transition: 'border-color var(--transition-fast)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '20px', height: '20px', borderRadius: '50%', backgroundColor: opt.color }} />
                        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{opt.name}</span>
                      </div>
                      {isApplied && <Check size={16} style={{ color: 'var(--primary)' }} />}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Dark/Light modes settings */}
            <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '20px' }}>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block', marginBottom: '12px' }}>
                Theme Mode Settings
              </span>
              <button
                onClick={toggleTheme}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-glass)',
                  backgroundColor: 'var(--bg-panel)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontWeight: 600,
                  fontSize: '14px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                  <span>Switch to {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Privacy settings */}
        {activeSubTab === 'privacy' && (
          <form onSubmit={handleProfileSave} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Last Seen setting */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label htmlFor="settings-last-seen" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>Last Seen Visibility</label>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '-4px' }}>Control who can see your offline timestamps</p>
              <select
                id="settings-last-seen"
                value={lastSeenSetting}
                onChange={(e) => setLastSeenSetting(e.target.value)}
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-glass)',
                  background: 'var(--bg-panel)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                <option value="everyone">Everyone</option>
                <option value="nobody">Nobody</option>
              </select>
            </div>

            {/* Online invisibility setting */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label htmlFor="settings-online" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>Online Visibility Status</label>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '-4px' }}>Hide your online badge from contacts</p>
              <select
                id="settings-online"
                value={onlineVisibility}
                onChange={(e) => setOnlineVisibility(e.target.value)}
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-glass)',
                  background: 'var(--bg-panel)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                <option value="visible">Visible (Show Green Indicator)</option>
                <option value="invisible">Invisible (Appear Offline)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={!connected}
              style={{
                backgroundColor: 'var(--primary)',
                color: 'var(--text-on-primary)',
                border: 'none',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '10px'
              }}
            >
              <Save size={16} /> Save Privacy Settings
            </button>
          </form>
        )}

        {/* Tab 4: System Backup */}
        {activeSubTab === 'backup' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', backgroundColor: 'var(--bg-panel)', padding: '24px', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
            <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>
              Export Chat Backups
            </span>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
              Export and download a structured backup profile copy of your chat history. The export contains all active room logs, messages, timestamps, and media references.
            </p>
            <button
              onClick={handleBackupExport}
              style={{
                backgroundColor: 'var(--primary)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 20px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                justifyContent: 'center',
                boxShadow: '0 4px 12px var(--primary-light)'
              }}
            >
              <Download size={16} /> Export raw-chat.json
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default SettingsPage;
