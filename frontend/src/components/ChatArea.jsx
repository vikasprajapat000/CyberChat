// frontend/src/components/ChatArea.jsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  Paperclip, Smile, Send, Search, Pin, CornerUpLeft, Edit2, Trash2, 
  Copy, X, Image as ImageIcon, FileText, ArrowLeft, Star, Forward,
  ChevronDown, AlertTriangle, Info, Eye, ShieldAlert, Phone, Video,
  Mic, MicOff, BarChart2, CheckSquare, ExternalLink, HelpCircle, Sticker,
  Lock, Clock, MapPin, Languages, ClipboardList, Camera, MessageSquare, Sparkles
} from 'lucide-react';
import EmojiPicker from './EmojiPicker';
import ForwardModal from './ForwardModal';
import PollCreator from './PollCreator';
import confetti from 'canvas-confetti';
import { SOCKET_EVENTS } from '../../../shared/constants.json';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:5000' : 'https://cyberchat-4hvt.onrender.com');

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
  setMessages,
  typingUsers,
  onlineUsers,
  onInspectUser,
  isMobile,
  theme,
  showToast,
  rooms,
  onStartCall,
  isSelectionMode,
  setIsSelectionMode,
  selectedMessageIds,
  setSelectedMessageIds
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
  const [showGroupDrawer, setShowGroupDrawer] = useState(false);
  const [taskNameInput, setTaskNameInput] = useState('');
  const [taskAssigneeId, setTaskAssigneeId] = useState('');
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

  // Disappearing & View Once states
  const [disappearingTimer, setDisappearingTimer] = useState(0);
  const [viewOnceEnabled, setViewOnceEnabled] = useState(false);
  const [activeViewOnceMsg, setActiveViewOnceMsg] = useState(null);

  const [vanishModeEnabled, setVanishModeEnabled] = useState(false);
  const [scheduledDelay, setScheduledDelay] = useState(null); // delay in milliseconds
  const [showScheduleDropdown, setShowScheduleDropdown] = useState(false);
  const [translatedMessages, setTranslatedMessages] = useState({});
  const [inputFocused, setInputFocused] = useState(false);
  const [showAttachmentPopover, setShowAttachmentPopover] = useState(false);
  const [openActionsId, setOpenActionsId] = useState(null);

  const chatEndRef = useRef(null);
  const touchTimerRef = useRef(null);
  const touchStartPosRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const recordingTimerRef = useRef(null);
  const isTypingRef = useRef(false);
  const offlineQueueRef = useRef([]);
  const mediaRecorderRef = useRef(null);

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

  // Flush offline queue on reconnection
  useEffect(() => {
    if (connected && offlineQueueRef.current && offlineQueueRef.current.length > 0 && socket) {
      showToast('Reconnected: Syncing offline messages...', 'success');
      const queue = [...offlineQueueRef.current];
      offlineQueueRef.current = [];

      queue.forEach(({ payload, tempId }) => {
        socket.emit('send_message', payload);
        if (setMessages) {
          setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'sending' } : m));
        }
      });
    }
  }, [connected, socket]);

  // Clean up on conversation targets swap or component unmount
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
    setShowGroupDrawer(false);
    setTaskNameInput('');
    setTaskAssigneeId('');
    setVisibleLimit(50);
    setIsScrolledToBottom(true);
    stopRecording(false); // Abort any active recording on chat target swap
    
    const oldActiveChat = activeChat;

    return () => {
      // Abort active recording on unmount or swap
      stopRecording(false);

      if (socket && isTypingRef.current && oldActiveChat) {
        isTypingRef.current = false;
        socket.emit('typing', {
          roomId: oldActiveChat.type === 'group' ? oldActiveChat.id : null,
          recipientId: oldActiveChat.type === 'direct' ? oldActiveChat.id : null,
          isTyping: false,
          userId: user.id
        });
      }

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      if (touchTimerRef.current) {
        clearTimeout(touchTimerRef.current);
        touchTimerRef.current = null;
      }
    };
  }, [activeChat, socket, user.id]);

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
        padding: '24px',
        userSelect: 'none'
      }}>
        <div 
          className="glass-panel animate-scale"
          style={{
            padding: '40px 32px',
            borderRadius: '24px',
            textAlign: 'center',
            maxWidth: '400px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            boxShadow: 'var(--shadow-lg)'
          }}
        >
          <div style={{
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)',
            color: '#fff',
            padding: '24px',
            borderRadius: '20px',
            marginBottom: '24px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(0, 168, 132, 0.25)'
          }}>
            <MessageSquare size={48} />
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '12px', fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.02em' }}>
            CyberChat Premium
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '24px' }}>
            Select a channel or direct chat to start messaging in real-time on our secure, lightning-fast communications network.
          </p>
          <div style={{ display: 'flex', gap: '16px', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
            <span>🔒 End-to-End Encryption</span>
            <span>•</span>
            <span>⚡ Real-time Sync</span>
          </div>
        </div>
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
      mediaRecorderRef.current = recorder; // Sync to ref for cleanup closure safety
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
      recordingTimerRef.current = null;
    }
    
    const rec = mediaRecorder || mediaRecorderRef.current;
    
    if (rec && rec.state !== 'inactive') {
      if (!shouldSend) {
        // Abort recording cleanly
        rec.onstop = null;
      }
      try {
        rec.stop();
      } catch (e) {
        console.error("Error stopping recorder:", e);
      }
      if (rec.stream) {
        rec.stream.getTracks().forEach(track => track.stop()); // release stream
      }
    }

    setIsRecording(false);
    setRecordingDuration(0);
    setMediaRecorder(null);
    mediaRecorderRef.current = null;
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

  // Productivity note & task handlers
  const activeRoomObj = activeChat && activeChat.type === 'group' ? rooms.find(r => r.id === activeChat.id) : null;
  const activeRoomNotes = activeRoomObj?.notes || '';
  const activeRoomTasks = activeRoomObj?.tasks || [];
  const activeRoomMembers = activeRoomObj?.members || [];

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

  const handleTouchStart = (e, msg) => {
    if (isSelectionMode || msg.deleted) return;
    const touch = e.touches[0];
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };

    if (touchTimerRef.current) clearTimeout(touchTimerRef.current);

    touchTimerRef.current = setTimeout(() => {
      setActiveMenuId(msg.id);
      setOpenActionsId(msg.id);
      showToast('Message actions menu opened', 'info');
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 700);
  };

  const handleTouchMove = (e) => {
    if (!touchStartPosRef.current) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
    const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);

    if (dx > 10 || dy > 10) {
      if (touchTimerRef.current) {
        clearTimeout(touchTimerRef.current);
        touchTimerRef.current = null;
      }
    }
  };

  const handleTouchEnd = () => {
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
      touchTimerRef.current = null;
    }
    touchStartPosRef.current = null;
  };

  // Star message triggers
  const handleStarToggle = (msgId) => {
    setActiveMenuId(null);
    setOpenActionsId(null);
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
    if (!socket) return;

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

    // Vanish Mode (Secret Chat) intercept
    if (vanishModeEnabled && activeChat.type === 'direct') {
      socket.emit('secret_message', {
        recipientId: activeChat.id,
        text: inputText.trim(),
        mediaUrl: fileUrl,
        mediaType: fileType
      });

      setInputText('');
      setReplyingTo(null);
      setSelectedFile(null);
      setFilePreview(null);
      setViewOnceEnabled(false);
      return;
    }

    // Scheduled Message intercept
    if (scheduledDelay !== null) {
      socket.emit('schedule_message', {
        delayMs: scheduledDelay,
        messageData: {
          senderId: user.id,
          recipientId: activeChat.type === 'direct' ? activeChat.id : null,
          roomId: activeChat.type === 'group' ? activeChat.id : null,
          text: inputText.trim(),
          mediaUrl: fileUrl,
          mediaType: fileType,
          mediaName: fileName,
          replyToId: replyingTo ? replyingTo.id : null
        }
      });

      setInputText('');
      setReplyingTo(null);
      setSelectedFile(null);
      setFilePreview(null);
      setViewOnceEnabled(false);
      setScheduledDelay(null);
      showToast('Scheduled message queued successfully!', 'success');
      return;
    }

    const payload = {
      senderId: user.id,
      recipientId: activeChat.type === 'direct' ? activeChat.id : null,
      roomId: activeChat.type === 'group' ? activeChat.id : null,
      text: inputText.trim(),
      replyToId: replyingTo ? replyingTo.id : null,
      viewOnce: viewOnceEnabled
    };

    if (disappearingTimer > 0) {
      payload.disappearsAt = new Date(Date.now() + disappearingTimer * 1000).toISOString();
    }

    if (fileUrl) {
      payload.mediaUrl = fileUrl;
      payload.mediaType = fileType;
      payload.mediaName = fileName;
      if (!payload.text) {
        payload.text = `📁 Shared a file: ${fileName}`;
      }
    }

    // Generate Client-Side unique ID for optimistic reconciliation
    const tempId = `opt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const optMsg = {
      id: tempId,
      senderId: user.id,
      recipientId: activeChat.type === 'direct' ? activeChat.id : null,
      roomId: activeChat.type === 'group' ? activeChat.id : null,
      text: payload.text,
      mediaUrl: fileUrl,
      mediaType: fileType,
      mediaName: fileName,
      replyToId: replyingTo ? replyingTo.id : null,
      timestamp: new Date().toISOString(),
      status: connected ? 'sending' : 'pending',
      viewOnce: viewOnceEnabled
    };

    // Insert optimistic message immediately in state
    if (setMessages) {
      setMessages(prev => [...prev, optMsg]);
    }

    if (!connected) {
      offlineQueueRef.current.push({ payload, tempId });
      showToast('Offline: Message queued to dispatch on reconnection.', 'warning');
    } else {
      socket.emit('send_message', payload);
    }

    setInputText('');
    setReplyingTo(null);
    setSelectedFile(null);
    setFilePreview(null);
    setViewOnceEnabled(false); // Reset view-once toggle after send
  };

  const handleCloseViewOnce = () => {
    if (!activeViewOnceMsg || !socket) return;
    socket.emit('view_once_message_seen', { messageId: activeViewOnceMsg.id });
    setActiveViewOnceMsg(null);
    showToast('Secure container self-destructed!', 'warning');
    confetti({ particleCount: 40, colors: ['#ff4444', '#ffaa00'] });
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

  const handleTranslateClick = (msg) => {
    if (!msg.text) return;
    const mockTranslations = [
      "Hola, ¿cómo estás? (Spanish 🇪🇸)",
      "Bonjour, comment ça va? (French 🇫🇷)",
      "こんにちは、元気ですか？ (Japanese 🇯🇵)",
      "नमस्ते, आप कैसे हैं? (Hindi 🇮🇳)"
    ];
    let hash = 0;
    for (let i = 0; i < msg.id.length; i++) hash += msg.id.charCodeAt(i);
    const translatedText = mockTranslations[hash % mockTranslations.length];
    
    setTranslatedMessages(prev => ({
      ...prev,
      [msg.id]: translatedText
    }));
    showToast('Message translated successfully!', 'success');
  };

  const handleAction = (action, msg) => {
    setActiveMenuId(null);
    setOpenActionsId(null);
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
    else if (action === 'translate') {
      handleTranslateClick(msg);
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
    if (msg.status === 'sending') return <Clock size={11} style={{ marginLeft: '4px', color: 'var(--text-muted)', animation: 'blink 1.5s infinite' }} />;
    if (msg.status === 'pending') return <Clock size={11} style={{ marginLeft: '4px', color: 'var(--text-muted)', opacity: 0.6 }} />;
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
          padding: isMobile ? '10px 16px' : '14px 24px',
          borderBottom: '1px solid var(--border-glass)',
          backgroundColor: 'var(--bg-glass)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          zIndex: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
            {isMobile && (
              <button 
                onClick={() => setActiveChat(null)} 
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  cursor: 'pointer', 
                  color: 'var(--text-primary)', 
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  transition: 'background-color var(--transition-fast)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-app)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <ArrowLeft size={20} />
              </button>
            )}

            {/* Profile Avatar */}
            <div 
              onClick={() => activeChat.type === 'direct' && onInspectUser(activeChat.id)}
              style={{ cursor: activeChat.type === 'direct' ? 'pointer' : 'default', position: 'relative' }}
            >
              {activeChat.type === 'direct' && onlineUsers.find(u => u.id === activeChat.id)?.profilePhoto ? (
                <div style={{ width: '42px', height: '42px', borderRadius: '50%', overflow: 'hidden', border: '1.5px solid var(--border-glass)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img 
                    src={`${BACKEND_URL}${onlineUsers.find(u => u.id === activeChat.id).profilePhoto}`} 
                    alt={activeChat.name} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                  />
                </div>
              ) : (
                <div className={`initials-avatar ${getAvatarBgClass(activeChat.name)}`} style={{ width: '42px', height: '42px', fontSize: '15px' }}>
                  {activeChat.type === 'group' ? '#' : getInitials(activeChat.name)}
                </div>
              )}
              <span className={`ping-pulse ping-${latencyQuality}`} style={{ position: 'absolute', top: '-2px', right: '-2px', border: '2px solid var(--bg-panel)' }} />
            </div>

            <div style={{ minWidth: 0 }}>
              <h3 
                onClick={() => activeChat.type === 'direct' && onInspectUser(activeChat.id)}
                style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', cursor: activeChat.type === 'direct' ? 'pointer' : 'default', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'Outfit, sans-serif', letterSpacing: '-0.01em', margin: 0 }}
              >
                {activeChat.name}
              </h3>
              {typingUsers.length > 0 ? (
                <span style={{ fontSize: '11px', color: 'var(--primary)', fontStyle: 'italic', fontWeight: 700 }}>
                  {typingUsers.join(', ')} typing...
                </span>
              ) : (
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  {activeChat.type === 'group' 
                    ? rooms.find(r => r.id === activeChat.id)?.description || 'Group chat'
                    : 'direct messaging'}
                </span>
              )}
            </div>
          </div>

          {/* Header Controls (Video / Audio Calling, Links drawer) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {/* 1. Video Call button (Direct Chats Only) */}
            {activeChat.type === 'direct' && (
              <button
                onClick={() => onStartCall(activeChat.id, true)}
                disabled={!connected}
                data-tooltip="Initiate Video Call"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  padding: '8px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '36px',
                  height: '36px',
                  transition: 'all var(--transition-fast)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-app)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
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
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  padding: '8px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '36px',
                  height: '36px',
                  transition: 'all var(--transition-fast)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-app)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <Phone size={18} />
              </button>
            )}

            {/* 3. Shared links panel toggle */}
            <button
              onClick={() => { setShowLinksDrawer(!showLinksDrawer); setShowGroupDrawer(false); }}
              data-tooltip="Shared Links"
              style={{
                background: showLinksDrawer ? 'var(--primary-light)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: showLinksDrawer ? 'var(--primary)' : 'var(--text-secondary)',
                padding: '8px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '36px',
                height: '36px',
                transition: 'all var(--transition-fast)'
              }}
              onMouseEnter={(e) => { if (!showLinksDrawer) e.currentTarget.style.backgroundColor = 'var(--bg-app)'; }}
              onMouseLeave={(e) => { if (!showLinksDrawer) e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <ExternalLink size={18} />
            </button>

            {/* 3.5 Group Notes & Tasks Drawer (Groups Only) */}
            {activeChat.type === 'group' && (
              <button
                onClick={() => { setShowGroupDrawer(!showGroupDrawer); setShowLinksDrawer(false); }}
                data-tooltip="Group Notes & Tasks"
                style={{
                  background: showGroupDrawer ? 'var(--primary-light)' : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: showGroupDrawer ? 'var(--primary)' : 'var(--text-secondary)',
                  padding: '8px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '36px',
                  height: '36px',
                  transition: 'all var(--transition-fast)'
                }}
                onMouseEnter={(e) => { if (!showGroupDrawer) e.currentTarget.style.backgroundColor = 'var(--bg-app)'; }}
                onMouseLeave={(e) => { if (!showGroupDrawer) e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <ClipboardList size={18} />
              </button>
            )}

            {/* 4. Search message box toggle */}
            <button
              onClick={() => { setSearchOpen(!searchOpen); if (searchOpen) setSearchQuery(''); }}
              data-tooltip="Search Message Text (Alt + S)"
              style={{
                background: searchOpen ? 'var(--primary-light)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: searchOpen ? 'var(--primary)' : 'var(--text-secondary)',
                padding: '8px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '36px',
                height: '36px',
                transition: 'all var(--transition-fast)'
              }}
              onMouseEnter={(e) => { if (!searchOpen) e.currentTarget.style.backgroundColor = 'var(--bg-app)'; }}
              onMouseLeave={(e) => { if (!searchOpen) e.currentTarget.style.backgroundColor = 'transparent'; }}
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

                  <div 
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: isSelf ? 'flex-end' : 'flex-start',
                      marginBottom: '8px',
                      position: 'relative',
                      cursor: isSelectionMode ? 'pointer' : 'default'
                    }}
                    onClick={() => {
                      if (isSelectionMode && !msg.deleted) {
                        if (selectedMessageIds.includes(msg.id)) {
                          setSelectedMessageIds(selectedMessageIds.filter(id => id !== msg.id));
                        } else {
                          setSelectedMessageIds([...selectedMessageIds, msg.id]);
                        }
                      }
                    }}
                  >
                    {isSelectionMode && !msg.deleted && (
                      <input
                        type="checkbox"
                        checked={selectedMessageIds.includes(msg.id)}
                        onChange={() => {}} // toggled by parent click handler
                        style={{
                          marginRight: isSelf ? '12px' : '0',
                          marginLeft: isSelf ? '0' : '12px',
                          order: isSelf ? -1 : 10,
                          cursor: 'pointer',
                          width: '18px',
                          height: '18px',
                          accentColor: 'var(--primary)',
                          flexShrink: 0
                        }}
                      />
                    )}
                    
                    {!isSelf && activeChat.type === 'group' && (
                      <div onClick={() => onInspectUser(msg.senderId)} style={{ marginRight: '8px', marginTop: '4px', cursor: 'pointer' }}>
                        {onlineUsers.find(u => u.id === msg.senderId)?.profilePhoto ? (
                          <div style={{ width: '28px', height: '28px', borderRadius: '50%', overflow: 'hidden', border: '1.5px solid var(--border-glass)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <img 
                              src={`${BACKEND_URL}${onlineUsers.find(u => u.id === msg.senderId).profilePhoto}`} 
                              alt={senderName} 
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            />
                          </div>
                        ) : (
                          <div className={`initials-avatar ${getAvatarBgClass(senderName)}`} style={{ width: '28px', height: '28px', fontSize: '11px' }}>
                            {getInitials(senderName)}
                          </div>
                        )}
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
                      onMouseEnter={() => !msg.deleted && !isSelectionMode && setActiveMenuId(msg.id)}
                      onMouseLeave={() => {
                        setActiveMenuId(null);
                        setOpenActionsId(null);
                      }}
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
                        onTouchStart={(e) => handleTouchStart(e, msg)}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                        onTouchCancel={handleTouchEnd}
                        style={{
                          padding: '10px 14px',
                          borderRadius: isSelf 
                            ? '18px 18px 4px 18px' 
                            : '18px 18px 18px 4px',
                          background: isSelf 
                            ? (theme === 'dark' 
                                ? 'linear-gradient(135deg, rgba(0, 168, 132, 0.22) 0%, rgba(0, 168, 132, 0.1) 100%)' 
                                : 'linear-gradient(135deg, #e2f5ec 0%, #d1f4e4 100%)')
                            : (msg.senderId === 'ai' ? 'var(--primary-light)' : 'var(--msg-received)'),
                          color: isSelf ? 'var(--msg-sent-text)' : 'var(--msg-received-text)',
                          position: 'relative',
                          border: msg.senderId === 'ai' ? '1px solid var(--primary)' : (isSelf ? 'none' : '1px solid var(--border-glass)'),
                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
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
                            backgroundColor: 'rgba(0, 0, 0, 0.04)',
                            borderLeft: '3px solid var(--primary)',
                            padding: '6px 10px',
                            borderRadius: '8px',
                            marginBottom: '6px',
                            fontSize: '12px',
                            cursor: 'pointer'
                          }} onClick={() => handleJumpToMessage(parentMsg.id)}>
                            <span style={{ fontWeight: 800, display: 'block', color: 'var(--primary)', marginBottom: '2px' }}>
                              {parentMsg.senderId === user.id ? 'You' : (onlineUsers.find(u => u.id === parentMsg.senderId)?.username || 'User')}
                            </span>
                            <span style={{ color: 'var(--text-secondary)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {parentMsg.deleted ? 'This message was deleted' : (parentMsg.text || '📁 Media attachment')}
                            </span>
                          </div>
                        )}

                        {/* View Once Ephemeral Container or Standard message blocks */}
                        {msg.viewOnce ? (
                          msg.deleted ? (
                            <div className="view-once-card opened">
                              <span style={{ fontSize: '13px', fontStyle: 'italic' }}>🗑️ Ephemeral Message Opened and Self-Destructed</span>
                            </div>
                          ) : (
                            <div className="view-once-card" onClick={() => setActiveViewOnceMsg(msg)}>
                              <Eye size={18} style={{ color: 'var(--warning)' }} />
                              <span style={{ fontSize: '13px', fontWeight: 600 }}>🔒 View-Once Secure Container</span>
                              <span style={{ fontSize: '11px', opacity: 0.8 }}>Click to decrypt & open</span>
                            </div>
                          )
                        ) : (
                          <>
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

                                {/* Location sharing card rendering */}
                                {msg.mediaType === 'location' && (() => {
                                  let coords = { lat: 40.7128, lng: -74.0060 };
                                  try {
                                    if (msg.mediaUrl) {
                                      coords = JSON.parse(msg.mediaUrl);
                                    }
                                  } catch (e) {
                                    console.error("Error parsing location coordinates:", e);
                                  }
                                  return (
                                    <div style={{
                                      padding: '12px',
                                      backgroundColor: 'rgba(108, 92, 231, 0.1)',
                                      border: '1.5px solid #6c5ce7',
                                      borderRadius: '8px',
                                      minWidth: '220px',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '8px'
                                    }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#a855f7', fontWeight: 700, fontSize: '13px' }}>
                                        <MapPin size={16} className="animate-bounce" />
                                        <span>LIVE LOCATION COORDINATES</span>
                                      </div>
                                      <div style={{
                                        height: '85px',
                                        backgroundColor: '#0f172a',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        borderRadius: '6px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        position: 'relative',
                                        overflow: 'hidden'
                                      }}>
                                        <div style={{
                                          position: 'absolute',
                                          width: '100%',
                                          height: '100%',
                                          backgroundImage: 'radial-gradient(rgba(108, 92, 231, 0.3) 1px, transparent 0)',
                                          backgroundSize: '10px 10px',
                                          opacity: 0.5
                                        }} />
                                        <span style={{ fontSize: '12px', color: '#fff', fontFamily: 'monospace', zIndex: 1 }}>Lat: {coords.lat?.toFixed(4) || coords.lat}</span>
                                        <span style={{ fontSize: '12px', color: '#fff', fontFamily: 'monospace', zIndex: 1 }}>Lng: {coords.lng?.toFixed(4) || coords.lng}</span>
                                      </div>
                                      <a
                                        href={`https://maps.google.com/?q=${coords.lat},${coords.lng}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        style={{
                                          backgroundColor: '#6c5ce7',
                                          color: '#fff',
                                          textAlign: 'center',
                                          padding: '6px',
                                          borderRadius: '6px',
                                          fontSize: '11px',
                                          fontWeight: 700,
                                          textDecoration: 'none',
                                          display: 'block'
                                        }}
                                      >
                                        View on Google Maps
                                      </a>
                                    </div>
                                  );
                                })()}

                                {msg.mediaType !== 'image' && msg.mediaType !== 'audio' && msg.mediaType !== 'location' && (
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
                          </>
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
                        {!msg.viewOnce && msg.mediaType !== 'sticker' && (
                          <div style={{ paddingRight: '32px' }}>
                            {translatedMessages[msg.id] && (
                              <div style={{
                                backgroundColor: 'rgba(0, 168, 132, 0.08)',
                                borderLeft: '2.5px solid var(--primary)',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                marginBottom: '6px',
                                fontSize: '11px',
                                color: 'var(--primary)',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                <Languages size={10} />
                                <span>Translation: {translatedMessages[msg.id]}</span>
                              </div>
                            )}
                            <p style={{
                              fontSize: '14px',
                              lineHeight: '1.4',
                              wordBreak: 'break-word',
                              fontStyle: msg.deleted ? 'italic' : 'normal',
                              opacity: msg.deleted ? 0.6 : 1,
                              whiteSpace: 'pre-wrap',
                              margin: 0
                            }}>
                              {msg.text}
                            </p>
                          </div>
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', justify: 'flex-end', gap: '6px', fontSize: '10px', opacity: 0.6, marginTop: '4px' }}>
                          {msg.disappearsAt && <DisappearingCountdown disappearsAt={msg.disappearsAt} />}
                          {msg.edited && !msg.deleted && <span>(edited)</span>}
                          <span>{formatTime(msg.timestamp)}</span>
                          {renderMessageTicks(msg)}
                        </div>

                        {/* Option actions menu */}
                        {activeMenuId === msg.id && !isSelectionMode && (
                          <div style={{ position: 'absolute', bottom: '4px', right: '4px', zIndex: 20 }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenActionsId(openActionsId === msg.id ? null : msg.id);
                              }}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex' }}
                            >
                              <ChevronDown size={14} />
                            </button>

                            <div 
                              id={`actions-${msg.id}`}
                              className="glass-panel"
                              style={{
                                display: openActionsId === msg.id ? 'block' : 'none',
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
                              {msg.text && msg.mediaType !== 'sticker' && !msg.deleted && (
                                <button onClick={() => handleAction('translate', msg)} style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-primary)', fontSize: '12px' }} onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--border-glass)'} onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}><Languages size={12} /> Translate</button>
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

        {/* Selection Bar or Message Compose Panel */}
        {isSelectionMode ? (
          <div style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--border-glass)',
            backgroundColor: 'var(--bg-panel)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
            animation: 'slideUp 0.3s ease-out'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{
                backgroundColor: 'var(--primary)',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '20px'
              }}>
                {selectedMessageIds.length} Selected
              </span>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Select messages you wish to delete from database.
              </span>
            </div>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => {
                  setIsSelectionMode(false);
                  setSelectedMessageIds([]);
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: '1.5px solid var(--border-glass)',
                  background: 'none',
                  color: 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                disabled={selectedMessageIds.length === 0}
                onClick={() => {
                  if (selectedMessageIds.length > 0) {
                    const confirmDelete = window.confirm(`Are you sure you want to delete these ${selectedMessageIds.length} messages?`);
                    if (confirmDelete) {
                      socket.emit('delete_messages_bulk', {
                        messageIds: selectedMessageIds,
                        senderId: user.id
                      });
                      setIsSelectionMode(false);
                      setSelectedMessageIds([]);
                    }
                  }
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  backgroundColor: selectedMessageIds.length === 0 ? 'rgba(239, 68, 68, 0.4)' : 'var(--danger)',
                  color: '#fff',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: selectedMessageIds.length === 0 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                Delete Selected
              </button>
            </div>
          </div>
        ) : (
          <div style={{
            padding: isMobile ? '8px 12px 12px 12px' : '12px 24px 24px 24px',
            borderTop: 'none',
            backgroundColor: 'transparent',
            position: 'relative',
            flexShrink: 0
          }}>

          {/* Smart replies picker panel */}
          {inputFocused && !inputText.trim() && (
            <div style={{ 
              display: 'flex', 
              gap: '8px', 
              padding: '10px 14px', 
              backgroundColor: 'var(--bg-panel)', 
              border: '1px solid var(--border-glass)', 
              borderRadius: '16px', 
              marginBottom: '8px', 
              flexWrap: 'wrap',
              boxShadow: 'var(--shadow-sm)'
            }}>
              {['Sounds good! 👍', 'Sure, let\'s do it', 'Let\'s sync up later.'].map((reply, i) => (
                <button
                  key={i}
                  onMouseDown={(e) => {
                    e.preventDefault(); // prevent blur before click fires
                    setInputText(reply);
                    showToast('AI quick reply selected!', 'info');
                  }}
                  style={{
                    backgroundColor: 'var(--primary-light)',
                    border: '1px solid var(--primary)',
                    color: 'var(--primary)',
                    borderRadius: '12px',
                    padding: '6px 12px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--primary)';
                    e.currentTarget.style.color = '#fff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--primary-light)';
                    e.currentTarget.style.color = 'var(--primary)';
                  }}
                >
                  {reply}
                </button>
              ))}
            </div>
          )}

          {/* Scheduled & Vanish indicators */}
          {(scheduledDelay !== null || vanishModeEnabled) && (
            <div style={{ 
              display: 'flex', 
              gap: '10px', 
              padding: '10px 14px', 
              backgroundColor: 'var(--bg-panel)', 
              border: '1px solid var(--border-glass)', 
              borderRadius: '16px', 
              marginBottom: '8px', 
              alignItems: 'center',
              boxShadow: 'var(--shadow-sm)'
            }}>
              {vanishModeEnabled && (
                <span style={{ fontSize: '11px', color: '#a855f7', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Lock size={12} /> Vanish Mode (Secret Chat Active)
                </span>
              )}
              {scheduledDelay !== null && (
                <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={12} /> Scheduled Message: {scheduledDelay / 1000}s Delay
                </span>
              )}
            </div>
          )}
          
          {/* Reply Preview */}
          {replyingTo && (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              padding: '10px 14px', 
              backgroundColor: 'var(--bg-panel)', 
              border: '1px solid var(--border-glass)',
              borderLeft: '4px solid var(--primary)', 
              borderRadius: '16px', 
              marginBottom: '8px',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{ fontSize: '12px', minWidth: 0 }}>
                <span style={{ fontWeight: 800, display: 'block', color: 'var(--primary)', marginBottom: '2px' }}>
                  Replying to {replyingTo.senderId === user.id ? 'yourself' : (onlineUsers.find(u => u.id === replyingTo.senderId)?.username || 'User')}
                </span>
                <span style={{ color: 'var(--text-secondary)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {replyingTo.text || '📁 Media attachment'}
                </span>
              </div>
              <button 
                onClick={() => setReplyingTo(null)} 
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  cursor: 'pointer', 
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  transition: 'background-color var(--transition-fast)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-app)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Editing Preview */}
          {editingMessage && (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between', 
              padding: '10px 14px', 
              backgroundColor: 'var(--bg-panel)', 
              border: '1px solid var(--border-glass)',
              borderLeft: '4px solid var(--primary)', 
              borderRadius: '16px', 
              marginBottom: '8px',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{ fontSize: '12px', minWidth: 0 }}>
                <span style={{ fontWeight: 800, display: 'block', color: 'var(--primary)', marginBottom: '2px' }}>Editing Message</span>
                <span style={{ color: 'var(--text-secondary)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  Original: "{editingMessage.text}"
                </span>
              </div>
              <button 
                onClick={() => { setEditingMessage(null); setInputText(''); }} 
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  cursor: 'pointer', 
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  transition: 'background-color var(--transition-fast)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-app)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <X size={16} />
              </button>
            </div>
          )}

          {/* Upload File Preview */}
          {filePreview && (
            <div style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '12px', 
              padding: '10px 14px', 
              backgroundColor: 'var(--bg-panel)', 
              borderRadius: '16px', 
              border: '1px solid var(--border-glass)', 
              marginBottom: '8px', 
              position: 'relative',
              boxShadow: 'var(--shadow-sm)'
            }}>
              {selectedFile?.type?.startsWith('image/') ? (
                <img src={filePreview} alt="Preview" style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '8px' }} />
              ) : (
                <FileText size={32} style={{ color: 'var(--primary)' }} />
              )}
              <div style={{ maxWidth: '180px' }}>
                <span style={{ display: 'block', fontSize: '12px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-primary)' }}>{selectedFile?.name}</span>
                <span style={{ display: 'block', fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>{selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB` : ''}</span>
              </div>
              <button 
                onClick={() => { setSelectedFile(null); setFilePreview(null); }} 
                style={{ 
                  background: 'var(--bg-panel)', 
                  border: '1px solid var(--border-glass)', 
                  borderRadius: '50%', 
                  padding: '4px', 
                  cursor: 'pointer', 
                  color: 'var(--text-secondary)', 
                  position: 'absolute', 
                  top: '-8px', 
                  right: '-8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                <X size={12} />
              </button>
            </div>
          )}

          {/* Attachment Grid Popover */}
          {showAttachmentPopover && (
            <>
              <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 98 }} onClick={() => setShowAttachmentPopover(false)} />
              <div 
                className="glass-panel animate-scale"
                style={{
                  position: 'absolute',
                  bottom: '70px',
                  left: '20px',
                  zIndex: 100,
                  width: '280px',
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-panel)',
                  boxShadow: 'var(--shadow-lg)',
                  border: '1px solid var(--border-glass)',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '12px',
                  justifyItems: 'center',
                  alignItems: 'center'
                }}
              >
                {/* Option 1: Document */}
                <button
                  type="button"
                  onClick={() => {
                    fileInputRef.current?.click();
                    setShowAttachmentPopover(false);
                  }}
                  style={attachmentPopoverBtnStyle}
                  title="Document"
                >
                  <div style={{ ...attachmentIconCircle, backgroundColor: '#2196f3' }}>
                    <FileText size={20} color="#fff" />
                  </div>
                  <span style={attachmentPopoverText}>Document</span>
                </button>

                {/* Option 2: Camera / Photo */}
                <button
                  type="button"
                  onClick={() => {
                    fileInputRef.current?.click();
                    setShowAttachmentPopover(false);
                  }}
                  style={attachmentPopoverBtnStyle}
                  title="Camera"
                >
                  <div style={{ ...attachmentIconCircle, backgroundColor: '#e91e63' }}>
                    <Camera size={20} color="#fff" />
                  </div>
                  <span style={attachmentPopoverText}>Camera</span>
                </button>

                {/* Option 3: Sticker */}
                <button
                  type="button"
                  onClick={() => {
                    setStickerPickerOpen(true);
                    setShowAttachmentPopover(false);
                  }}
                  style={attachmentPopoverBtnStyle}
                  title="Sticker"
                >
                  <div style={{ ...attachmentIconCircle, backgroundColor: '#00bcd4' }}>
                    <Sticker size={20} color="#fff" />
                  </div>
                  <span style={attachmentPopoverText}>Sticker</span>
                </button>

                {/* Option 4: Poll (Group chats only) */}
                <button
                  type="button"
                  onClick={() => {
                    if (activeChat.type === 'group') {
                      setPollCreatorOpen(true);
                    } else {
                      showToast('Polls are only supported in groups', 'info');
                    }
                    setShowAttachmentPopover(false);
                  }}
                  style={{
                    ...attachmentPopoverBtnStyle,
                    opacity: activeChat.type === 'group' ? 1 : 0.5
                  }}
                  title="Poll"
                >
                  <div style={{ ...attachmentIconCircle, backgroundColor: '#4caf50' }}>
                    <BarChart2 size={20} color="#fff" />
                  </div>
                  <span style={attachmentPopoverText}>Poll</span>
                </button>

                {/* Option 5: Simulated Location */}
                <button
                  type="button"
                  onClick={() => {
                    setShowAttachmentPopover(false);
                    const confirmShare = window.confirm("Do you want to share your simulated live location coordinates?");
                    if (confirmShare) {
                      socket.emit('send_message', {
                        senderId: user.id,
                        recipientId: activeChat.type === 'direct' ? activeChat.id : null,
                        roomId: activeChat.type === 'group' ? activeChat.id : null,
                        text: '📍 Shared simulated live location',
                        mediaUrl: JSON.stringify({ lat: 40.7128, lng: -74.0060 }),
                        mediaType: 'location'
                      });
                      showToast('Simulated location shared!', 'success');
                    }
                  }}
                  style={attachmentPopoverBtnStyle}
                  title="Location"
                >
                  <div style={{ ...attachmentIconCircle, backgroundColor: '#ff9800' }}>
                    <MapPin size={20} color="#fff" />
                  </div>
                  <span style={attachmentPopoverText}>Location</span>
                </button>

                {/* Option 6: Vanish Mode */}
                <button
                  type="button"
                  onClick={() => {
                    if (activeChat.type === 'direct') {
                      setVanishModeEnabled(!vanishModeEnabled);
                      if (!vanishModeEnabled) {
                        showToast('Vanish Mode Enabled (Bypasses DB, 15s auto-clear)', 'purple');
                      } else {
                        showToast('Vanish Mode Disabled', 'info');
                      }
                    } else {
                      showToast('Vanish Mode is only available in direct messages', 'info');
                    }
                    setShowAttachmentPopover(false);
                  }}
                  style={{
                    ...attachmentPopoverBtnStyle,
                    opacity: activeChat.type === 'direct' ? 1 : 0.5
                  }}
                  title="Vanish Mode"
                >
                  <div style={{ 
                    ...attachmentIconCircle, 
                    backgroundColor: vanishModeEnabled ? '#a855f7' : '#9c27b0'
                  }}>
                    <Lock size={20} color="#fff" />
                  </div>
                  <span style={attachmentPopoverText}>Vanish</span>
                </button>

                {/* Option 7: View-Once */}
                <button
                  type="button"
                  onClick={() => {
                    setViewOnceEnabled(!viewOnceEnabled);
                    if (!viewOnceEnabled) {
                      showToast('View-Once Mode Enabled (Next message self-destructs after reading)', 'warning');
                    } else {
                      showToast('View-Once Mode Disabled', 'info');
                    }
                    setShowAttachmentPopover(false);
                  }}
                  style={attachmentPopoverBtnStyle}
                  title="View-Once"
                >
                  <div style={{ 
                    ...attachmentIconCircle, 
                    backgroundColor: viewOnceEnabled ? '#ff5722' : '#ff9800'
                  }}>
                    <Eye size={20} color="#fff" />
                  </div>
                  <span style={attachmentPopoverText}>View Once</span>
                </button>

                {/* Option 8: Schedule Message */}
                <button
                  type="button"
                  onClick={() => {
                    setShowScheduleDropdown(!showScheduleDropdown);
                    setShowAttachmentPopover(false);
                  }}
                  style={attachmentPopoverBtnStyle}
                  title="Schedule Message"
                >
                  <div style={{ 
                    ...attachmentIconCircle, 
                    backgroundColor: scheduledDelay !== null ? '#009688' : '#3f51b5'
                  }}>
                    <Clock size={20} color="#fff" />
                  </div>
                  <span style={attachmentPopoverText}>Schedule</span>
                </button>

                {/* Option 9: Disappearing Timer */}
                <div 
                  style={{
                    ...attachmentPopoverBtnStyle,
                    position: 'relative'
                  }}
                >
                  <div style={{ ...attachmentIconCircle, backgroundColor: disappearingTimer > 0 ? '#ffc107' : '#607d8b' }}>
                    <Clock size={20} color="#fff" />
                  </div>
                  <select
                    value={disappearingTimer}
                    onChange={(e) => {
                      setDisappearingTimer(Number(e.target.value));
                      setShowAttachmentPopover(false);
                    }}
                    title="Disappearing Timer"
                    style={{
                      position: 'absolute',
                      top: 0, left: 0, width: '100%', height: '100%',
                      opacity: 0,
                      cursor: 'pointer'
                    }}
                  >
                    <option value={0}>⏱️ Off</option>
                    <option value={10}>⏱️ 10s</option>
                    <option value={60}>⏱️ 1m</option>
                    <option value={3600}>⏱️ 1h</option>
                    <option value={86400}>⏱️ 1d</option>
                  </select>
                  <span style={attachmentPopoverText}>
                    {disappearingTimer > 0 ? `${disappearingTimer}s` : 'Timer'}
                  </span>
                </div>
              </div>
            </>
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

          {/* Composer Form Controls Unified Pill */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: isMobile ? '6px' : '10px', 
            width: '100%',
            backgroundColor: 'var(--bg-panel)',
            borderRadius: '24px',
            padding: '6px 12px',
            border: '1px solid var(--border-glass)',
            boxShadow: 'var(--shadow-md)',
            boxSizing: 'border-box'
          }}>
            
            {/* Left buttons (Emoji & Attachment) */}
            {!isRecording && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {/* Emoji button */}
                <button
                  type="button"
                  onClick={() => setEmojiPickerOpen(!emojiPickerOpen)}
                  disabled={isRecording}
                  title="Emojis"
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    cursor: 'pointer', 
                    color: 'var(--text-secondary)', 
                    padding: '8px', 
                    borderRadius: '50%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    transition: 'all var(--transition-fast)',
                    width: '36px',
                    height: '36px'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-app)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <Smile size={18} />
                </button>

                {/* Attachment button */}
                <button
                  type="button"
                  onClick={() => setShowAttachmentPopover(!showAttachmentPopover)}
                  disabled={isRecording}
                  title="Attachments"
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    cursor: 'pointer', 
                    color: showAttachmentPopover ? 'var(--primary)' : 'var(--text-secondary)', 
                    padding: '8px', 
                    borderRadius: '50%', 
                    backgroundColor: showAttachmentPopover ? 'var(--primary-light)' : 'transparent',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    transition: 'all var(--transition-fast)',
                    width: '36px',
                    height: '36px'
                  }}
                  onMouseEnter={(e) => { if (!showAttachmentPopover) e.currentTarget.style.backgroundColor = 'var(--bg-app)'; }}
                  onMouseLeave={(e) => { if (!showAttachmentPopover) e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <Paperclip size={18} style={{ transform: 'rotate(45deg)' }} />
                </button>
              </div>
            )}

            <input type="file" ref={fileInputRef} onChange={handleFileSelect} style={{ display: 'none' }} />

            {/* Main composer text input or recording widget */}
            {isRecording ? (
              <div 
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '4px 8px',
                  borderRadius: '16px',
                  backgroundColor: 'rgba(239, 68, 68, 0.08)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: 'var(--danger)' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--danger)', display: 'inline-block', animation: 'pulseBorder 1s infinite' }} />
                  <span>Recording Voice: {formatTimer(recordingDuration)}</span>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  {/* Cancel */}
                  <button type="button" onClick={() => stopRecording(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex' }}><X size={16} /></button>
                  {/* Send */}
                  <button type="button" onClick={() => stopRecording(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--success)', display: 'flex' }}><Send size={16} /></button>
                </div>
              </div>
            ) : (
              // Standard composer text input (Clean and borderless)
              <input
                type="text"
                placeholder={
                  editingMessage 
                    ? 'Save edits...' 
                    : selectedFile 
                      ? 'Add caption...' 
                      : 'Type message here...'
                }
                value={inputText}
                onChange={handleInputChange}
                onKeyDown={handleInputKeyDown}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setTimeout(() => setInputFocused(false), 200)}
                disabled={!connected || uploading}
                style={{
                  flex: 1,
                  padding: isMobile ? '8px 4px' : '10px 8px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  fontSize: '14px'
                }}
              />
            )}

            {/* Right buttons (Camera & Mic/Send) */}
            {!isRecording && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {/* Camera button */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  title="Camera / Photo"
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    cursor: 'pointer', 
                    color: 'var(--text-secondary)', 
                    padding: '8px', 
                    borderRadius: '50%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    transition: 'all var(--transition-fast)',
                    width: '36px',
                    height: '36px'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-app)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <Camera size={18} />
                </button>

                {/* Send / Mic button */}
                {inputText.trim() || selectedFile || editingMessage ? (
                  <button
                    onClick={handleSendTextSubmit}
                    disabled={!connected || uploading}
                    style={{
                      backgroundColor: 'var(--primary)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '50%',
                      width: '36px',
                      height: '36px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      flexShrink: 0,
                      transition: 'all var(--transition-fast)',
                      boxShadow: '0 2px 8px rgba(0, 168, 132, 0.3)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--primary-hover)';
                      e.currentTarget.style.transform = 'scale(1.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--primary)';
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    <Send size={16} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={startRecording}
                    disabled={!connected}
                    title="Record Voice Note"
                    style={{
                      backgroundColor: 'transparent',
                      color: 'var(--text-secondary)',
                      border: 'none',
                      borderRadius: '50%',
                      width: '36px',
                      height: '36px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      flexShrink: 0,
                      transition: 'all var(--transition-fast)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-app)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <Mic size={18} />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      </div>

      {/* C. Group Details Drawer (Notes & Tasks) */}
      {activeChat.type === 'group' && showGroupDrawer && (
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
            <h4 style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
              <CheckSquare size={15} style={{ color: 'var(--primary)' }} /> Notes & Tasks
            </h4>
            <button onClick={() => setShowGroupDrawer(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={16} /></button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Collaborative Notepad section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                ✍️ Group Notepad
              </span>
              <textarea
                value={activeRoomNotes}
                onChange={handleNotesChange}
                placeholder="Collaborative notes... Synced in real-time."
                rows={6}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid var(--border-glass)',
                  background: 'var(--bg-app)',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  fontSize: '12px',
                  resize: 'none',
                  lineHeight: '1.4',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Shared Tasks management list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderTop: '1px solid var(--border-glass)', paddingTop: '16px' }}>
              <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                📋 Task List ({activeRoomTasks.length})
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
                    border: '1.5px solid var(--border-glass)',
                    background: 'var(--bg-app)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    fontSize: '12px',
                    width: '100%',
                    boxSizing: 'border-box'
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
                      border: '1.5px solid var(--border-glass)',
                      background: 'var(--bg-app)',
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
                      color: 'var(--text-on-primary)',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      fontWeight: 700,
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
                          backgroundColor: 'var(--bg-app)',
                          border: '1px solid var(--border-glass)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                          <input
                            type="checkbox"
                            checked={tsk.completed}
                            onChange={() => handleToggleTask(tsk.id, tsk.completed)}
                            style={{ cursor: 'pointer', accentColor: 'var(--primary)' }}
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
                            <span style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>Assignee: {name}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

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

      {/* Ephemeral Secure Viewport Modal */}
      {activeViewOnceMsg && (
        <div className="secure-viewport-overlay">
          <div className="secure-viewport-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
              <h3 style={{ color: '#fff', fontSize: '15px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Eye size={18} style={{ color: 'var(--warning)' }} /> SECURE CONTAINER VIEWPORT
              </h3>
              <button 
                onClick={handleCloseViewOnce}
                style={{
                  backgroundColor: 'var(--danger)',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#fff',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Close & Self-Destruct
              </button>
            </div>

            <div className="secure-warning-bar">
              <AlertTriangle size={16} />
              <span>WARNING: Closing this window will permanently delete this item. Screenshots are logged.</span>
            </div>

            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', padding: '20px 0', minHeight: '180px' }}>
              {activeViewOnceMsg.mediaUrl ? (
                activeViewOnceMsg.mediaType === 'image' ? (
                  <img 
                    src={getMediaSrc(activeViewOnceMsg.mediaUrl)} 
                    alt="Secure container" 
                    className="secure-viewport-media" 
                  />
                ) : activeViewOnceMsg.mediaType === 'audio' ? (
                  <audio src={getMediaSrc(activeViewOnceMsg.mediaUrl)} controls autoPlay />
                ) : (
                  <div style={{ padding: '20px', background: 'rgba(0,0,0,0.3)', borderRadius: '10px', textAlign: 'center', color: '#fff' }}>
                    📂 Ephemeral Attachment Document:<br/>
                    <a 
                      href={getMediaSrc(activeViewOnceMsg.mediaUrl)} 
                      download={activeViewOnceMsg.mediaName}
                      style={{ color: 'var(--primary)', fontWeight: 'bold', display: 'inline-block', marginTop: '12px' }}
                    >
                      Download {activeViewOnceMsg.mediaName}
                    </a>
                  </div>
                )
              ) : (
                <p style={{ color: '#fff', fontSize: '15px', lineHeight: '1.5', whiteSpace: 'pre-wrap', wordBreak: 'break-word', textAlign: 'center', maxWidth: '100%' }}>
                  {activeViewOnceMsg.text}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DisappearingCountdown({ disappearsAt }) {
  const [timeLeft, setTimeLeft] = useState(() => {
    return Math.max(0, Math.floor((new Date(disappearsAt).getTime() - Date.now()) / 1000));
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        const next = Math.max(0, Math.floor((new Date(disappearsAt).getTime() - Date.now()) / 1000));
        if (next <= 0) {
          clearInterval(timer);
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [disappearsAt]);

  if (timeLeft <= 0) return null;

  const formatSecs = (secs) => {
    if (secs < 60) return `${secs}s`;
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    return `${hours}h`;
  };

  return (
    <span className="disappearing-timer" title="Expiring secure chat message">
      ⏱️ {formatSecs(timeLeft)}
    </span>
  );
}

const attachmentPopoverBtnStyle = {
  background: 'none',
  border: 'none',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '6px',
  cursor: 'pointer',
  padding: '4px',
  width: '100%',
  outline: 'none'
};

const attachmentIconCircle = {
  width: '44px',
  height: '44px',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 4px 10px rgba(0, 0, 0, 0.25)',
  transition: 'transform 0.15s ease'
};

const attachmentPopoverText = {
  fontSize: '11px',
  fontWeight: 600,
  color: 'var(--text-secondary)',
  whiteSpace: 'nowrap'
};

export default ChatArea;
