// frontend/src/components/ChatLayout.jsx
import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, Camera, Globe, Phone, User, Plus, Users, Settings, 
  ShieldAlert, Sparkles, HelpCircle, Lock, ArrowLeft, PlusCircle, X
} from 'lucide-react';
import Sidebar from './Sidebar';
import ChatArea from './ChatArea';
import AdminDashboard from './AdminDashboard';
import UserProfileModal from './UserProfileModal';
import SettingsPage from './SettingsPage';
import StoriesPanel, { StoryCreator } from './StoriesPanel';
import AIAssistant from './AIAssistant';
import CommunitiesPanel from './CommunitiesPanel';
import PremiumPanel from './PremiumPanel';
import CallHistoryPanel from './CallHistoryPanel';
import ProfilePanelCustom from './ProfilePanel';


function ChatLayout({
  user,
  socket,
  connected,
  connectionError,
  latencyQuality,
  rooms,
  messages,
  setMessages,
  onlineUsers,
  activeChat,
  setActiveChat,
  typingUsers,
  unreadCounts,
  soundEnabled,
  setSoundEnabled,
  notificationsPermission,
  requestNotificationPermission,
  theme,
  toggleTheme,
  logout,
  showToast,
  analyticsData,
  onStartCall,
  onUserUpdate,
  isSelectionMode,
  setIsSelectionMode,
  selectedMessageIds,
  setSelectedMessageIds
}) {
  const [inspectedUser, setInspectedUser] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [activeTab, setActiveTab] = useState('chats'); // chats, stories, communities, calls, profile

  // FAB Speed Dial State
  const [fabOpen, setFabOpen] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showStoryCreatorModal, setShowStoryCreatorModal] = useState(false);

  // Room creation fields
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupIcon, setNewGroupIcon] = useState('💬');
  const [newGroupPrivate, setNewGroupPrivate] = useState(false);
  const [newGroupPasscode, setNewGroupPasscode] = useState('');

  // Resize handler
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleInspectUser = (userId) => {
    const found = onlineUsers.find(u => u.id === userId);
    if (found) {
      setInspectedUser(found);
    } else {
      setInspectedUser({ id: userId, username: 'Offline User', status: 'offline', isMutedGlobally: false });
    }
  };

  const handleCreateGroupSubmit = (e) => {
    e.preventDefault();
    const name = newGroupName.trim();
    if (!name) return;

    if (newGroupPrivate && !newGroupPasscode.trim()) {
      showToast('Private rooms require a passcode', 'warning');
      return;
    }

    socket.emit('create_room', {
      name,
      description: newGroupDesc.trim(),
      icon: newGroupIcon,
      isPrivate: newGroupPrivate,
      passcode: newGroupPasscode.trim(),
      creatorId: user.id
    });

    setNewGroupName('');
    setNewGroupDesc('');
    setNewGroupIcon('💬');
    setNewGroupPrivate(false);
    setNewGroupPasscode('');
    setShowCreateGroupModal(false);
    showToast('Group room created!', 'success');
  };

  // Render current tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'chats':
        return (
          <Sidebar
            user={user}
            onUserUpdate={onUserUpdate}
            connected={connected}
            rooms={rooms}
            onlineUsers={onlineUsers}
            activeChat={activeChat}
            setActiveChat={setActiveChat}
            typingUsers={typingUsers}
            unreadCounts={unreadCounts}
            soundEnabled={soundEnabled}
            setSoundEnabled={setSoundEnabled}
            notificationsPermission={notificationsPermission}
            requestNotificationPermission={requestNotificationPermission}
            logout={logout}
            socket={socket}
            showToast={showToast}
            messages={messages}
            isMobile={true} // Inside mockup screen, treat as mobile sizing
          />
        );
      case 'stories':
        return <StoriesPanel user={user} showToast={showToast} />;
      case 'communities':
        return <CommunitiesPanel user={user} showToast={showToast} />;
      case 'calls':
        return (
          <CallHistoryPanel
            socket={socket}
            currentUser={user}
            allUsers={onlineUsers}
            onStartCall={onStartCall}
            onClose={() => setActiveTab('chats')}
          />
        );
      case 'profile':
        return (
          <ProfilePanelCustom
            user={user}
            rooms={rooms}
            setActiveTab={setActiveTab}
            showToast={showToast}
            logout={logout}
            socket={socket}
            connected={connected}
            onUserUpdate={onUserUpdate}
            onlineUsers={onlineUsers}
          />
        );
      case 'settings':
        return (
          <SettingsPage
            user={user}
            socket={socket}
            connected={connected}
            theme={theme}
            toggleTheme={toggleTheme}
            showToast={showToast}
            messages={messages}
            setActiveTab={setActiveTab}
            isMobile={true}
          />
        );
      case 'premium':
        return <PremiumPanel user={user} showToast={showToast} />;
      case 'admin':
        return (
          <AdminDashboard
            user={user}
            socket={socket}
            connected={connected}
            analyticsData={analyticsData}
            rooms={rooms}
            onlineUsers={onlineUsers}
            showToast={showToast}
            messages={messages}
            setActiveTab={setActiveTab}
            isMobile={true}
          />
        );
      case 'ai':
        return <AIAssistant user={user} />;
      default:
        return <div>Tab not found</div>;
    }
  };

  return (
    <div style={isMobile ? mobileWrapperStyle : desktopWrapperStyle}>
      {/* 1. Desktop background reflection glows */}
      {!isMobile && (
        <div style={desktopBgDecorationStyle}>
          <div style={nebulaGlow1} />
          <div style={nebulaGlow2} />
          <div style={desktopOverlayTextStyle}>
            <h1 style={{ fontSize: '32px', fontWeight: 900, fontFamily: 'Outfit', color: 'var(--primary)' }}>CyberChat Node</h1>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', maxWidth: '280px', marginTop: '6px' }}>
              Enforcing peer-to-peer security loops and hardware-level WebRTC tunnels.
            </p>
          </div>
        </div>
      )}

      {/* 2. Main Phone Body Viewport */}
      <div style={isMobile ? mobileScreenStyle : desktopScreenStyle}>
        
        {/* Notch details for desktop mockup */}
        {!isMobile && (
          <div style={mockupNotchStyle}>
            <div style={mockupCameraStyle} />
            <div style={mockupSpeakerStyle} />
          </div>
        )}

        {/* Core application screen viewport */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          height: '100%'
        }}>
          {activeChat ? (
            /* Active Chat Overlay - takes full screen height, no bottom nav */
            <div style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <ChatArea
                user={user}
                socket={socket}
                connected={connected}
                latencyQuality={latencyQuality}
                activeChat={activeChat}
                setActiveChat={setActiveChat}
                messages={messages}
                setMessages={setMessages}
                typingUsers={typingUsers[activeChat?.id] || []}
                onlineUsers={onlineUsers}
                onInspectUser={handleInspectUser}
                isMobile={true} // inside the phone frame, always use mobile layout rules
                theme={theme}
                toggleTheme={toggleTheme}
                showToast={showToast}
                rooms={rooms}
                onStartCall={onStartCall}
                isSelectionMode={isSelectionMode}
                setIsSelectionMode={setIsSelectionMode}
                selectedMessageIds={selectedMessageIds}
                setSelectedMessageIds={setSelectedMessageIds}
              />
            </div>
          ) : (
            /* Regular Tabs Viewport */
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
              
              {/* Tab Screen Content */}
              <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%' }}>
                {renderTabContent()}
              </div>

              {/* Floating Action Button (FAB) (Only on Chats & Stories) */}
              {(activeTab === 'chats' || activeTab === 'stories') && (
                <div style={{
                  position: 'absolute',
                  bottom: '84px',
                  right: '20px',
                  zIndex: 90,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  {/* Speed Dial Menu */}
                  {fabOpen && (
                    <div style={speedDialContainerStyle} className="animate-fade-in">
                      <button
                        onClick={() => { setShowNewChatModal(true); setFabOpen(false); }}
                        style={speedDialBtnStyle}
                        title="New Chat"
                      >
                        <MessageSquare size={16} />
                        <span style={speedDialLabelStyle}>New Chat</span>
                      </button>
                      
                      <button
                        onClick={() => { setShowCreateGroupModal(true); setFabOpen(false); }}
                        style={speedDialBtnStyle}
                        title="New Group Room"
                      >
                        <Users size={16} />
                        <span style={speedDialLabelStyle}>New Group</span>
                      </button>

                      <button
                        onClick={() => { setShowStoryCreatorModal(true); setFabOpen(false); }}
                        style={speedDialBtnStyle}
                        title="New Story"
                      >
                        <Camera size={16} />
                        <span style={speedDialLabelStyle}>New Story</span>
                      </button>
                    </div>
                  )}

                  {/* Main FAB Toggle */}
                  <button
                    onClick={() => setFabOpen(!fabOpen)}
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--primary)',
                      color: 'var(--text-on-primary)',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 16px rgba(0, 168, 132, 0.4)',
                      transition: 'transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                      transform: fabOpen ? 'rotate(45deg)' : 'rotate(0deg)'
                    }}
                  >
                    <Plus size={28} />
                  </button>
                </div>
              )}

              {/* Bottom Navigation Bar */}
              <div style={bottomNavBarStyle}>
                {[
                  { id: 'chats', label: 'Chats', icon: <MessageSquare size={20} /> },
                  { id: 'stories', label: 'Stories', icon: <Camera size={20} /> },
                  { id: 'communities', label: 'Communities', icon: <Users size={20} /> },
                  { id: 'calls', label: 'Calls', icon: <Phone size={20} /> },
                  { id: 'profile', label: 'Profile', icon: <User size={20} /> }
                ].map(tab => {
                  const isActive = activeTab === tab.id || 
                    (tab.id === 'profile' && (activeTab === 'settings' || activeTab === 'premium' || activeTab === 'admin'));
                  return (
                    <button
                      key={tab.id}
                      onClick={() => { setActiveTab(tab.id); setActiveChat(null); }}
                      style={{
                        flex: 1,
                        background: 'none',
                        border: 'none',
                        color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        cursor: 'pointer',
                        padding: '8px 0',
                        transition: 'all 0.2s',
                        position: 'relative'
                      }}
                    >
                      {tab.icon}
                      <span style={{ fontSize: '10px', fontWeight: isActive ? 800 : 500 }}>{tab.label}</span>
                      {isActive && <div style={activeNavDotStyle} />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* G. Inspect User Modal overlay */}
        {inspectedUser && (
          <UserProfileModal
            user={user}
            targetUser={inspectedUser}
            onClose={() => setInspectedUser(null)}
            socket={socket}
            connected={connected}
          />
        )}

        {/* H. Create Group Modal Dialog */}
        {showCreateGroupModal && (
          <div style={modalBackdropStyle}>
            <div style={modalContentStyle} className="animate-fade-in">
              <div style={modalHeaderStyle}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={18} style={{ color: 'var(--primary)' }} /> Create Group Room
                </h3>
                <button onClick={() => setShowCreateGroupModal(false)} style={modalCloseBtnStyle}><X size={18} /></button>
              </div>
              <form onSubmit={handleCreateGroupSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
                <div style={formRowStyle}>
                  <label style={formLabelStyle}>Group Icon Emoji</label>
                  <select value={newGroupIcon} onChange={e => setNewGroupIcon(e.target.value)} style={formInputStyle}>
                    <option value="💬">💬 Chat Bubble</option>
                    <option value="🚀">🚀 Space Force</option>
                    <option value="🛡️">🛡️ Shield Node</option>
                    <option value="⚡">⚡ Cyber Spike</option>
                    <option value="🎯">🎯 Tactical Hub</option>
                    <option value="🔥">🔥 Burn Channel</option>
                  </select>
                </div>
                <div style={formRowStyle}>
                  <label style={formLabelStyle}>Group Name</label>
                  <input type="text" placeholder="e.g. Code Command" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} required style={formInputStyle} />
                </div>
                <div style={formRowStyle}>
                  <label style={formLabelStyle}>Description</label>
                  <textarea placeholder="Group room descriptions..." value={newGroupDesc} onChange={e => setNewGroupDesc(e.target.value)} rows={2} style={formInputStyle} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Make Private passcode protected</span>
                  <input type="checkbox" checked={newGroupPrivate} onChange={e => setNewGroupPrivate(e.target.checked)} style={{ width: '16px', height: '16px', accentColor: 'var(--primary)', cursor: 'pointer' }} />
                </div>
                {newGroupPrivate && (
                  <div style={formRowStyle}>
                    <label style={formLabelStyle}>Private passcode</label>
                    <input type="password" placeholder="Passcode..." value={newGroupPasscode} onChange={e => setNewGroupPasscode(e.target.value)} required={newGroupPrivate} style={formInputStyle} />
                  </div>
                )}
                <button type="submit" style={formSubmitBtnStyle}>
                  Create Room
                </button>
              </form>
            </div>
          </div>
        )}

        {/* I. New Chat Contact Picker Modal */}
        {showNewChatModal && (
          <div style={modalBackdropStyle}>
            <div style={modalContentStyle} className="animate-fade-in">
              <div style={modalHeaderStyle}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MessageSquare size={18} style={{ color: 'var(--primary)' }} /> Select Contact
                </h3>
                <button onClick={() => setShowNewChatModal(false)} style={modalCloseBtnStyle}><X size={18} /></button>
              </div>
              <div style={{ maxHeight: '350px', overflowY: 'auto', marginTop: '12px' }}>
                {onlineUsers.filter(u => u.id !== user.id && (user.contacts || []).includes(u.id)).length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                    No contacts found. Find friends in the chat search to add them first!
                  </div>
                ) : (
                  onlineUsers.filter(u => u.id !== user.id && (user.contacts || []).includes(u.id)).map(contact => (
                    <div
                      key={contact.id}
                      onClick={() => {
                        setActiveChat({ id: contact.id, name: contact.username, type: 'direct' });
                        setShowNewChatModal(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'background-color 0.15s'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-app)'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <div className={`initials-avatar ${getAvatarBgClass(contact.username)}`} style={{ width: 36, height: 36, fontSize: 13, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold' }}>
                        {getInitials(contact.username).toUpperCase()}
                      </div>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>{contact.displayName || contact.username}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>@{contact.username}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* J. Story Creator Modal */}
        {showStoryCreatorModal && (
          <StoryCreator
            onClose={() => setShowStoryCreatorModal(false)}
            onCreated={() => { showToast('Story posted! 🎉', 'success'); }}
          />
        )}

      </div>
    </div>
  );
}

// Styling Constants
const desktopWrapperStyle = {
  width: '100vw',
  height: '100dvh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'radial-gradient(ellipse at bottom, #0d1e36 0%, #050a0e 100%)',
  overflow: 'hidden',
  position: 'relative'
};

const mobileWrapperStyle = {
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden'
};

const desktopScreenStyle = {
  width: '380px',
  height: '820px',
  borderRadius: '40px',
  border: '12px solid #1e293b',
  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 40px rgba(0, 245, 255, 0.15)',
  backgroundColor: 'var(--bg-app)',
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  zIndex: 10
};

const mobileScreenStyle = {
  flex: 1,
  width: '100%',
  height: '100%',
  backgroundColor: 'var(--bg-app)',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden'
};

const mockupNotchStyle = {
  width: '160px',
  height: '24px',
  backgroundColor: '#1e293b',
  borderBottomLeftRadius: '16px',
  borderBottomRightRadius: '16px',
  position: 'absolute',
  top: 0,
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 150,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '12px'
};

const mockupCameraStyle = {
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  backgroundColor: '#0f172a'
};

const mockupSpeakerStyle = {
  width: '40px',
  height: '4px',
  borderRadius: '2px',
  backgroundColor: '#334155'
};

const bottomNavBarStyle = {
  height: '64px',
  backgroundColor: 'var(--bg-panel)',
  borderTop: '1px solid var(--border-glass)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-around',
  padding: '0 8px 12px 8px', // offset bottom safe area mapping
  flexShrink: 0,
  zIndex: 85
};

const activeNavDotStyle = {
  position: 'absolute',
  bottom: '-2px',
  width: '4px',
  height: '4px',
  borderRadius: '50%',
  backgroundColor: 'var(--primary)'
};

const speedDialContainerStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-end',
  gap: '8px',
  marginBottom: '6px'
};

const speedDialBtnStyle = {
  backgroundColor: 'var(--bg-panel)',
  border: '1.5px solid var(--border-glass)',
  color: 'var(--text-primary)',
  borderRadius: '20px',
  padding: '8px 14px',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  cursor: 'pointer',
  boxShadow: 'var(--shadow-md)',
  fontSize: '12px',
  fontWeight: 700,
  position: 'relative',
  transition: 'transform 0.15s'
};

const speedDialLabelStyle = {
  whiteSpace: 'nowrap'
};

const activeTabBtnStyle = {
  flex: 1,
  background: 'none',
  border: 'none',
  color: 'var(--primary)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '4px',
  cursor: 'pointer',
  padding: '8px 0',
  position: 'relative'
};

const profileListItemStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '12px 14px',
  borderRadius: '10px',
  backgroundColor: 'var(--bg-panel)',
  border: '1px solid var(--border-glass)',
  cursor: 'pointer',
  color: 'var(--text-primary)',
  transition: 'background-color 0.2s',
  textAlign: 'left',
  width: '100%',
  boxSizing: 'border-box'
};

const modalBackdropStyle = {
  position: 'absolute',
  top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(5, 10, 14, 0.7)',
  backdropFilter: 'blur(4px)',
  zIndex: 300,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '20px'
};

const modalContentStyle = {
  backgroundColor: 'var(--bg-panel)',
  border: '1.5px solid var(--border-glass)',
  borderRadius: '16px',
  padding: '20px',
  width: '100%',
  maxWidth: '320px',
  boxShadow: 'var(--shadow-lg)',
  boxSizing: 'border-box'
};

const modalHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  borderBottom: '1px solid var(--border-glass)',
  paddingBottom: '10px',
  color: 'var(--text-primary)'
};

const modalCloseBtnStyle = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: 'var(--text-muted)',
  display: 'flex'
};

const formRowStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  textAlign: 'left'
};

const formLabelStyle = {
  fontSize: '11px',
  fontWeight: 700,
  color: 'var(--text-secondary)',
  textTransform: 'uppercase'
};

const formInputStyle = {
  padding: '8px 12px',
  borderRadius: '8px',
  border: '1.5px solid var(--border-glass)',
  backgroundColor: 'var(--bg-app)',
  color: 'var(--text-primary)',
  fontSize: '13px',
  outline: 'none',
  boxSizing: 'border-box',
  width: '100%'
};

const formSubmitBtnStyle = {
  width: '100%',
  padding: '12px',
  borderRadius: '8px',
  border: 'none',
  backgroundColor: 'var(--primary)',
  color: 'var(--text-on-primary)',
  fontWeight: 800,
  fontSize: '13px',
  cursor: 'pointer',
  marginTop: '8px',
  boxShadow: '0 4px 12px rgba(0,168,132,0.2)'
};

// Decorative Desktop Elements
const desktopBgDecorationStyle = {
  position: 'absolute',
  top: 0, left: 0, right: 0, bottom: 0,
  pointerEvents: 'none',
  zIndex: 1,
  overflow: 'hidden'
};

const nebulaGlow1 = {
  position: 'absolute',
  top: '-10%', left: '10%',
  width: '400px', height: '400px',
  borderRadius: '50%',
  background: 'radial-gradient(circle, rgba(0, 245, 255, 0.08) 0%, transparent 70%)',
  filter: 'blur(40px)'
};

const nebulaGlow2 = {
  position: 'absolute',
  bottom: '-10%', right: '10%',
  width: '450px', height: '450px',
  borderRadius: '50%',
  background: 'radial-gradient(circle, rgba(191, 0, 255, 0.08) 0%, transparent 70%)',
  filter: 'blur(50px)'
};

const desktopOverlayTextStyle = {
  position: 'absolute',
  top: '80px',
  left: '80px',
  textAlign: 'left'
};

const getAvatarBgClass = (name) => {
  if (!name) return 'bg-av-1';
  let code = 0;
  for (let i = 0; i < name.length; i++) code += name.charCodeAt(i);
  return `bg-av-${(code % 8) + 1}`;
};

const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2);
  return (parts[0][0] + parts[1][0]).substring(0, 2);
};

export default ChatLayout;
