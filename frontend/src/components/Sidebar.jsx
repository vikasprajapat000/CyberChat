// frontend/src/components/Sidebar.jsx
import React, { useState, useEffect } from 'react';
import { 
  Search, MessageSquarePlus, LogOut, Volume2, VolumeX, Bell, BellOff,
  User, Hash, Circle, RefreshCw, X, ShieldAlert, Star, Lock,
  MessageSquare, LayoutGrid, Key, Calendar, Save, ClipboardList, PenTool,
  UserPlus
} from 'lucide-react';

function Sidebar({
  user,
  connected,
  rooms,
  onlineUsers,
  activeChat,
  setActiveChat,
  typingUsers,
  unreadCounts,
  soundEnabled,
  setSoundEnabled,
  notificationsPermission,
  requestNotificationPermission,
  logout,
  socket,
  activeTab,
  setActiveTab,
  showToast,
  messages,
  isMobile
}) {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Room Creation states
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDesc, setNewRoomDesc] = useState('');
  const [newRoomIcon, setNewRoomIcon] = useState('💬');
  const [newRoomPrivate, setNewRoomPrivate] = useState(false);
  const [newRoomPasscode, setNewRoomPasscode] = useState('');
  const [createRoomError, setCreateRoomError] = useState('');

  // Private Room passcode prompt states
  const [promptRoomId, setPromptRoomId] = useState(null);
  const [enteredPasscode, setEnteredPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState('');

  // Local state for Starred Messages
  const [starredMessageIds, setStarredMessageIds] = useState([]);

  // Productivity states
  const [taskNameInput, setTaskNameInput] = useState('');
  const [taskAssigneeId, setTaskAssigneeId] = useState('');

  // Profile menu state
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Load starred messages on mount
  useEffect(() => {
    const saved = localStorage.getItem(`cc_starred_${user.id}`);
    if (saved) setStarredMessageIds(JSON.parse(saved));
  }, [user.id]);

  // Sync starred changes
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem(`cc_starred_${user.id}`);
      if (saved) setStarredMessageIds(JSON.parse(saved));
    };
    window.addEventListener('storage', handleStorageChange);
    const interval = setInterval(handleStorageChange, 2000);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [user.id]);

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

  const handleCreateRoomSubmit = (e) => {
    e.preventDefault();
    const name = newRoomName.trim();
    if (!name) return;
    
    if (name.length < 3) {
      setCreateRoomError('Room name must be at least 3 characters');
      return;
    }

    if (newRoomPrivate && !newRoomPasscode.trim()) {
      setCreateRoomError('Private rooms require a passcode');
      return;
    }

    socket.emit('create_room', {
      name,
      description: newRoomDesc.trim(),
      icon: newRoomIcon,
      isPrivate: newRoomPrivate,
      passcode: newRoomPasscode.trim(),
      creatorId: user.id
    });

    setNewRoomName('');
    setNewRoomDesc('');
    setNewRoomIcon('💬');
    setNewRoomPrivate(false);
    setNewRoomPasscode('');
    setCreateRoomError('');
    setShowCreateRoom(false);
    showToast('Group Room created successfully!', 'success');
  };

  const handlePasscodeSubmit = (e) => {
    e.preventDefault();
    const targetRoom = rooms.find(r => r.id === promptRoomId);
    if (!targetRoom) return;

    socket.emit('join_room', {
      roomId: promptRoomId,
      userId: user.id,
      passcode: enteredPasscode
    });

    setActiveChat({ id: targetRoom.id, name: targetRoom.name, type: 'group' });
    setPromptRoomId(null);
    setEnteredPasscode('');
    setPasscodeError('');
  };

  const handleRoomClick = (room) => {
    const isMember = room.members?.includes(user.id);
    if (room.isPrivate && !isMember && room.creatorId !== user.id) {
      setPromptRoomId(room.id);
      setEnteredPasscode('');
      setPasscodeError('');
    } else {
      socket.emit('join_room', { roomId: room.id, userId: user.id });
      setActiveChat({ id: room.id, name: room.name, type: 'group' });
    }
  };

  // Productivity handlers
  const handleNotesChange = (e) => {
    if (!activeChat || activeChat.type !== 'group') return;
    socket.emit('sync_notes', {
      roomId: activeChat.id,
      notesText: e.target.value
    });
  };

  const handleAddTask = (e) => {
    e.preventDefault();
    if (!activeChat || activeChat.type !== 'group' || !taskNameInput.trim()) return;

    socket.emit('create_task', {
      roomId: activeChat.id,
      taskName: taskNameInput.trim(),
      taskAssigneeId: taskAssigneeId || user.id
    });

    setTaskNameInput('');
    setTaskAssigneeId('');
    showToast('Task assigned!', 'success');
  };

  const handleToggleTask = (taskId, currentlyCompleted) => {
    if (!activeChat || activeChat.type !== 'group') return;
    socket.emit('update_task', {
      roomId: activeChat.id,
      taskId,
      completed: !currentlyCompleted
    });
  };

  // Filters
  const filteredRooms = rooms.filter(room => 
    room.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Contacts and Request filters
  const myContacts = onlineUsers.filter(u => 
    u.id !== user.id && 
    (user.contacts || []).includes(u.id)
  );

  const filteredContacts = myContacts.filter(u => 
    u.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const discoverUsers = onlineUsers.filter(u => 
    u.id !== user.id && 
    !(user.contacts || []).includes(u.id) &&
    u.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const incomingRequestsList = onlineUsers.filter(u =>
    (user.receivedRequests || []).includes(u.id)
  );

  const starredMessagesList = messages.filter(m => starredMessageIds.includes(m.id));

  // Find active room notes / tasks details
  const activeRoomObj = activeChat && activeChat.type === 'group' ? rooms.find(r => r.id === activeChat.id) : null;
  const activeRoomNotes = activeRoomObj?.notes || '';
  const activeRoomTasks = activeRoomObj?.tasks || [];
  const activeRoomMembers = activeRoomObj?.members || [];

  const formatLastSeen = (isoStr) => {
    if (!isoStr) return 'offline';
    const date = new Date(isoStr);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    if (diffSec < 60) return 'Just left';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: isMobile ? 'column-reverse' : 'row',
      height: '100%',
      backgroundColor: 'var(--bg-sidebar)',
      borderRight: isMobile ? 'none' : '1px solid var(--border-glass)'
    }}>
      
      {/* 1. Leftmost or Bottom Discord mini nav bar */}
      <div style={{
        width: isMobile ? '100%' : '72px',
        height: isMobile ? '64px' : '100%',
        backgroundColor: 'var(--bg-nav)',
        display: 'flex',
        flexDirection: isMobile ? 'row' : 'column',
        alignItems: 'center',
        justifyContent: isMobile ? 'space-around' : 'flex-start',
        padding: isMobile ? '0 10px' : '16px 0',
        gap: isMobile ? '0' : '12px',
        flexShrink: 0,
        borderTop: isMobile ? '1px solid var(--border-glass)' : 'none'
      }}>
        {/* Chats Tab */}
        <button
          onClick={() => setActiveTab('chats')}
          className={`nav-tab-btn ${activeTab === 'chats' ? 'active' : ''}`}
          data-tooltip="Chat Conversations"
        >
          <MessageSquare size={20} />
        </button>

        {/* Productivity Tab */}
        <button
          onClick={() => setActiveTab('productivity')}
          className={`nav-tab-btn ${activeTab === 'productivity' ? 'active' : ''}`}
          data-tooltip="Notes & Shared Tasks"
        >
          <Calendar size={20} />
        </button>

        {/* Starred Tab */}
        <button
          onClick={() => setActiveTab('starred')}
          className={`nav-tab-btn ${activeTab === 'starred' ? 'active' : ''}`}
          data-tooltip="Starred Messages"
        >
          <Star size={20} />
        </button>

        {/* Settings Tab */}
        <button
          onClick={() => setActiveTab('settings')}
          className={`nav-tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
          data-tooltip="Aesthetics & Profile Settings"
        >
          <LayoutGrid size={20} />
        </button>

        {/* Admin Dashboard (visible to Admins only) */}
        {user.isAdmin && (
          <button
            onClick={() => setActiveTab('admin')}
            className={`nav-tab-btn ${activeTab === 'admin' ? 'active' : ''}`}
            data-tooltip="Admin Control Panel"
          >
            <ShieldAlert size={20} />
          </button>
        )}
      </div>

      {/* 2. Main Sidebar Content Column */}
      {activeTab !== 'admin' && activeTab !== 'settings' && (
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          position: 'relative'
        }}>
          {/* Header Banner */}
          <div style={{
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border-glass)',
            backgroundColor: 'var(--bg-panel)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ position: 'relative' }}>
                <div 
                  className={`initials-avatar ${getAvatarBgClass(user.username)}`} 
                  style={{ width: '36px', height: '36px', fontSize: '14px', flexShrink: 0, cursor: 'pointer' }}
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                >
                  {getInitials(user.username)}
                </div>
                
                {/* Profile Dropdown Menu */}
                {showProfileMenu && (
                  <>
                    <div 
                      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99 }} 
                      onClick={() => setShowProfileMenu(false)}
                    />
                    <div style={{
                      position: 'absolute',
                      top: '44px',
                      left: '0',
                      backgroundColor: 'var(--bg-panel)',
                      border: '1px solid var(--border-glass)',
                      borderRadius: '8px',
                      boxShadow: 'var(--shadow-md)',
                      zIndex: 100,
                      width: '180px',
                      display: 'flex',
                      flexDirection: 'column',
                      padding: '8px'
                    }}>
                      <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-glass)', marginBottom: '4px' }}>
                        <span style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.username}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{user.isAdmin ? 'Admin' : 'Standard'}</span>
                      </div>
                      
                      <button
                        onClick={() => { setSoundEnabled(!soundEnabled); setShowProfileMenu(false); }}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '13px', borderRadius: '4px', textAlign: 'left', width: '100%' }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--primary-light)'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                        {soundEnabled ? 'Mute Sounds' : 'Unmute Sounds'}
                      </button>

                      <button
                        onClick={() => { requestNotificationPermission(); setShowProfileMenu(false); }}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: 'none', border: 'none', cursor: 'pointer', color: notificationsPermission === 'granted' ? 'var(--primary)' : 'var(--text-secondary)', fontSize: '13px', borderRadius: '4px', textAlign: 'left', width: '100%' }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--primary-light)'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        {notificationsPermission === 'granted' ? <Bell size={16} /> : <BellOff size={16} />}
                        Alerts
                      </button>

                      <button
                        onClick={() => { logout(); setShowProfileMenu(false); }}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: '13px', borderRadius: '4px', textAlign: 'left', width: '100%', marginTop: '4px', borderTop: '1px solid var(--border-glass)' }}
                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <LogOut size={16} />
                        Logout
                      </button>
                    </div>
                  </>
                )}
              </div>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'Outfit', color: 'var(--text-primary)' }}>
                  {activeTab === 'chats' && 'Cyber Chat'}
                  {activeTab === 'productivity' && 'Workspace Center'}
                  {activeTab === 'starred' && 'Starred Items'}
                </h2>
                <span style={{ fontSize: '11px', color: connected ? 'var(--success)' : 'var(--warning)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                  <Circle size={8} fill={connected ? 'var(--success)' : 'var(--warning)'} stroke="none" />
                  {connected ? 'Sync Connected' : 'Reconnecting...'}
                </span>
              </div>
            </div>
          </div>

          {/* Connection warning banner */}
          {!connected && (
            <div style={{
              backgroundColor: 'var(--warning)',
              color: '#111b21',
              padding: '6px 16px',
              fontSize: '11px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              animation: 'wiggle 0.5s ease infinite'
            }}>
              <RefreshCw size={12} className="animate-spin" style={{ animationDuration: '2s' }} />
              Connection lost. Syncing...
            </div>
          )}



          {/* Search box (visible in Chats tab) */}
          {activeTab === 'chats' && (
            <div style={{ padding: '12px 18px' }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search contacts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px 10px 36px',
                    borderRadius: 'var(--radius-md)',
                    border: 'none',
                    backgroundColor: 'var(--bg-panel)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    fontSize: '13px',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                />
              </div>
            </div>
          )}

          {/* Scrollable list items */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '0 8px 16px 8px'
          }}>
            {activeTab === 'chats' && (
              <>


                {/* Incoming Contact Requests */}
                {incomingRequestsList.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', padding: '8px 12px', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Bell size={12} style={{ color: 'var(--primary)' }} /> Contact Requests ({incomingRequestsList.length})
                    </h3>
                    {incomingRequestsList.map(u => (
                      <div
                        key={u.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 12px',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: 'var(--primary-light)',
                          border: '1px solid var(--border-glass)',
                          marginBottom: '4px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                          <div className={`initials-avatar ${getAvatarBgClass(u.username)}`} style={{ width: '32px', height: '32px', fontSize: '13px' }}>
                            {getInitials(u.username)}
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.username}</h4>
                            <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>wants to connect</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={() => socket.emit('accept_contact_request', { userId: user.id, targetUserId: u.id })}
                            style={{
                              backgroundColor: 'var(--primary)',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '4px 8px',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => socket.emit('decline_contact_request', { userId: user.id, targetUserId: u.id })}
                            style={{
                              backgroundColor: 'rgba(239, 68, 68, 0.1)',
                              color: 'var(--danger)',
                              border: '1px solid rgba(239, 68, 68, 0.2)',
                              borderRadius: '4px',
                              padding: '4px 8px',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Contacts list */}
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', padding: '8px 12px', letterSpacing: '0.05em' }}>
                    Contacts ({filteredContacts.length})
                  </h3>
                  
                  {filteredContacts.length === 0 ? (
                    <div style={{ padding: '12px', fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center' }}>
                      {searchTerm ? 'No contacts match query' : 'No contacts added yet. Search a user to add them!'}
                    </div>
                  ) : (
                    filteredContacts.map(u => {
                      const isActive = activeChat && activeChat.type === 'direct' && activeChat.id === u.id;
                      const unread = unreadCounts[u.id] || 0;
                      const isTyping = (typingUsers[u.id] || []).length > 0;
                      const isBlocked = user.blockedUsers?.includes(u.id);

                      // Last seen settings bypass check
                      const showLastSeen = u.lastSeenSetting !== 'nobody';

                      return (
                        <div
                          key={u.id}
                          onClick={() => setActiveChat({ id: u.id, name: u.username, type: 'direct' })}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 12px',
                            borderRadius: 'var(--radius-md)',
                            cursor: 'pointer',
                            backgroundColor: isActive ? 'var(--primary-light)' : 'transparent',
                            transition: 'background-color var(--transition-fast)',
                            marginBottom: '2px'
                          }}
                          onMouseOver={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'var(--border-glass)'; }}
                          onMouseOut={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'; }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                            <div style={{ position: 'relative', flexShrink: 0 }}>
                              <div className={`initials-avatar ${getAvatarBgClass(u.username)}`} style={{ width: '42px', height: '42px', fontSize: '16px', boxShadow: 'var(--shadow-sm)' }}>
                                {getInitials(u.username)}
                              </div>
                              {u.onlineVisibility !== 'invisible' && (
                                <span style={{ position: 'absolute', bottom: 0, right: 0, width: '12px', height: '12px', borderRadius: '50%', backgroundColor: u.status === 'online' ? 'var(--success)' : 'var(--text-muted)', border: '2px solid var(--bg-app)' }} />
                              )}
                            </div>

                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <h4 style={{
                                  fontSize: '14px',
                                  fontWeight: unread > 0 ? 700 : 600,
                                  color: 'var(--text-primary)',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}>
                                  {u.username}
                                </h4>
                                {isBlocked && <ShieldAlert size={12} style={{ color: 'var(--danger)' }} />}
                              </div>

                              {isTyping ? (
                                <span style={{ fontSize: '11px', color: 'var(--primary)', fontStyle: 'italic', display: 'block' }}>typing...</span>
                              ) : (
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                                  {u.status === 'online' && u.onlineVisibility !== 'invisible' ? 'online' : (showLastSeen ? formatLastSeen(u.lastSeen) : 'offline')}
                                </span>
                              )}
                            </div>
                          </div>

                          {unread > 0 && (
                            <span style={{ backgroundColor: 'var(--primary)', color: 'var(--text-on-primary)', fontSize: '10px', fontWeight: 700, borderRadius: '12px', minWidth: '20px', height: '20px', display: 'flex', alignItems: 'center', justify: 'center', padding: '0 6px' }}>
                              {unread}
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Find Contacts (Global Search) */}
                {searchTerm.trim().length > 0 && (
                  <div>
                    <h3 style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', padding: '8px 12px', letterSpacing: '0.05em' }}>
                      Find Contacts ({discoverUsers.length})
                    </h3>
                    {discoverUsers.length === 0 ? (
                      <div style={{ padding: '12px', fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center' }}>No users found matching "{searchTerm}"</div>
                    ) : (
                      discoverUsers.map(u => {
                        const hasSent = (user.sentRequests || []).includes(u.id);
                        const hasReceived = (user.receivedRequests || []).includes(u.id);

                        return (
                          <div
                            key={u.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '10px 12px',
                              borderRadius: 'var(--radius-md)',
                              marginBottom: '4px',
                              backgroundColor: 'var(--bg-panel)',
                              border: '1px solid var(--border-glass)'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                              <div className={`initials-avatar ${getAvatarBgClass(u.username)}`} style={{ width: '36px', height: '36px', fontSize: '14px' }}>
                                {getInitials(u.username)}
                              </div>
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <h4 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.username}</h4>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block' }}>{u.statusMsg || 'Hey there!'}</span>
                              </div>
                            </div>
                            
                            <div>
                              {hasSent ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Sent</span>
                                  <button
                                    onClick={() => socket.emit('cancel_contact_request', { userId: user.id, targetUserId: u.id })}
                                    style={{
                                      backgroundColor: 'transparent',
                                      color: 'var(--danger)',
                                      border: 'none',
                                      cursor: 'pointer',
                                      fontSize: '11px',
                                      padding: '4px',
                                      display: 'flex',
                                      alignItems: 'center'
                                    }}
                                    title="Cancel Request"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              ) : hasReceived ? (
                                <button
                                  onClick={() => socket.emit('accept_contact_request', { userId: user.id, targetUserId: u.id })}
                                  style={{
                                    backgroundColor: 'var(--primary)',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '4px',
                                    padding: '4px 8px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                  }}
                                >
                                  Accept
                                </button>
                              ) : (
                                <button
                                  onClick={() => socket.emit('send_contact_request', { senderId: user.id, targetUserId: u.id })}
                                  style={{
                                    backgroundColor: 'transparent',
                                    color: 'var(--primary)',
                                    border: '1px solid var(--primary)',
                                    borderRadius: '4px',
                                    padding: '4px 8px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '2px'
                                  }}
                                >
                                  <UserPlus size={12} /> Add
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </>
            )}

            {/* Starred Messages view */}
            {activeTab === 'starred' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', padding: '8px 12px', textTransform: 'uppercase' }}>Starred Messages ({starredMessagesList.length})</span>
                
                {starredMessagesList.length === 0 ? (
                  <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                    No starred messages yet. Star messages inside chat area to bookmark them here.
                  </div>
                ) : (
                  starredMessagesList.map(msg => (
                    <div
                      key={msg.id}
                      style={{
                        padding: '12px',
                        borderRadius: 'var(--radius-md)',
                        backgroundColor: 'var(--bg-panel)',
                        border: '1px solid var(--border-glass)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary)' }}>
                          {msg.senderId === user.id ? 'You' : (onlineUsers.find(u => u.id === msg.senderId)?.username || 'User')}
                        </span>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p style={{ fontSize: '13px', color: 'var(--text-primary)', wordBreak: 'break-word' }}>
                        {msg.text || '📁 Media file'}
                      </p>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Productivity tab panel (Notes & Tasks sync) */}
            {activeTab === 'productivity' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '10px 4px' }}>
                {activeRoomObj ? (
                  <>
                    {/* Collaborative Notepad section */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <PenTool size={12} /> Room Notes (Notepad)
                      </span>
                      <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '-4px' }}>Collaborative raw editor. Synced in real-time.</p>
                      <textarea
                        value={activeRoomNotes}
                        onChange={handleNotesChange}
                        placeholder="Type collaborative notes here... Everyone in this channel can see changes instantly."
                        rows={6}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: '8px',
                          border: '1px solid var(--border-glass)',
                          background: 'var(--bg-panel)',
                          color: 'var(--text-primary)',
                          outline: 'none',
                          fontSize: '13px',
                          resize: 'none',
                          lineHeight: '1.4'
                        }}
                      />
                    </div>

                    {/* Shared Tasks management list */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid var(--border-glass)', paddingTop: '20px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <ClipboardList size={12} /> Room Task List ({activeRoomTasks.length})
                      </span>
                      
                      {/* Add Task form */}
                      <form onSubmit={handleAddTask} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <input
                          type="text"
                          placeholder="Task name..."
                          value={taskNameInput}
                          onChange={(e) => setTaskNameInput(e.target.value)}
                          required
                          style={{
                            padding: '8px 10px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-glass)',
                            background: 'var(--bg-panel)',
                            color: 'var(--text-primary)',
                            outline: 'none',
                            fontSize: '12px'
                          }}
                        />
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <select
                            value={taskAssigneeId}
                            onChange={(e) => setTaskAssigneeId(e.target.value)}
                            style={{
                              flex: 1,
                              padding: '8px',
                              borderRadius: '6px',
                              border: '1px solid var(--border-glass)',
                              background: 'var(--bg-panel)',
                              color: 'var(--text-primary)',
                              fontSize: '12px',
                              cursor: 'pointer'
                            }}
                          >
                            <option value="">Assign To...</option>
                            {onlineUsers.filter(u => activeRoomMembers.includes(u.id)).map(u => (
                              <option key={u.id} value={u.id}>{u.username}</option>
                            ))}
                          </select>
                          <button
                            type="submit"
                            style={{
                              backgroundColor: 'var(--primary)',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '8px 14px',
                              fontWeight: 600,
                              fontSize: '12px',
                              cursor: 'pointer'
                            }}
                          >
                            Add
                          </button>
                        </div>
                      </form>

                      {/* Tasks items list */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                        {activeRoomTasks.length === 0 ? (
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>No tasks assigned.</span>
                        ) : (
                          activeRoomTasks.map(tsk => {
                            const assignee = onlineUsers.find(u => u.id === tsk.assigneeId);
                            const name = assignee ? assignee.username : 'User';
                            return (
                              <div
                                key={tsk.id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '8px 10px',
                                  borderRadius: '6px',
                                  backgroundColor: 'var(--bg-panel)',
                                  border: '1px solid var(--border-glass)'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                                  <input
                                    type="checkbox"
                                    checked={tsk.completed}
                                    onChange={() => handleToggleTask(tsk.id, tsk.completed)}
                                    style={{ cursor: 'pointer' }}
                                  />
                                  <div style={{ minWidth: 0 }}>
                                    <span style={{
                                      fontSize: '12px',
                                      color: 'var(--text-primary)',
                                      textDecoration: tsk.completed ? 'line-through' : 'none',
                                      fontWeight: 500,
                                      display: 'block',
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis'
                                    }}>{tsk.name}</span>
                                    <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>Assignee: {name}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                    Select an active public or private Group Room to inspect collaborative notes and shared tasks.
                  </div>
                )}
              </div>
            )}
          </div>


        </div>
      )}
    </div>
  );
}

export default Sidebar;
