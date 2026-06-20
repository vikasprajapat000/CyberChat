// frontend/src/components/ChatArea.jsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  Paperclip, Smile, Send, Search, Pin, CornerUpLeft, Edit2, Trash2, 
  Copy, X, Image as ImageIcon, FileText, ArrowLeft, Star, Forward,
  ChevronDown, AlertTriangle, Info, Eye, ShieldAlert, Phone, Video,
  Mic, MicOff, BarChart2, CheckSquare, ExternalLink, HelpCircle, Sticker
} from 'lucide-react';
import EmojiPicker from './EmojiPicker';
import ForwardModal from './ForwardModal';
import PollCreator from './PollCreator';
import confetti from 'canvas-confetti';
import { SOCKET_EVENTS } from '../../../shared/constants.json';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://cyberchat-tiy0.onrender.com';

// Pre-seeded local developer sticker pack
const DEVELOPER_STICKERS = [
  { text: '🚀 LGTM (Looks Good To Me)', display: '🚀 LGTM' },
  { text: '🎉 Code Compiles Successfully!', display: '🎉 Compiles!' },
  { text: '🐛 Debugging in Progress...', display: '🐛 Debugging' },
  { text: '☕ Coffee Fuel Needed', display: '☕ Coffee Fuel' },
  { text: '⏳ Deadline Approaching!', display: '⏳ Deadline' },
  { text: '🛡️ Production Secure & Stable', display: '🛡️ Prod Stable' }
];

