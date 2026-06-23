// frontend/src/components/Sidebar.jsx
import React, { useState, useEffect } from 'react';
import { 
  Search, LogOut, Volume2, VolumeX, Bell, BellOff,
  User, Hash, Circle, RefreshCw, X, ShieldAlert, Star,
  MessageSquare, LayoutGrid, Key, MoreHorizontal, Trash2, Pin, Archive, Map, Flame,
  Camera, Bot, Globe, Tv, Crown, Lock, ChevronRight, MessageCircle, Plus, Sparkles,
  UserPlus
} from 'lucide-react';
import MyProfileModal from './MyProfileModal';
import SnapMapModal from './SnapMapModal';
import NotificationCenter from './NotificationCenter';

function Sidebar({
  user,
  onUserUpdate,
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
  showToast,
  messages,
  isMobile
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showThreeDotMenu, setShowThreeDotMenu] = useState(false);
  const [showMyProfileModal, setShowMyProfileModal] = useState(false);
  const [showArchivedOnly, setShowArchivedOnly] = useState(false);
  const [showSnapMap, setShowSnapMap] = useState(false);
  const [hoveredId, setHoveredId] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all'); // all, DMs (personal), Groups
  const [showNotifications, setShowNotifications] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);

  // Private Room passcode prompt states
  const [promptRoomId, setPromptRoomId] = useState(null);
  const [enteredPasscode, setEnteredPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState('');

  // Show contact requests modal state
  const [showRequestsModal, setShowRequestsModal] = useState(false);

  // Long press to delete/clear chat functionality
  const longPressTimers = React.useRef({});
  const isLongPressActive = React.useRef({});

  const startPress = (chat) => {
    isLongPressActive.current[chat.id] = false;
    if (longPressTimers.current[chat.id]) {
      clearTimeout(longPressTimers.current[chat.id]);
    }
    longPressTimers.current[chat.id] = setTimeout(() => {
      isLongPressActive.current[chat.id] = true;
      handleLongPressDelete(chat);
      delete longPressTimers.current[chat.id];
    }, 700);
  };

  const endPress = (chat) => {
    if (longPressTimers.current[chat.id]) {
      clearTimeout(longPressTimers.current[chat.id]);
      delete longPressTimers.current[chat.id];
    }
  };

  const handleTouchMove = (chat) => {
    if (longPressTimers.current[chat.id]) {
      clearTimeout(longPressTimers.current[chat.id]);
      delete longPressTimers.current[chat.id];
    }
  };

  const handleLongPressDelete = (c) => {
    if (!socket || !connected) return;
    const confirmClear = window.confirm(`Are you sure you want to delete the chat with "${c.name}"? This will permanently remove all messages from the chat box and history.`);
    if (confirmClear) {
      socket.emit('clear_chat_history', {
        roomId: c.type === 'group' ? c.id : null,
        recipientId: c.type === 'direct' ? c.id : null,
        senderId: user.id
      });
      // If the deleted chat is currently active, close/deselect it to empty the chat box
      if (activeChat && activeChat.id === c.id) {
        setActiveChat(null);
      }
      showToast('Chat history deleted', 'info');
    }
  };

  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:5000' : 'https://cyberchat-4hvt.onrender.com');

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

  const renderAvatar = (userObj, size = '36px', fontSize = '14px') => {
    if (!userObj) return null;
    return (
      <div style={{
        width: size,
        height: size,
        borderRadius: '50%',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        backgroundColor: '#1e293b',
        border: '1.5px solid var(--border-glass)',
        boxShadow: 'var(--shadow-sm)',
        position: 'relative'
      }}>
        {userObj.profilePhoto ? (
          <img 
            src={`${BACKEND_URL}${userObj.profilePhoto}`} 
            alt={userObj.username} 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
          />
        ) : (
          <div 
            className={`initials-avatar ${getAvatarBgClass(userObj.username)}`}
            style={{ width: '100%', height: '100%', fontSize: fontSize, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold' }}
          >
            {getInitials(userObj.username).toUpperCase()}
          </div>
        )}
      </div>
    );
  };

  const handlePasscodeSubmit = (e) => {
    e.preventDefault();
    const targetRoom = rooms.find(r => r.id === promptRoomId);
    if (!targetRoom) return;

    if (targetRoom.passcode !== enteredPasscode) {
      setPasscodeError('Incorrect passcode');
      showToast('Incorrect passcode for private room', 'error');
      return;
    }

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

  const formatMessageTime = (isoStr) => {
    if (!isoStr) return '';
    const date = new Date(isoStr);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getStreak = (username) => {
    let hash = 0;
    for (let i = 0; i < username.length; i++) hash += username.charCodeAt(i);
    return (hash % 12) + 2; 
  };

  const getFriendEmoji = (username) => {
    const emojis = ['😎', '✨', '👾', '🔥', '👑', '🌈', '⚡', '🦄'];
    let hash = 0;
    for (let i = 0; i < username.length; i++) hash += username.charCodeAt(i);
    return emojis[hash % emojis.length];
  };

  // Compile a unified list of chats (DMs + Rooms)
  const getConversations = () => {
    // 1. DMs (Contacts or active DMs)
    const dmUserIds = new Set();
    messages.forEach(m => {
      if (!m.roomId) {
        if (m.senderId !== user.id) dmUserIds.add(m.senderId);
        if (m.recipientId && m.recipientId !== user.id) dmUserIds.add(m.recipientId);
      }
    });
    // Include all contacts
    (user.contacts || []).forEach(cid => dmUserIds.add(cid));

    const directChats = Array.from(dmUserIds).map(uid => {
      const u = onlineUsers.find(ou => ou.id === uid) || { id: uid, username: uid, status: 'offline', statusMsg: '' };
      const chatMsgs = messages.filter(m => !m.roomId && (m.senderId === uid || m.recipientId === uid));
      const lastMsg = chatMsgs[chatMsgs.length - 1];
      return {
        id: uid,
        name: u.displayName || u.username || uid,
        username: u.username || uid,
        type: 'direct',
        status: u.status,
        lastSeen: u.lastSeen,
        lastSeenSetting: u.lastSeenSetting,
        onlineVisibility: u.onlineVisibility,
        profilePhoto: u.profilePhoto,
        coverPhoto: u.coverPhoto,
        isVerified: u.isVerified,
        premiumTier: u.premiumTier,
        statusMsg: u.statusMsg,
        bio: u.bio,
        lastMessage: lastMsg,
        timestamp: lastMsg ? new Date(lastMsg.timestamp) : new Date(0),
        unread: unreadCounts[uid] || 0
      };
    });

    // 2. Group Rooms
    const groupChats = rooms.filter(room => 
      (room.members?.includes(user.id) || room.creatorId === user.id || room.creatorId === 'system') &&
      !['room_general', 'room_gaming', 'room_tech'].includes(room.id)
    ).map(room => {
      const chatMsgs = messages.filter(m => m.roomId === room.id);
      const lastMsg = chatMsgs[chatMsgs.length - 1];
      return {
        id: room.id,
        name: room.name,
        type: 'group',
        icon: room.icon || '💬',
        isPrivate: room.isPrivate,
        creatorId: room.creatorId,
        members: room.members,
        description: room.description,
        lastMessage: lastMsg,
        timestamp: lastMsg ? new Date(lastMsg.timestamp) : new Date(0),
        unread: unreadCounts[room.id] || 0
      };
    });

    // Combine
    let all = [...directChats, ...groupChats];

    // Search filter
    if (searchTerm.trim()) {
      const searchWords = searchTerm.toLowerCase().trim().split(/\s+/).filter(Boolean);
      all = all.filter(c => {
        const name = (c.name || '').toLowerCase();
        const id = (c.id || '').toLowerCase();
        const username = c.type === 'direct' ? (c.username || '').toLowerCase() : '';
        const combined = `${name} ${id} ${username}`;
        return searchWords.every(word => combined.includes(word));
      });
    }

    // Filter chip selector
    if (activeFilter === 'direct') {
      all = all.filter(c => c.type === 'direct');
    } else if (activeFilter === 'group') {
      all = all.filter(c => c.type === 'group');
    }

    // Archive toggle
    all = all.filter(c => {
      const isArchived = user.archivedChats?.includes(c.id);
      return showArchivedOnly ? isArchived : !isArchived;
    });

    // Sorting: Pinned first, then by last message timestamp (newest first), then alphabetically
    return all.sort((a, b) => {
      const aPinned = user.pinnedChats?.includes(a.id) ? 1 : 0;
      const bPinned = user.pinnedChats?.includes(b.id) ? 1 : 0;
      if (aPinned !== bPinned) return bPinned - aPinned;

      const aTime = a.timestamp.getTime();
      const bTime = b.timestamp.getTime();
      if (aTime !== bTime) return bTime - aTime;

      return a.name.localeCompare(b.name);
    });
  };

  const conversations = getConversations();
  const pinnedChats = conversations.filter(c => user.pinnedChats?.includes(c.id));
  const unreadChats = conversations.filter(c => c.unread > 0 && !user.pinnedChats?.includes(c.id));
  const recentChats = conversations.filter(c => !user.pinnedChats?.includes(c.id) && c.unread === 0);

  // Search discovery users
  const discoverUsers = onlineUsers.filter(u => {
    if (u.id === user.id || (user.contacts || []).includes(u.id)) return false;
    const searchWords = searchTerm.toLowerCase().trim().split(/\s+/).filter(Boolean);
    if (searchWords.length === 0) return false;
    const username = (u.username || '').toLowerCase();
    const id = (u.id || '').toLowerCase();
    const displayName = (u.displayName || '').toLowerCase();
    const combined = `${username} ${id} ${displayName}`;
    return searchWords.every(word => combined.includes(word));
  });

  const incomingRequestsList = onlineUsers.filter(u =>
    (user.receivedRequests || []).includes(u.id)
  );

  const handleClearActiveChat = (c) => {
    if (!socket || !connected) return;
    const confirmClear = window.confirm('Are you sure you want to permanently clear this chat history? This action cannot be undone.');
    if (confirmClear) {
      socket.emit('clear_chat_history', {
        roomId: c.type === 'group' ? c.id : null,
        recipientId: c.type === 'direct' ? c.id : null,
        senderId: user.id
      });
      showToast('Chat history cleared', 'info');
    }
  };

  const renderChatSection = (chatList, sectionTitle) => {
    if (chatList.length === 0) return null;
    return (
      <div style={{ marginBottom: '16px' }}>
        <h4 style={{
          fontSize: '11px',
          fontWeight: 800,
          textTransform: 'uppercase',
          color: 'var(--text-muted)',
          padding: '6px 12px',
          letterSpacing: '0.05em',
          margin: '0 0 6px 0',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          {sectionTitle} ({chatList.length})
        </h4>
        {chatList.map(chat => {
          const isActive = activeChat && activeChat.id === chat.id;
          const isTyping = (typingUsers[chat.id] || []).length > 0;
          const isBlocked = user.blockedUsers?.includes(chat.id);
          const isPinned = user.pinnedChats?.includes(chat.id);
          const isMuted = user.mutedChats?.includes(chat.id);
          const isArchived = user.archivedChats?.includes(chat.id);
          const isHovered = hoveredId === chat.id;

          let previewText = '';
          if (isTyping) {
            previewText = 'typing...';
          } else if (chat.lastMessage) {
            const prefix = chat.lastMessage.senderId === user.id ? 'You: ' : '';
            previewText = prefix + (chat.lastMessage.text || '📁 Media Attachment');
          } else {
            previewText = chat.type === 'group' ? (chat.description || 'No description.') : (chat.statusMsg || 'Hey there!');
          }

          return (
            <div
              key={chat.id}
              onClick={() => {
                if (isLongPressActive.current[chat.id]) {
                  isLongPressActive.current[chat.id] = false;
                  return;
                }
                chat.type === 'group' ? handleRoomClick(chat) : setActiveChat({ id: chat.id, name: chat.name, type: 'direct' });
              }}
              onMouseEnter={() => setHoveredId(chat.id)}
              onMouseLeave={() => { setHoveredId(null); endPress(chat); }}
              onMouseDown={() => startPress(chat)}
              onMouseUp={() => endPress(chat)}
              onTouchStart={() => startPress(chat)}
              onTouchEnd={() => endPress(chat)}
              onTouchMove={() => handleTouchMove(chat)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                borderRadius: '16px',
                cursor: 'pointer',
                backgroundColor: isActive ? 'var(--primary-light)' : 'var(--bg-panel)',
                transition: 'all 0.2s ease',
                marginBottom: '8px',
                border: isActive ? '1px solid var(--primary)' : '1px solid var(--border-glass)',
                boxShadow: isActive ? '0 4px 12px rgba(0, 168, 132, 0.08)' : 'var(--shadow-sm)'
              }}
              onMouseOver={(e) => { if (!isActive) { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
              onMouseOut={(e) => { if (!isActive) { e.currentTarget.style.borderColor = 'var(--border-glass)'; e.currentTarget.style.transform = 'translateY(0)'; } }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  {chat.type === 'group' ? (
                    <div className={`initials-avatar bg-av-5`} style={{ width: '44px', height: '44px', borderRadius: '12px', fontSize: '18px', fontWeight: 800, display: 'flex', alignItems: 'center', justify: 'center', color: '#fff' }}>
                      {chat.icon || '#'}
                    </div>
                  ) : (
                    renderAvatar(chat, '44px', '16px')
                  )}

                  {chat.type === 'direct' && chat.onlineVisibility !== 'invisible' && (
                    <span style={{ position: 'absolute', bottom: '1px', right: '1px', width: '12px', height: '12px', borderRadius: '50%', backgroundColor: chat.status === 'online' ? 'var(--success)' : 'var(--text-muted)', border: '2px solid var(--bg-panel)' }} />
                  )}
                </div>

                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justify: 'space-between', gap: '4px' }}>
                    <h4 style={{
                      fontSize: '14.5px',
                      fontWeight: chat.unread > 0 ? 800 : 600,
                      color: 'var(--text-primary)',
                      margin: 0,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      {chat.name}
                      {chat.type === 'direct' && getFriendEmoji(chat.username)}
                      {chat.isPrivate && <Lock size={12} style={{ color: 'var(--warning)', marginLeft: '2px' }} />}
                      {isPinned && <Pin size={11} style={{ color: 'var(--primary)' }} fill="var(--primary)" />}
                      {isMuted && <VolumeX size={11} style={{ color: 'var(--text-muted)' }} />}
                    </h4>
                    
                    {chat.lastMessage && (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0 }}>
                        {formatMessageTime(chat.lastMessage.timestamp)}
                      </span>
                    )}
                  </div>

                  <p style={{
                    fontSize: '12.5px',
                    color: isTyping ? 'var(--primary)' : (chat.unread > 0 ? 'var(--text-primary)' : 'var(--text-muted)'),
                    margin: '3px 0 0 0',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    fontStyle: isTyping ? 'italic' : 'normal',
                    fontWeight: chat.unread > 0 ? 700 : 400
                  }}>
                    {previewText}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '12px' }}>
                {isHovered ? (
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }} onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => socket.emit('toggle_chat_status', { targetId: chat.id, statusType: 'pin', active: !isPinned })}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: isPinned ? 'var(--primary)' : 'var(--text-muted)', display: 'flex' }}
                      title={isPinned ? "Unpin Chat" : "Pin Chat"}
                    >
                      <Pin size={13} fill={isPinned ? 'var(--primary)' : 'none'} />
                    </button>
                    <button
                      onClick={() => socket.emit('toggle_chat_status', { targetId: chat.id, statusType: 'mute', active: !isMuted })}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: isMuted ? 'var(--danger)' : 'var(--text-muted)', display: 'flex' }}
                      title={isMuted ? "Unmute Notifications" : "Mute Notifications"}
                    >
                      {isMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
                    </button>
                    <button
                      onClick={() => socket.emit('toggle_chat_status', { targetId: chat.id, statusType: 'archive', active: !isArchived })}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: isArchived ? 'var(--primary)' : 'var(--text-muted)', display: 'flex' }}
                      title={isArchived ? "Unarchive Chat" : "Archive Chat"}
                    >
                      <Archive size={13} />
                    </button>
                    <button
                      onClick={() => handleClearActiveChat(chat)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--danger)', display: 'flex' }}
                      title="Clear History"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ) : (
                  <>
                    {chat.unread > 0 && (
                      <span style={{ backgroundColor: 'var(--primary)', color: 'var(--text-on-primary)', fontSize: '10px', fontWeight: 800, borderRadius: '10px', minWidth: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
                        {chat.unread}
                      </span>
                    )}
                    {chat.type === 'direct' && (
                      <span style={{ fontSize: '11px', color: '#ff9f43', display: 'flex', alignItems: 'center', gap: '1px', flexShrink: 0 }}>
                        <Flame size={11} fill="#ff9f43" stroke="none" />{getStreak(chat.username)}
                      </span>
                    )}
                  </>
                )}
                {isBlocked && !isHovered && <ShieldAlert size={12} style={{ color: 'var(--danger)' }} />}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: 'var(--bg-sidebar)',
      minWidth: 0,
      position: 'relative'
    }}>
      {/* A. Header Bar */}
      <div style={{
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--border-glass)',
        backgroundColor: 'var(--bg-panel)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
          {isMobile ? (
            <>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 4px 10px rgba(0, 168, 132, 0.3)',
                flexShrink: 0
              }}>
                <MessageSquare size={18} />
              </div>
              <div style={{ minWidth: 0 }}>
                <h2 style={{ fontSize: '18px', fontWeight: 850, fontFamily: 'Outfit, sans-serif', color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  CyberChat
                </h2>
                <span style={{ fontSize: '10px', color: connected ? 'var(--success)' : 'var(--warning)', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 700 }}>
                  <Circle size={6} fill={connected ? 'var(--success)' : 'var(--warning)'} stroke="none" />
                  {connected ? 'Standing Node' : 'Sync Offline'}
                </span>
              </div>
            </>
          ) : (
            <div style={{ minWidth: 0 }}>
              <h2 style={{ fontSize: '22px', fontWeight: 800, fontFamily: 'Outfit, sans-serif', color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Messages
              </h2>
              <span style={{ fontSize: '10px', color: connected ? 'var(--success)' : 'var(--warning)', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 700, marginTop: '2px' }}>
                <Circle size={5} fill={connected ? 'var(--success)' : 'var(--warning)'} stroke="none" />
                {connected ? 'Connected' : 'Sync Offline'}
              </span>
            </div>
          )}
        </div>

        {/* Menu Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {/* New Chat Button */}
          <button
            onClick={() => setShowNewChatModal(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '6px', display: 'flex', borderRadius: '50%', transition: 'background 0.2s' }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--border-glass)'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            title="Start New Chat"
          >
            <Plus size={20} />
          </button>

          {/* Notifications Button */}
          <button
            onClick={() => setShowNotifications(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '6px', display: 'flex', borderRadius: '50%', transition: 'background 0.2s', position: 'relative' }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--border-glass)'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            title="Notifications Alert"
          >
            <Bell size={18} />
            <span style={{ position: 'absolute', top: '5px', right: '5px', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--danger)' }} />
          </button>

          {/* Contact Requests Button */}
          <button
            onClick={() => setShowRequestsModal(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '6px', display: 'flex', borderRadius: '50%', transition: 'background 0.2s', position: 'relative' }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--border-glass)'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            title="Contact Requests"
          >
            <UserPlus size={18} />
            {incomingRequestsList.length > 0 && (
              <span style={{ position: 'absolute', top: '5px', right: '5px', width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--danger)' }} />
            )}
          </button>

          <button
            onClick={() => setShowSnapMap(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '6px', display: 'flex', borderRadius: '50%', transition: 'background 0.2s' }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--border-glass)'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            title="Snap Map Grid"
          >
            <Map size={18} />
          </button>
          
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowThreeDotMenu(!showThreeDotMenu)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                display: 'flex',
                padding: '6px',
                borderRadius: '50%',
                transition: 'background-color var(--transition-fast)'
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--border-glass)'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              title="Menu Options"
            >
              <MoreHorizontal size={20} />
            </button>

            {showThreeDotMenu && (
              <>
                <div 
                  style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99 }} 
                  onClick={() => setShowThreeDotMenu(false)}
                />
                <div style={{
                  position: 'absolute',
                  top: '36px',
                  right: '0',
                  backgroundColor: 'var(--bg-panel)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: '8px',
                  boxShadow: 'var(--shadow-md)',
                  zIndex: 100,
                  width: '200px',
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '8px',
                  textAlign: 'left'
                }}>
                  <button
                    onClick={() => { setShowThreeDotMenu(false); setShowMyProfileModal(true); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '13px', borderRadius: '4px', textAlign: 'left', width: '100%' }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--primary-light)'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <User size={16} />
                    My Profile Info
                  </button>

                  <button
                    onClick={() => { setSoundEnabled(!soundEnabled); setShowThreeDotMenu(false); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '13px', borderRadius: '4px', textAlign: 'left', width: '100%' }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--primary-light)'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                    {soundEnabled ? 'Mute Sounds' : 'Unmute Sounds'}
                  </button>

                  <button
                    onClick={() => { requestNotificationPermission(); setShowThreeDotMenu(false); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: 'none', border: 'none', cursor: 'pointer', color: notificationsPermission === 'granted' ? 'var(--primary)' : 'var(--text-secondary)', fontSize: '13px', borderRadius: '4px', textAlign: 'left', width: '100%' }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--primary-light)'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    {notificationsPermission === 'granted' ? <Bell size={16} /> : <BellOff size={16} />}
                    Alert Permission
                  </button>

                  <button
                    onClick={() => { logout(); setShowThreeDotMenu(false); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: '13px', borderRadius: '4px', textAlign: 'left', width: '100%', marginTop: '4px', borderTop: '1px solid var(--border-glass)' }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <LogOut size={16} />
                    Logout Node
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* B. Connection warning banner */}
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
          gap: '6px'
        }}>
          <RefreshCw size={12} className="spin" />
          Network sync interrupted...
        </div>
      )}

      {/* C. Ambient sound player removed */}

      {/* D. Search and filters */}
      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: 'var(--bg-panel)', borderBottom: '1px solid var(--border-glass)' }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search conversations, rooms..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 14px 10px 36px',
              borderRadius: 'var(--radius-md)',
              border: '1.5px solid var(--border-glass)',
              backgroundColor: 'var(--bg-app)',
              color: 'var(--text-primary)',
              outline: 'none',
              fontSize: '13px',
              transition: 'border-color 0.2s'
            }}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} style={{ position: 'absolute', right: '12px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filter chips bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', paddingBottom: '2px' }}>
          {[
            { id: 'all', label: 'All' },
            { id: 'direct', label: 'Personal' },
            { id: 'group', label: 'Groups' }
          ].map(chip => (
            <button
              key={chip.id}
              onClick={() => setActiveFilter(chip.id)}
              style={{
                padding: '6px 14px',
                borderRadius: '16px',
                border: 'none',
                backgroundColor: activeFilter === chip.id ? 'var(--primary)' : 'var(--bg-app)',
                color: activeFilter === chip.id ? 'var(--text-on-primary)' : 'var(--text-secondary)',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s'
              }}
            >
              {chip.label}
            </button>
          ))}

          {/* Archived switch toggle */}
          <button
            onClick={() => setShowArchivedOnly(!showArchivedOnly)}
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              color: showArchivedOnly ? 'var(--primary)' : 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px',
              fontWeight: 700
            }}
          >
            <Archive size={14} />
            <span>{showArchivedOnly ? 'Archived' : 'Active'}</span>
          </button>
        </div>
      </div>

      {/* E. Scrollable List of Chats */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '8px 8px 80px 8px' // Bottom padding to prevent FAB overlap
      }}>
        {/* Incoming Contact Requests */}
        {incomingRequestsList.length > 0 && !showArchivedOnly && (
          <div style={{ marginBottom: '16px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px' }}>
            <h3 style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', padding: '6px 12px', letterSpacing: '0.05em', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
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
                  marginTop: '6px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                  {renderAvatar(u, '32px', '13px')}
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.username}</h4>
                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>wants to add you</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => {
                      socket.emit('accept_contact_request', { userId: user.id, targetUserId: u.id });
                      onUserUpdate({
                        receivedRequests: (user.receivedRequests || []).filter(id => id !== u.id),
                        contacts: [...(user.contacts || []), u.id]
                      });
                    }}
                    style={{ backgroundColor: 'var(--primary)', color: 'var(--text-on-primary)', border: 'none', borderRadius: '6px', padding: '6px 10px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => {
                      socket.emit('decline_contact_request', { userId: user.id, targetUserId: u.id });
                      onUserUpdate({
                        receivedRequests: (user.receivedRequests || []).filter(id => id !== u.id)
                      });
                    }}
                    style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '6px', padding: '6px 10px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Ignore
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Chats List Render */}
        {conversations.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <MessageCircle size={40} opacity={0.2} style={{ margin: '0 auto 12px auto' }} />
            <div style={{ fontSize: '14px', fontWeight: 600 }}>No conversations found</div>
            <p style={{ fontSize: '12px', marginTop: '4px' }}>
              {searchTerm ? 'Try checking your search parameters' : 'Start a chat by searching contacts or clicking the + button'}
            </p>
          </div>
        ) : (
          <>
            {renderChatSection(pinnedChats, '📌 Pinned Chats')}
            {renderChatSection(unreadChats, '✉️ Unread Chats')}
            {renderChatSection(recentChats, '💬 Recent Chats')}
          </>
        )}

        {/* Global Contacts Discovery on active search */}
        {searchTerm.trim().length > 0 && (
          <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-glass)', paddingTop: '16px' }}>
            <h3 style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', padding: '0 12px 10px 12px', letterSpacing: '0.05em', margin: 0 }}>
              Global Network Finder ({discoverUsers.length})
            </h3>
            {discoverUsers.length === 0 ? (
              <div style={{ padding: '12px', fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center' }}>No users matching "{searchTerm}"</div>
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
                      marginBottom: '6px',
                      backgroundColor: 'var(--bg-panel)',
                      border: '1px solid var(--border-glass)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                      {renderAvatar(u, '36px', '14px')}
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <h4 style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{u.username}</h4>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>{u.statusMsg || 'Hey there!'}</span>
                      </div>
                    </div>
                    
                    <div>
                      {hasSent ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Request Sent</span>
                          <button
                            onClick={() => {
                              socket.emit('cancel_contact_request', { userId: user.id, targetUserId: u.id });
                              onUserUpdate({
                                sentRequests: (user.sentRequests || []).filter(id => id !== u.id)
                              });
                            }}
                            style={{ backgroundColor: 'transparent', color: 'var(--danger)', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex' }}
                            title="Cancel Request"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : hasReceived ? (
                        <button
                          onClick={() => {
                            socket.emit('accept_contact_request', { userId: user.id, targetUserId: u.id });
                            onUserUpdate({
                              receivedRequests: (user.receivedRequests || []).filter(id => id !== u.id),
                              contacts: [...(user.contacts || []), u.id]
                            });
                          }}
                          style={{ backgroundColor: 'var(--primary)', color: 'var(--text-on-primary)', border: 'none', borderRadius: '6px', padding: '6px 10px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                        >
                          Accept
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            socket.emit('send_contact_request', { senderId: user.id, targetUserId: u.id });
                            onUserUpdate({
                              sentRequests: [...(user.sentRequests || []), u.id]
                            });
                          }}
                          style={{
                            backgroundColor: 'transparent',
                            color: 'var(--primary)',
                            border: '1.5px solid var(--primary)',
                            borderRadius: '6px',
                            padding: '5px 10px',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          Connect
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* F. Modals Overlay */}
      {showMyProfileModal && (
        <MyProfileModal
          user={user}
          onClose={() => setShowMyProfileModal(false)}
          socket={socket}
          connected={connected}
          onUserUpdate={onUserUpdate}
          showToast={showToast}
        />
      )}

      {showSnapMap && (
        <SnapMapModal
          user={user}
          onlineUsers={onlineUsers}
          onClose={() => setShowSnapMap(false)}
          showToast={showToast}
        />
      )}

      {showNotifications && (
        <NotificationCenter
          socket={socket}
          currentUser={user}
          apiBase={BACKEND_URL}
          onClose={() => setShowNotifications(false)}
        />
      )}

      {/* Contact Requests Modal Overlay */}
      {showRequestsModal && (
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(5, 10, 14, 0.8)',
          backdropFilter: 'blur(8px)',
          zIndex: 200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-panel)',
            border: '1.5px solid var(--border-glass)',
            borderRadius: '16px',
            padding: '24px',
            width: '100%',
            maxWidth: '340px',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '80%'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justify: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserPlus size={18} style={{ color: 'var(--primary)' }} /> Contact Requests ({incomingRequestsList.length})
              </h3>
              <button 
                onClick={() => setShowRequestsModal(false)} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: '4px', borderRadius: '50%' }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--border-glass)'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <X size={18} />
              </button>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {incomingRequestsList.length === 0 ? (
                <div style={{ padding: '30px 10px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <UserPlus size={36} opacity={0.2} style={{ margin: '0 auto 8px auto' }} />
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>No incoming requests</div>
                </div>
              ) : (
                incomingRequestsList.map(u => (
                  <div
                    key={u.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--bg-app)',
                      border: '1px solid var(--border-glass)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                      {renderAvatar(u, '32px', '13px')}
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <h4 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.username}</h4>
                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>wants to connect</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', marginLeft: '8px' }}>
                      <button
                        onClick={() => {
                          socket.emit('accept_contact_request', { userId: user.id, targetUserId: u.id });
                          onUserUpdate({
                            receivedRequests: (user.receivedRequests || []).filter(id => id !== u.id),
                            contacts: [...(user.contacts || []), u.id]
                          });
                        }}
                        style={{ backgroundColor: 'var(--primary)', color: 'var(--text-on-primary)', border: 'none', borderRadius: '6px', padding: '6px 10px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => {
                          socket.emit('decline_contact_request', { userId: user.id, targetUserId: u.id });
                          onUserUpdate({
                            receivedRequests: (user.receivedRequests || []).filter(id => id !== u.id)
                          });
                        }}
                        style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '6px', padding: '6px 10px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Ignore
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Passcode Modal Overlay for private rooms */}
      {promptRoomId !== null && (
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(5, 10, 14, 0.8)',
          backdropFilter: 'blur(8px)',
          zIndex: 200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-panel)',
            border: '1.5px solid var(--border-glass)',
            borderRadius: '16px',
            padding: '24px',
            width: '100%',
            maxWidth: '320px',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Lock size={18} style={{ color: 'var(--warning)' }} /> Private Room Lock
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 16px 0' }}>
              Enter passcode to join group conversation securely.
            </p>
            <form onSubmit={handlePasscodeSubmit}>
              <input
                type="password"
                placeholder="Passcode..."
                value={enteredPasscode}
                onChange={e => setEnteredPasscode(e.target.value)}
                autoFocus
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1.5px solid var(--border-glass)',
                  backgroundColor: 'var(--bg-app)',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              {passcodeError && (
                <div style={{ fontSize: '11px', color: 'var(--danger)', marginTop: '6px', fontWeight: 600 }}>{passcodeError}</div>
              )}
              <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
                <button
                  type="button"
                  onClick={() => setPromptRoomId(null)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-glass)',
                    backgroundColor: 'transparent',
                    color: 'var(--text-secondary)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: 'var(--primary)',
                    color: 'var(--text-on-primary)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  Unlock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Ambient audio widget removed

export default Sidebar;