function ChatArea({
  user,
  socket,
  connected,
  latencyQuality,
  activeChat,
  setActiveChat,
  messages,
  typingUsers,
  onlineUsers,
  onInspectUser,
  isMobile,
  theme,
  showToast,
  rooms,
  onStartCall // Trigger call callback
}) {
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  
  // Modals & Drawers states
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [stickerPickerOpen, setStickerPickerOpen] = useState(false);
  const [pollCreatorOpen, setPollCreatorOpen] = useState(false);
  const [showLinksDrawer, setShowLinksDrawer] = useState(false);
  const [screenshotAlert, setScreenshotAlert] = useState(null);
  const [forwardingMessage, setForwardingMessage] = useState(null);

  // File Upload states
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Voice Note Recorder states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);

  // Infinite Scroll state
  const [visibleLimit, setVisibleLimit] = useState(50);
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(true);

  // Local Starred & Deleted states
  const [starredMessageIds, setStarredMessageIds] = useState(() => {
    const saved = localStorage.getItem(`cc_starred_${user.id}`);
    return saved ? JSON.parse(saved) : [];
  });
  const [deletedForMeIds, setDeletedForMeIds] = useState(() => {
    const saved = localStorage.getItem('cc_deleted_for_me');
    return saved ? JSON.parse(saved) : [];
  });

  const chatEndRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const recordingTimerRef = useRef(null);
  const isTypingRef = useRef(false);

  // Keyboard Shortcuts setup
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setEmojiPickerOpen(false);
        setStickerPickerOpen(false);
        setReplyingTo(null);
        setEditingMessage(null);
        setSearchOpen(false);
        setSearchQuery('');
        setShowLinksDrawer(false);
      }
      if (e.altKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        setSearchOpen(true);
        document.getElementById('message-search-input')?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Sync scroll positions
  useEffect(() => {
    if (isScrolledToBottom) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, typingUsers, replyingTo, filePreview, isRecording, isScrolledToBottom]);

  // Clean up on conversation targets swap
  useEffect(() => {
    setInputText('');
    setReplyingTo(null);
    setEditingMessage(null);
    setSelectedFile(null);
    setFilePreview(null);
    setSearchQuery('');
    setSearchOpen(false);
    setEmojiPickerOpen(false);
    setStickerPickerOpen(false);
    setShowLinksDrawer(false);
    setVisibleLimit(50);
    setIsScrolledToBottom(true);
    stopRecording(false); // Abort any active recording
    
    if (socket && isTypingRef.current) {
      isTypingRef.current = false;
      socket.emit('typing', {
        roomId: activeChat?.type === 'group' ? activeChat.id : null,
        recipientId: activeChat?.type === 'direct' ? activeChat.id : null,
        isTyping: false,
        userId: user.id
      });
    }
  }, [activeChat]);

  // WebRTC screenshots warn handler
  useEffect(() => {
    if (!socket) return;

    const handleScreenshotBroadcast = (alert) => {
      const isRelevant = activeChat && (
        (alert.roomId && activeChat.id === alert.roomId) ||
        (!alert.roomId && (alert.roomId === null) && (alert.username === activeChat.name || alert.recipientId === user.id))
      );

      if (isRelevant) {
        setScreenshotAlert(alert);
        confetti({ particleCount: 50, spread: 60, colors: ['#ff3b30', '#ff9500'] });
        setTimeout(() => setScreenshotAlert(null), 5000);
      }
    };

    socket.on('screenshot_reported', handleScreenshotBroadcast);
    return () => {
      socket.off('screenshot_reported', handleScreenshotBroadcast);
    };
  }, [socket, activeChat, user]);

  if (!activeChat) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        width: '100%',
        backgroundColor: 'var(--bg-chat)',
        color: 'var(--text-secondary)',
        padding: '24px',
        textAlign: 'center',
        userSelect: 'none'
      }}>
        <div style={{
          background: 'var(--primary-light)',
          color: 'var(--primary)',
          padding: '20px',
          borderRadius: '50%',
          marginBottom: '16px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <HelpCircle size={48} />
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px', fontFamily: 'Outfit, sans-serif' }}>
          Select a Conversation
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '320px', lineHeight: '1.5' }}>
          Choose a public channel or direct contact from the sidebar to begin messaging in real-time.
        </p>
      </div>
    );
  }

  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    if (scrollTop < 30) {
      setVisibleLimit(prev => prev + 50);
    }
    setIsScrolledToBottom(scrollHeight - scrollTop - clientHeight < 100);
  };

  // Jump to specific message element scroll
  const handleJumpToMessage = (msgId) => {
    const element = document.getElementById(`msg-node-${msgId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Add quick visual pulse/glow effect
      element.style.outline = '2px solid var(--primary)';
      element.style.transition = 'outline var(--transition-fast)';
      setTimeout(() => {
        element.style.outline = 'none';
      }, 2000);
    } else {
      showToast('Scroll target is too old. Load more messages to inspect.', 'info');
    }
  };

  // Voice Recording handles (using browser HTML5 MediaRecorder API)
  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        // Build the audio file blob
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const file = new File([blob], `voice_note_${Date.now()}.webm`, { type: 'audio/webm' });
        
        // Upload voice note
        setUploading(true);
        try {
          const formData = new FormData();
          formData.append('file', file);

          const res = await fetch(`${BACKEND_URL}/api/upload`, {
            method: 'POST',
            body: formData
          });

          if (!res.ok) throw new Error();

          const uploadedData = await res.json();
          
          // Emit audio message
          socket.emit('send_message', {
            senderId: user.id,
            recipientId: activeChat.type === 'direct' ? activeChat.id : null,
            roomId: activeChat.type === 'group' ? activeChat.id : null,
            text: '🎤 Voice Message',
            mediaUrl: uploadedData.fileUrl,
            mediaType: 'audio',
            mediaName: 'Voice Note.webm'
          });
        } catch (err) {
          showToast('Failed to upload voice message', 'error');
        } finally {
          setUploading(false);
        }
      };

      setAudioChunks(chunks);
      setMediaRecorder(recorder);
      setRecordingDuration(0);
      setIsRecording(true);
      recorder.start();

      // Start duration clock
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

      showToast('Recording voice note...', 'info');
    } catch (err) {
      showToast('Microphone hardware access denied.', 'error');
    }
  }

  function stopRecording(shouldSend = true) {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
    
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      if (!shouldSend) {
        // Abort recording cleanly
        mediaRecorder.onstop = null;
      }
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach(track => track.stop()); // release stream
    }

    setIsRecording(false);
    setRecordingDuration(0);
  }

  // Launch Poll Cards Callback
  const handleLaunchPoll = (question, options) => {
    if (!connected) return;

    socket.emit('send_message', {
      senderId: user.id,
      recipientId: activeChat.type === 'direct' ? activeChat.id : null,
      roomId: activeChat.type === 'group' ? activeChat.id : null,
      text: `📊 Interactive Poll: "${question}"`,
      isPoll: true,
      pollData: { question, options }
    });

    setPollCreatorOpen(false);
    showToast('Poll launched!', 'success');
  };

  // Star message triggers
  const handleStarToggle = (msgId) => {
    let updated;
    if (starredMessageIds.includes(msgId)) {
      updated = starredMessageIds.filter(id => id !== msgId);
      showToast('Message unstarred', 'info');
    } else {
      updated = [...starredMessageIds, msgId];
      showToast('Message bookmarked!', 'success');
      confetti({ particleCount: 30, colors: ['#ffd700'] });
    }
    setStarredMessageIds(updated);
    localStorage.setItem(`cc_starred_${user.id}`, JSON.stringify(updated));
  };

  // Send Sticker message
  const handleSendSticker = (stickerText) => {
    if (!connected) return;

    socket.emit('send_message', {
      senderId: user.id,
      recipientId: activeChat.type === 'direct' ? activeChat.id : null,
      roomId: activeChat.type === 'group' ? activeChat.id : null,
      text: stickerText,
      mediaUrl: null,
      mediaType: 'sticker',
      mediaName: stickerText
    });

    setStickerPickerOpen(false);
  };

  // Filter messages for active conversation
  const chatMessages = messages.filter(m => {
    if (deletedForMeIds.includes(m.id)) return false;

    if (activeChat.type === 'group') {
      return m.roomId === activeChat.id;
    } else {
      return !m.roomId && (
        (m.senderId === user.id && m.recipientId === activeChat.id) ||
        (m.senderId === activeChat.id && m.recipientId === user.id)
      );
    }
  });

  // Extract shared links inside room history (Productivity links tab)
  const sharedLinksList = chatMessages.filter(m => {
    return m.text && (m.text.includes('http://') || m.text.includes('https://'));
  }).map(m => {
    const urls = m.text.match(/https?:\/\/[^\s]+/gi);
    return {
      id: m.id,
      senderId: m.senderId,
      timestamp: m.timestamp,
      url: urls ? urls[0] : ''
    };
  }).filter(l => l.url);

  // Filters search queries
  const filteredChatMessages = searchQuery.trim()
    ? chatMessages.filter(m => m.text && m.text.toLowerCase().includes(searchQuery.toLowerCase()))
    : chatMessages;

  const visibleMessages = filteredChatMessages.slice(-visibleLimit);
  const pinnedMessages = chatMessages.filter(m => m.pinned && !m.deleted);

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

  const getMediaSrc = (url) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${BACKEND_URL}${url}`;
  };

  const formatTime = (isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  const formatDateLabel = (isoString) => {
    try {
      const date = new Date(isoString);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (date.toDateString() === today.toDateString()) {
        return 'Today';
      } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
      } else {
        return date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
      }
    } catch (e) {
      return '';
    }
  };

  const handleReportScreenshotClick = () => {
    if (!connected || !socket) return;
    socket.emit('report_screenshot', {
      roomId: activeChat.type === 'group' ? activeChat.id : null,
      recipientId: activeChat.type === 'direct' ? activeChat.id : null,
      userId: user.id
    });
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showToast('File size exceeds the 10MB limit.', 'error');
      return;
    }

    setSelectedFile(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        setFilePreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setFilePreview('file');
    }
  };

  const handleSend = async () => {
    if (!connected || !socket) return;

    if (editingMessage) {
      if (!inputText.trim()) return;
      socket.emit('edit_message', {
        messageId: editingMessage.id,
        text: inputText.trim(),
        senderId: user.id
      });
      setEditingMessage(null);
      setInputText('');
      return;
    }

    let fileUrl = null;
    let fileType = null;
    let fileName = null;

    if (selectedFile) {
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', selectedFile);

        const res = await fetch(`${BACKEND_URL}/api/upload`, {
          method: 'POST',
          body: formData
        });

        if (!res.ok) throw new Error('Upload failed');

        const data = await res.json();
        fileUrl = data.fileUrl;
        fileType = data.fileType;
        fileName = data.fileName;
      } catch (err) {
        showToast('Failed to upload file attachment', 'error');
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    if (!inputText.trim() && !fileUrl) return;

    const payload = {
      senderId: user.id,
      recipientId: activeChat.type === 'direct' ? activeChat.id : null,
      roomId: activeChat.type === 'group' ? activeChat.id : null,
      text: inputText.trim(),
      replyToId: replyingTo ? replyingTo.id : null
    };

    if (fileUrl) {
      payload.mediaUrl = fileUrl;
      payload.mediaType = fileType;
      payload.mediaName = fileName;
      if (!payload.text) {
        payload.text = `📁 Shared a file: ${fileName}`;
      }
    }

    socket.emit('send_message', payload);

    setInputText('');
    setReplyingTo(null);
    setSelectedFile(null);
    setFilePreview(null);
  };

  const handleInputChange = (e) => {
    setInputText(e.target.value);
    
    if (!socket || !connected) return;

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit('typing', {
        roomId: activeChat.type === 'group' ? activeChat.id : null,
        recipientId: activeChat.type === 'direct' ? activeChat.id : null,
        isTyping: true,
        userId: user.id
      });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      socket.emit('typing', {
        roomId: activeChat.type === 'group' ? activeChat.id : null,
        recipientId: activeChat.type === 'direct' ? activeChat.id : null,
        isTyping: false,
        userId: user.id
      });
    }, 2000);
  };

  const handleSendTextSubmit = (e) => {
    if (e) e.preventDefault();
    handleSend();
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendTextSubmit();
    }
  };

  const handleAction = (action, msg) => {
    setActiveMenuId(null);
    if (action === 'reply') {
      setEditingMessage(null);
      setReplyingTo(msg);
    } 
    else if (action === 'edit') {
      setReplyingTo(null);
      setEditingMessage(msg);
      setInputText(msg.text || '');
    } 
    else if (action === 'copy') {
      navigator.clipboard.writeText(msg.text || '');
      showToast('Message copied!', 'success');
    } 
    else if (action === 'pin') {
      socket.emit('pin_message', { messageId: msg.id, pinned: !msg.pinned });
    } 
    else if (action === 'delete_everyone') {
      socket.emit('delete_message', { messageId: msg.id, senderId: user.id });
    } 
    else if (action === 'delete_me') {
      const newDeleted = [...deletedForMeIds, msg.id];
      setDeletedForMeIds(newDeleted);
      localStorage.setItem('cc_deleted_for_me', JSON.stringify(newDeleted));
    }
  };

  const handleEmojiReactToggle = (msgId, emoji, hasReacted) => {
    if (!connected || !socket) return;
    socket.emit(SOCKET_EVENTS.MESSAGE_REACT, {
      messageId: msgId,
      emoji,
      username: user.username,
      action: hasReacted ? 'remove' : 'add'
    });
  };

  const renderMessageTicks = (msg) => {
    if (msg.senderId !== user.id) return null;
    if (msg.status === 'seen') return <span className="ticks-seen" style={{ marginLeft: '4px', fontSize: '11px' }}>✓✓</span>;
    if (msg.status === 'delivered') return <span className="ticks-delivered" style={{ marginLeft: '4px', fontSize: '11px' }}>✓✓</span>;
    return <span className="ticks-sent" style={{ marginLeft: '4px', fontSize: '11px' }}>✓</span>;
  };

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div style={{ display: 'flex', height: '100%', position: 'relative' }}>
      
      {/* A. Core Chat Area Workspace Panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', minWidth: 0 }}>
        
        {/* Chat Area Header Banner */}
        <div style={{
          padding: '12px 24px',
          borderBottom: '1px solid var(--border-glass)',
          backgroundColor: 'var(--bg-panel)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
            {isMobile && (
              <button onClick={() => setActiveChat(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', display: 'flex' }}>
                <ArrowLeft size={20} />
              </button>
            )}

            {/* Profile Avatar */}
            <div 
              onClick={() => activeChat.type === 'direct' && onInspectUser(activeChat.id)}
              style={{ cursor: activeChat.type === 'direct' ? 'pointer' : 'default', position: 'relative' }}
            >
              <div className={`initials-avatar ${getAvatarBgClass(activeChat.name)}`} style={{ width: '40px', height: '40px', fontSize: '15px' }}>
                {activeChat.type === 'group' ? '#' : getInitials(activeChat.name)}
              </div>
              <span className={`ping-pulse ping-${latencyQuality}`} style={{ position: 'absolute', top: '-2px', right: '-2px', border: '2px solid var(--bg-panel)' }} />
            </div>

            <div style={{ minWidth: 0 }}>
              <h3 
                onClick={() => activeChat.type === 'direct' && onInspectUser(activeChat.id)}
                style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', cursor: activeChat.type === 'direct' ? 'pointer' : 'default', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
              >
                {activeChat.name}
              </h3>
              {typingUsers.length > 0 ? (
                <span style={{ fontSize: '11px', color: 'var(--primary)', fontStyle: 'italic', fontWeight: 600 }}>
                  {typingUsers.join(', ')} typing...
                </span>
              ) : (
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  {activeChat.type === 'group' 
                    ? rooms.find(r => r.id === activeChat.id)?.description || 'Group chat'
                    : 'direct messaging'}
                </span>
              )}
            </div>
          </div>

          {/* Header Controls (Video / Audio Calling, Links drawer) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {/* 1. Video Call button (Direct Chats Only) */}
            {activeChat.type === 'direct' && (
              <button
                onClick={() => onStartCall(activeChat.id, true)}
                disabled={!connected}
                data-tooltip="Initiate Video Call"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '8px', borderRadius: '6px' }}
              >
                <Video size={18} />
              </button>
            )}

            {/* 2. Audio Call button (Direct Chats Only) */}
            {activeChat.type === 'direct' && (
              <button
                onClick={() => onStartCall(activeChat.id, false)}
                disabled={!connected}
                data-tooltip="Initiate Audio Call"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '8px', borderRadius: '6px' }}
              >
                <Phone size={18} />
              </button>
            )}

            {/* 3. Shared links panel toggle */}
            <button
              onClick={() => setShowLinksDrawer(!showLinksDrawer)}
              data-tooltip="Shared Links"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: showLinksDrawer ? 'var(--primary)' : 'var(--text-secondary)', padding: '8px', borderRadius: '6px' }}
            >
              <ExternalLink size={18} />
            </button>

            {/* 4. Search message box toggle */}
            <button
              onClick={() => { setSearchOpen(!searchOpen); if (searchOpen) setSearchQuery(''); }}
              data-tooltip="Search Message Text (Alt + S)"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: searchOpen ? 'var(--primary)' : 'var(--text-secondary)', padding: '8px', borderRadius: '6px' }}
            >
              <Search size={18} />
            </button>
          </div>
        </div>

        {/* Slide-out Search subheader */}
        {searchOpen && (
          <div style={{ padding: '8px 24px', borderBottom: '1px solid var(--border-glass)', backgroundColor: 'var(--bg-app)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Search size={14} style={{ color: 'var(--text-secondary)' }} />
            <input
              id="message-search-input"
              type="text"
              placeholder="Type query to filter logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ flex: 1, border: 'none', background: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: '13px' }}
              autoFocus
            />
            <button onClick={() => { setSearchQuery(''); setSearchOpen(false); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <X size={16} />
            </button>
          </div>
        )}

        {/* Pinned Messages list banner */}
        {pinnedMessages.length > 0 && (
          <div style={{ padding: '8px 24px', backgroundColor: 'var(--primary-light)', borderBottom: '1px solid var(--border-glass)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', color: 'var(--primary)', fontWeight: 500, flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
              <Pin size={12} fill="var(--primary)" />
              <span 
                onClick={() => handleJumpToMessage(pinnedMessages[pinnedMessages.length - 1].id)}
                style={{ cursor: 'pointer', textDecoration: 'underline', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
              >
                Pinned: "{pinnedMessages[pinnedMessages.length - 1].text || 'Media File'}"
              </span>
            </div>
            <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.8 }}>
              Total {pinnedMessages.length} Pinned
            </span>
          </div>
        )}

        {/* Screenshot Disclaimer */}
        <div style={{ backgroundColor: 'var(--bg-panel)', borderBottom: '1px solid var(--border-glass)', padding: '6px 20px', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text-secondary)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Info size={12} style={{ color: 'var(--accent)' }} />
            <span>Screenshots cannot be fully detected on web browsers.</span>
          </div>
          <button
            onClick={handleReportScreenshotClick}
            style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '4px', padding: '2px 8px', fontSize: '10px', fontWeight: 700, cursor: 'pointer' }}
          >
            [Demo] Report Screenshot
          </button>
        </div>

        {/* Message logs view grid */}
        <div 
          ref={scrollContainerRef}
          onScroll={handleScroll}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px 24px',
            backgroundImage: theme === 'dark' 
              ? 'radial-gradient(var(--border-glass) 1px, transparent 0)' 
              : 'radial-gradient(rgba(0, 0, 0, 0.04) 1px, transparent 0)',
            backgroundSize: '24px 24px'
          }}
        >
          {visibleMessages.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '13px' }}>
              {searchQuery ? 'No search results found.' : 'No messages yet. Send a wave! 👋'}
            </div>
          ) : (
            visibleMessages.map((msg, index, arr) => {
              const isSelf = msg.senderId === user.id;
              
              const prevMsg = index > 0 ? arr[index - 1] : null;
              const showDateHeader = !prevMsg || 
                new Date(prevMsg.timestamp).toDateString() !== new Date(msg.timestamp).toDateString();

              const msgSender = onlineUsers.find(u => u.id === msg.senderId);
              const senderName = msgSender ? msgSender.username : (msg.senderId === 'ai' ? 'CyberAI' : 'User');

              const parentMsg = msg.replyToId ? messages.find(m => m.id === msg.replyToId) : null;
              const isStarred = starredMessageIds.includes(msg.id);

              if (msg.isSystem) {
                return (
                  <div key={msg.id} style={{ display: 'flex', flexDirection: 'column' }}>
                    {showDateHeader && (
                      <div style={{ display: 'flex', justifyContent: 'center', margin: '20px 0 10px 0' }}>
                        <span style={{ fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '8px', backgroundColor: 'var(--msg-system)', color: 'var(--msg-system-text)', boxShadow: 'var(--shadow-sm)' }}>
                          {formatDateLabel(msg.timestamp)}
                        </span>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'center', margin: '6px 0' }}>
                      <span style={{ backgroundColor: 'var(--msg-system)', color: 'var(--msg-system-text)', fontSize: '11px', padding: '4px 12px', borderRadius: '8px', boxShadow: 'var(--shadow-sm)' }}>
                        {msg.text}
                      </span>
                    </div>
                  </div>
                );
              }

              return (
                <div key={msg.id} id={`msg-node-${msg.id}`} style={{ display: 'flex', flexDirection: 'column' }}>
                  {showDateHeader && (
                    <div style={{ display: 'flex', justifyContent: 'center', margin: '20px 0 10px 0' }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '8px', backgroundColor: 'var(--msg-system)', color: 'var(--msg-system-text)', boxShadow: 'var(--shadow-sm)' }}>
                        {formatDateLabel(msg.timestamp)}
                      </span>
                    </div>
                  )}

                  <div style={{
                    display: 'flex',
                    justifyContent: isSelf ? 'flex-end' : 'flex-start',
                    marginBottom: '8px',
                    position: 'relative'
                  }}>
                    
                    {!isSelf && activeChat.type === 'group' && (
                      <div onClick={() => onInspectUser(msg.senderId)} style={{ marginRight: '8px', marginTop: '4px', cursor: 'pointer' }}>
                        <div className={`initials-avatar ${getAvatarBgClass(senderName)}`} style={{ width: '28px', height: '28px', fontSize: '11px' }}>
                          {getInitials(senderName)}
                        </div>
                      </div>
                    )}

                    {/* Reaction Toolbar Trigger Wrapper */}
                    <div 
                      style={{
                        position: 'relative',
                        maxWidth: '72%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isSelf ? 'flex-end' : 'flex-start'
                      }}
                      onMouseEnter={() => !msg.deleted && setActiveMenuId(msg.id)}
                      onMouseLeave={() => setActiveMenuId(null)}
                    >
                      {/* Emoji reaction toolbar on hover */}
                      {activeMenuId === msg.id && (
                        <div style={{
                          position: 'absolute',
                          top: '-26px',
                          right: isSelf ? '0' : 'auto',
                          left: isSelf ? 'auto' : '0',
                          display: 'flex',
                          gap: '4px',
                          backgroundColor: 'var(--bg-panel)',
                          border: '1px solid var(--border-glass)',
                          borderRadius: '12px',
                          padding: '2px 6px',
                          boxShadow: 'var(--shadow-md)',
                          zIndex: 40
                        }}>
                          {['👍', '❤️', '😂', '😮', '😢', '🙏'].map(emoji => {
                            const usersList = msg.reactions?.[emoji] || [];
                            const hasReacted = usersList.includes(user.username);
                            return (
                              <button
                                key={emoji}
                                onClick={() => handleEmojiReactToggle(msg.id, emoji, hasReacted)}
                                style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '14px', padding: '2px' }}
                              >
                                {emoji}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Bubble */}
                      <div 
                        className="glass-card"
                        style={{
                          padding: '10px 14px',
                          borderRadius: isSelf 
                            ? '16px 4px 16px 16px' 
                            : '4px 16px 16px 16px',
                          backgroundColor: isSelf 
                            ? 'var(--msg-sent)' 
                            : (msg.senderId === 'ai' ? 'var(--primary-light)' : 'var(--msg-received)'),
                          color: isSelf ? 'var(--msg-sent-text)' : 'var(--msg-received-text)',
                          position: 'relative',
                          border: msg.senderId === 'ai' ? '1px solid var(--primary)' : '1px solid var(--border-glass)'
                        }}
                      >
                        {msg.pinned && (
                          <span style={{ position: 'absolute', top: '-6px', right: isSelf ? 'auto' : '-6px', left: isSelf ? '-6px' : 'auto', background: 'var(--primary)', color: '#fff', borderRadius: '50%', width: '16px', height: '16px', display: 'flex', alignItems: 'center', justify: 'center' }}>
                            <Pin size={9} fill="#fff" />
                          </span>
                        )}

                        {isStarred && (
                          <Star size={12} fill="#ffd700" stroke="#ffaa00" style={{ position: 'absolute', top: '6px', right: '6px' }} />
                        )}

                        {!isSelf && activeChat.type === 'group' && (
                          <span 
                            onClick={() => onInspectUser(msg.senderId)}
                            style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: msg.senderId === 'ai' ? 'var(--accent)' : 'var(--primary)', marginBottom: '4px', cursor: 'pointer' }}
                          >
                            {senderName}
                          </span>
                        )}

                        {/* Reply Preview */}
                        {parentMsg && (
                          <div style={{
                            backgroundColor: isSelf ? 'rgba(0,0,0,0.05)' : 'var(--bg-app)',
                            borderLeft: '3px solid var(--primary)',
                            padding: '6px 10px',
                            borderRadius: '4px',
                            marginBottom: '6px',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }} onClick={() => handleJumpToMessage(parentMsg.id)}>
                            <span style={{ fontWeight: 700, display: 'block', color: 'var(--primary)' }}>
                              {parentMsg.senderId === user.id ? 'You' : (onlineUsers.find(u => u.id === parentMsg.senderId)?.username || 'User')}
                            </span>
                            <span style={{ color: 'var(--text-secondary)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {parentMsg.deleted ? 'This message was deleted' : (parentMsg.text || '📁 Media attachment')}
                            </span>
                          </div>
                        )}

                        {/* Media sharing block (Images, audio voice record, download links) */}
                        {msg.mediaUrl && (
                          <div style={{ marginBottom: '6px', borderRadius: '8px', overflow: 'hidden' }}>
                            {msg.mediaType === 'image' && (
                              <a href={getMediaSrc(msg.mediaUrl)} target="_blank" rel="noreferrer">
                                <img src={getMediaSrc(msg.mediaUrl)} alt="Shared Image" style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'cover', display: 'block', borderRadius: '4px' }} />
                              </a>
                            )}
                            
                            {/* Voice playback waveform chimes */}
                            {msg.mediaType === 'audio' && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <audio src={getMediaSrc(msg.mediaUrl)} controls style={{ maxHeight: '40px', outline: 'none' }} />
                              </div>
                            )}

                            {msg.mediaType !== 'image' && msg.mediaType !== 'audio' && (
                              <a 
                                href={getMediaSrc(msg.mediaUrl)} 
                                target="_blank" 
                                rel="noreferrer"
                                download
                                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: '6px', textDecoration: 'none', color: 'inherit', fontSize: '13px' }}
                              >
                                <FileText size={24} style={{ color: 'var(--primary)' }} />
                                <div style={{ minWidth: 0 }}>
                                  <span style={{ fontWeight: 600, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{msg.mediaName}</span>
                                  <span style={{ fontSize: '10px', opacity: 0.7 }}>Attachment File</span>
                                </div>
                              </a>
                            )}
                          </div>
                        )}

                        {/* Interactive Poll Cards Rendering */}
                        {msg.isPoll && msg.pollData && (
                          <div style={{
                            backgroundColor: 'rgba(0,0,0,0.03)',
                            padding: '12px',
                            borderRadius: '8px',
                            border: '1px solid var(--border-glass)',
                            marginBottom: '6px',
                            minWidth: '240px'
                          }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                              <BarChart2 size={12} /> Interactive Poll
                            </span>
                            <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>
                              {msg.pollData.question}
                            </h4>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              {msg.pollData.options.map((opt, idx) => {
                                const totalVotes = msg.pollData.options.reduce((sum, o) => sum + (o.votes?.length || 0), 0);
                                const count = opt.votes?.length || 0;
                                const percent = totalVotes > 0 ? (count / totalVotes) * 100 : 0;
                                const hasVoted = opt.votes?.includes(user.id);

                                return (
                                  <div
                                    key={idx}
                                    onClick={() => socket.emit('vote_poll', { messageId: msg.id, optionIndex: idx, userId: user.id })}
                                    style={{
                                      position: 'relative',
                                      padding: '8px 12px',
                                      borderRadius: '6px',
                                      border: hasVoted ? '1px solid var(--primary)' : '1px solid var(--border-glass)',
                                      cursor: 'pointer',
                                      backgroundColor: 'var(--bg-panel)',
                                      overflow: 'hidden',
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                      zIndex: 1
                                    }}
                                  >
                                    {/* Percentage fill bar background */}
                                    <div style={{
                                      position: 'absolute',
                                      top: 0, left: 0, bottom: 0,
                                      width: `${percent}%`,
                                      backgroundColor: hasVoted ? 'var(--primary-light)' : 'var(--bg-app)',
                                      zIndex: -1,
                                      transition: 'width 0.4s ease'
                                    }} />

                                    <span style={{ fontSize: '13px', fontWeight: hasVoted ? 700 : 500, color: 'var(--text-primary)' }}>{opt.option}</span>
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>{count} ({Math.round(percent)}%)</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Custom Sticker display card */}
                        {msg.mediaType === 'sticker' && (
                          <div style={{
                            padding: '12px 18px',
                            background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                            color: '#fff',
                            borderRadius: '12px',
                            fontWeight: 700,
                            fontSize: '15px',
                            textAlign: 'center',
                            boxShadow: 'var(--shadow-sm)',
                            border: '2px solid rgba(255,255,255,0.2)',
                            margin: '4px 0'
                          }}>
                            {msg.mediaName}
                          </div>
                        )}

                        {/* Standard text body message */}
                        {msg.mediaType !== 'sticker' && (
                          <p style={{
                            fontSize: '14px',
                            lineHeight: '1.4',
                            wordBreak: 'break-word',
                            fontStyle: msg.deleted ? 'italic' : 'normal',
                            opacity: msg.deleted ? 0.6 : 1,
                            paddingRight: '32px',
                            whiteSpace: 'pre-wrap'
                          }}>
                            {msg.text}
                          </p>
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', justify: 'flex-end', gap: '2px', fontSize: '10px', opacity: 0.6, marginTop: '4px' }}>
                          {msg.edited && !msg.deleted && <span>(edited)</span>}
                          <span>{formatTime(msg.timestamp)}</span>
                          {renderMessageTicks(msg)}
                        </div>

                        {/* Option actions menu */}
                        {activeMenuId === msg.id && (
                          <div style={{ position: 'absolute', bottom: '4px', right: '4px', zIndex: 20 }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const panel = document.getElementById(`actions-${msg.id}`);
                                if (panel) panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
                              }}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex' }}
                            >
                              <ChevronDown size={14} />
                            </button>

                            <div 
                              id={`actions-${msg.id}`}
                              className="glass-panel"
                              style={{
                                display: 'none',
                                position: 'absolute',
                                bottom: '20px',
                                right: 0,
                                borderRadius: '8px',
                                boxShadow: 'var(--shadow-md)',
                                backgroundColor: 'var(--bg-panel)',
                                border: '1px solid var(--border-glass)',
                                width: '150px',
                                overflow: 'hidden'
                              }}
                            >
                              <button onClick={() => handleAction('reply', msg)} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-primary)', fontSize: '12px' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--border-glass)'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}><CornerUpLeft size={12} /> Reply</button>
                              <button onClick={() => setForwardingMessage(msg)} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-primary)', fontSize: '12px' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--border-glass)'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}><Forward size={12} /> Forward</button>
                              {msg.text && msg.mediaType !== 'sticker' && (
                                <button onClick={() => handleAction('copy', msg)} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-primary)', fontSize: '12px' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--border-glass)'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}><Copy size={12} /> Copy</button>
                              )}
                              <button onClick={() => handleStarToggle(msg.id)} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-primary)', fontSize: '12px' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--border-glass)'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}><Star size={12} /> {isStarred ? 'Unstar' : 'Star'}</button>
                              <button onClick={() => handleAction('pin', msg)} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-primary)', fontSize: '12px' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--border-glass)'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}><Pin size={12} /> {msg.pinned ? 'Unpin' : 'Pin'}</button>
                              {isSelf && msg.mediaType !== 'sticker' && (
                                <button onClick={() => handleAction('edit', msg)} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-primary)', fontSize: '12px' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--border-glass)'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}><Edit2 size={12} /> Edit</button>
                              )}
                              {isSelf && (
                                <button onClick={() => handleAction('delete_everyone', msg)} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: '12px' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--border-glass)'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}><Trash2 size={12} /> Delete All</button>
                              )}
                              <button onClick={() => handleAction('delete_me', msg)} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: '12px' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--border-glass)'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}><Trash2 size={12} /> Delete Me</button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Emoji reaction counts badges */}
                      {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                        <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                          {Object.entries(msg.reactions).map(([emoji, usersList]) => {
                            const hasReacted = usersList.includes(user.username);
                            return (
                              <span
                                key={emoji}
                                className={`reaction-badge ${hasReacted ? 'active' : ''}`}
                                onClick={() => handleEmojiReactToggle(msg.id, emoji, hasReacted)}
                                data-tooltip={`Reacted by: ${usersList.join(', ')}`}
                              >
                                {emoji} {usersList.length}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Message Compose Panel */}
        <div style={{
          padding: '12px 24px',
          borderTop: '1px solid var(--border-glass)',
          backgroundColor: 'var(--bg-panel)',
          position: 'relative',
          flexShrink: 0
        }}>
          
          {/* Reply Preview */}
          {replyingTo && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: 'var(--bg-app)', borderLeft: '4px solid var(--primary)', borderRadius: '6px', marginBottom: '10px' }}>
              <div style={{ fontSize: '12px', minWidth: 0 }}>
                <span style={{ fontWeight: 700, display: 'block', color: 'var(--primary)' }}>
                  Replying to {replyingTo.senderId === user.id ? 'yourself' : (onlineUsers.find(u => u.id === replyingTo.senderId)?.username || 'User')}
                </span>
                <span style={{ color: 'var(--text-secondary)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {replyingTo.text || '📁 Media attachment'}
                </span>
              </div>
              <button onClick={() => setReplyingTo(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={16} />
              </button>
            </div>
          )}

          {/* Editing Preview */}
          {editingMessage && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: 'var(--primary-light)', borderLeft: '4px solid var(--primary)', borderRadius: '6px', marginBottom: '10px' }}>
              <div style={{ fontSize: '12px', minWidth: 0 }}>
                <span style={{ fontWeight: 700, display: 'block', color: 'var(--primary)' }}>Editing Message</span>
                <span style={{ color: 'var(--text-secondary)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  Original: "{editingMessage.text}"
                </span>
              </div>
              <button onClick={() => { setEditingMessage(null); setInputText(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={16} />
              </button>
            </div>
          )}

          {/* Upload File Preview */}
          {filePreview && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', padding: '8px 12px', backgroundColor: 'var(--bg-app)', borderRadius: '8px', border: '1px solid var(--border-glass)', marginBottom: '10px', position: 'relative' }}>
              {selectedFile?.type?.startsWith('image/') ? (
                <img src={filePreview} alt="Preview" style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '4px' }} />
              ) : (
                <FileText size={32} style={{ color: 'var(--primary)' }} />
              )}
              <div style={{ maxWidth: '180px' }}>
                <span style={{ display: 'block', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{selectedFile?.name}</span>
                <span style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)' }}>{selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB` : ''}</span>
              </div>
              <button onClick={() => { setSelectedFile(null); setFilePreview(null); }} style={{ background: 'var(--bg-panel)', border: '1px solid var(--border-glass)', borderRadius: '50%', padding: '2px', cursor: 'pointer', color: 'var(--text-secondary)', position: 'absolute', top: '-8px', right: '-8px' }}>
                <X size={12} />
              </button>
            </div>
          )}

          {/* Custom Emojis Picker Popover Drawer */}
          {emojiPickerOpen && (
            <div style={{ position: 'absolute', bottom: '70px', left: '20px', zIndex: 100 }}>
              <EmojiPicker onEmojiSelect={(emoji) => { setInputText(prev => prev + emoji); setEmojiPickerOpen(false); }} />
            </div>
          )}

          {/* Stickers Selection Drawer panel */}
          {stickerPickerOpen && (
            <div 
              className="glass-panel animate-scale"
              style={{
                position: 'absolute',
                bottom: '70px',
                left: '20px',
                zIndex: 100,
                width: '320px',
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--bg-panel)',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px'
              }}
            >
              <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '4px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)' }}>Developer Sticker Pack</span>
                <button onClick={() => setStickerPickerOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={14} /></button>
              </div>
              {DEVELOPER_STICKERS.map((stk, i) => (
                <button
                  key={i}
                  onClick={() => handleSendSticker(stk.text)}
                  style={{
                    padding: '8px',
                    border: '1px solid var(--border-glass)',
                    borderRadius: '6px',
                    backgroundColor: 'var(--bg-app)',
                    color: 'var(--text-primary)',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    overflow: 'hidden',
                    transition: 'background-color var(--transition-fast)'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--border-glass)'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-app)'}
                >
                  {stk.display}
                </button>
              ))}
            </div>
          )}

          {/* Composer Form Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            
            {/* Attachment picker */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isRecording}
              data-tooltip="Attach File"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '8px', borderRadius: '50%', backgroundColor: 'var(--bg-app)' }}
            >
              <Paperclip size={18} />
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileSelect} style={{ display: 'none' }} />

            {/* Emoji popover */}
            <button
              type="button"
              onClick={() => setEmojiPickerOpen(!emojiPickerOpen)}
              disabled={isRecording}
              data-tooltip="Emojis"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '8px', borderRadius: '50%', backgroundColor: 'var(--bg-app)' }}
            >
              <Smile size={18} />
            </button>

            {/* Sticker popover */}
            <button
              type="button"
              onClick={() => setStickerPickerOpen(!stickerPickerOpen)}
              disabled={isRecording}
              data-tooltip="Stickers Pack"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '8px', borderRadius: '50%', backgroundColor: 'var(--bg-app)' }}
            >
              <Sticker size={18} />
            </button>

            {/* Poll creator (only in group rooms) */}
            {activeChat.type === 'group' && (
              <button
                type="button"
                onClick={() => setPollCreatorOpen(true)}
                disabled={isRecording}
                data-tooltip="Create Poll"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '8px', borderRadius: '50%', backgroundColor: 'var(--bg-app)' }}
              >
                <BarChart2 size={18} />
              </button>
            )}

            {/* HTML5 Voice Messages Recorder Toggle Mic */}
            {isRecording ? (
              <div 
                className="glass-panel"
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 18px',
                  borderRadius: 'var(--radius-lg)',
                  backgroundColor: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.3)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--danger)' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--danger)', display: 'inline-block', animation: 'pulseBorder 1s infinite' }} />
                  <span>Recording Voice Note: {formatTimer(recordingDuration)}</span>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {/* Cancel */}
                  <button type="button" onClick={() => stopRecording(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex' }}><X size={16} /></button>
                  {/* Send */}
                  <button type="button" onClick={() => stopRecording(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--success)', display: 'flex' }}><Send size={16} /></button>
                </div>
              </div>
            ) : (
              // Standard composer text input
              <input
                type="text"
                placeholder={
                  editingMessage 
                    ? 'Save edits...' 
                    : selectedFile 
                      ? 'Add caption...' 
                      : 'Type message here (Press Enter)...'
                }
                value={inputText}
                onChange={handleInputChange}
                onKeyDown={handleInputKeyDown}
                disabled={!connected || uploading}
                style={{
                  flex: 1,
                  padding: '12px 18px',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-glass)',
                  backgroundColor: 'var(--bg-app)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  fontSize: '14px'
                }}
              />
            )}

            {/* Mic trigger or send action */}
            {!isRecording && (
              inputText.trim() || selectedFile ? (
                <button
                  onClick={handleSendTextSubmit}
                  disabled={!connected || uploading}
                  style={{
                    backgroundColor: 'var(--primary)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '50%',
                    width: '42px',
                    height: '42px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <Send size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startRecording}
                  disabled={!connected}
                  data-tooltip="Record Voice message"
                  style={{
                    backgroundColor: 'var(--bg-app)',
                    color: 'var(--text-secondary)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '42px',
                    height: '42px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <Mic size={18} />
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* B. Productivity Shared Links sidebar panel (Extracts url cards) */}
      {showLinksDrawer && (
        <div 
          className="glass-panel animate-slide"
          style={{
            width: '280px',
            backgroundColor: 'var(--bg-panel)',
            borderLeft: '1px solid var(--border-glass)',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            flexShrink: 0
          }}
        >
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>Shared Hyperlinks</h4>
            <button onClick={() => setShowLinksDrawer(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={16} /></button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {sharedLinksList.length === 0 ? (
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '20px' }}>No hyperlinks shared in logs.</span>
            ) : (
              sharedLinksList.map(lnk => (
                <a 
                  key={lnk.id}
                  href={lnk.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    padding: '10px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--bg-app)',
                    border: '1px solid var(--border-glass)',
                    textDecoration: 'none',
                    color: 'var(--primary)',
                    fontSize: '12px',
                    wordBreak: 'break-all',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <ExternalLink size={12} />
                  <span>{lnk.url}</span>
                </a>
              ))
            )}
          </div>
        </div>
      )}

      {/* Floating Forward overlay */}
      {forwardingMessage && (
        <ForwardModal
          message={forwardingMessage}
          rooms={rooms}
          onlineUsers={onlineUsers}
          user={user}
          onClose={() => setForwardingMessage(null)}
          socket={socket}
          showToast={showToast}
        />
      )}

      {/* Interactive Poll Builder form */}
      {pollCreatorOpen && (
        <PollCreator
          onClose={() => setPollCreatorOpen(false)}
          onSubmit={handleLaunchPoll}
        />
      )}
    </div>
  );
}

export default ChatArea;
