// frontend/src/App.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from './hooks/useSocket';
import Login from './components/Login';
import ChatLayout from './components/ChatLayout';
import { ToastContainer } from './components/Toast';
import { SOCKET_EVENTS } from '../../shared/constants.json';
import { playNotificationSound } from './utils/audio';
import CallModal from './components/CallModal';

function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('cc_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('cc_theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const { socket, connected, error, connectSocket, disconnectSocket } = useSocket();

  // Chat Data State
  const [rooms, setRooms] = useState([]);
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [activeChat, setActiveChat] = useState(null); // { id, name, type: 'group'|'direct' }
  const [typingUsers, setTypingUsers] = useState({}); // { [chatId]: [username, ...] }
  const [unreadCounts, setUnreadCounts] = useState({}); // { [chatId]: count }
  
  // Settings & Status State
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationsPermission, setNotificationsPermission] = useState('default');
  const [toasts, setToasts] = useState([]);
  const [latencyQuality, setLatencyQuality] = useState('excellent'); // excellent, fair, poor

  // Administrative Analytics State
  const [analyticsData, setAnalyticsData] = useState({
    totalMessagesSent: 0,
    totalRoomsCreated: 0,
    totalLogins: 0,
    onlineUsersCount: 0,
    activityLogs: []
  });

  // WebRTC Call States
  const [callState, setCallState] = useState('idle');
  const [callPartner, setCallPartner] = useState(null);
  const [isVideoCall, setIsVideoCall] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [audioMuted, setAudioMuted] = useState(false);
  const [videoMuted, setVideoMuted] = useState(false);
  const [isSharingScreen, setIsSharingScreen] = useState(false);

  // WebRTC Refs
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const incomingOfferRef = useRef(null);
  const callStateRef = useRef('idle');

  // Synchronize state ref to bypass closures inside listeners
  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  // STUN Config
  const peerConnectionConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  // Load custom color palette on mount
  useEffect(() => {
    const savedPaletteId = localStorage.getItem('cc_accent_color_id') || 'teal';
    const found = [
      { id: 'teal', color: 'hsl(164, 85%, 36%)', hover: 'hsl(164, 85%, 28%)', light: 'hsl(164, 85%, 94%)' },
      { id: 'blue', color: 'hsl(210, 95%, 45%)', hover: 'hsl(210, 95%, 38%)', light: 'hsl(210, 95%, 94%)' },
      { id: 'purple', color: 'hsl(270, 85%, 55%)', hover: 'hsl(270, 85%, 48%)', light: 'hsl(270, 85%, 95%)' },
      { id: 'orange', color: 'hsl(30, 95%, 50%)', hover: 'hsl(30, 95%, 43%)', light: 'hsl(30, 95%, 94%)' },
      { id: 'pink', color: 'hsl(330, 85%, 55%)', hover: 'hsl(330, 85%, 48%)', light: 'hsl(330, 85%, 95%)' }
    ].find(p => p.id === savedPaletteId);
    
    if (found) {
      document.documentElement.style.setProperty('--primary', found.color);
      document.documentElement.style.setProperty('--primary-hover', found.hover);
      document.documentElement.style.setProperty('--primary-light', found.light);
    }
  }, []);

  // Session verification on mount
  useEffect(() => {
    const token = localStorage.getItem('cc_token');
    const savedUser = localStorage.getItem('cc_user');
    if (token && savedUser) {
      fetch(`https://cyberchat-d26c.onrender.com/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(data => {
        if (data.success && data.user) {
          setUser(data.user);
          localStorage.setItem('cc_user', JSON.stringify(data.user));
        }
      })
      .catch(() => {
        handleLogout();
      });
    }
  }, []);

  const activeChatRef = useRef(activeChat);
  useEffect(() => {
    activeChatRef.current = activeChat;
    if (activeChat && socket && connected) {
      // Clear unread count for active conversation
      setUnreadCounts(prev => ({
        ...prev,
        [activeChat.id]: 0
      }));

      // Bulk seen receipt trigger: tell server we read all unread messages in this conversation
      const unseen = messages.filter(m => 
        m.senderId !== user?.id &&
        (m.status === 'sent' || m.status === 'delivered') &&
        ((activeChat.type === 'group' && m.roomId === activeChat.id) ||
         (activeChat.type === 'direct' && m.senderId === activeChat.id && !m.roomId))
      );
      unseen.forEach(m => {
        socket.emit(SOCKET_EVENTS.MESSAGE_SEEN, { messageId: m.id });
      });
    }
  }, [activeChat, messages, socket, connected, user]);

  // Toast Alerts Trigger Callback
  const showToast = (message, type = 'info') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Sync notifications permissions
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationsPermission(Notification.permission);
    }
  }, []);

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      setNotificationsPermission(permission);
      showToast(permission === 'granted' ? 'Notifications authorized!' : 'Notifications blocked.', 'info');
      return permission;
    }
    return Notification.permission;
  };

  // Sync CSS Themes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('cc_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
    showToast(`Switched to ${theme === 'light' ? 'dark' : 'light'} mode`, 'success');
  };

  // Socket connection trigger
  useEffect(() => {
    if (user) {
      const activeSocket = connectSocket(user);

      // Measure local ping latency simulation
      const interval = setInterval(() => {
        if (activeSocket.connected) {
          const start = Date.now();
          activeSocket.emit('ping_latency', { start }); // Safe mock triggers in handler
          setLatencyQuality(activeSocket.io.backoff?.attempts > 0 ? 'fair' : 'excellent');
        } else {
          setLatencyQuality('poor');
        }
      }, 15000);

      // Listen to room history query
      activeSocket.on('room_history', ({ roomId, messages: history }) => {
        setMessages(prev => {
          const otherMsgs = prev.filter(m => m.roomId !== roomId);
          return [...otherMsgs, ...history].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        });
      });

      // Listen for global ban notification
      activeSocket.on('banned_notification', ({ reason }) => {
        showToast(reason, 'error');
        handleLogout();
      });

      // Listen for mute changes
      activeSocket.on('mute_status_update', ({ isMutedGlobally }) => {
        setUser(prev => {
          if (!prev) return prev;
          const updated = { ...prev, isMutedGlobally };
          localStorage.setItem('cc_user', JSON.stringify(updated));
          return updated;
        });
        showToast(isMutedGlobally ? '⚠️ You have been muted globally by an administrator.' : 'You have been unmuted.', isMutedGlobally ? 'warning' : 'success');
      });

      // Listen for kicks from room
      activeSocket.on('kicked_from_room', ({ roomId, roomName }) => {
        showToast(`You were kicked from room "${roomName}"`, 'warning');
        if (activeChatRef.current && activeChatRef.current.id === roomId) {
          setActiveChat(null);
        }
      });

      // Catch error messages
      activeSocket.on('error_notification', ({ message }) => {
        showToast(message, 'error');
      });

      return () => {
        clearInterval(interval);
        activeSocket.off('room_history');
        activeSocket.off('banned_notification');
        activeSocket.off('mute_status_update');
        activeSocket.off('kicked_from_room');
        activeSocket.off('error_notification');
      };
    } else {
      disconnectSocket();
    }
  }, [user]);

  // Bind core socket triggers
  useEffect(() => {
    if (!socket) return;

    const handleLoginResponse = (data) => {
      if (data.success && data.user) {
        setUser(prev => {
          const updated = { ...prev, ...data.user };
          localStorage.setItem('cc_user', JSON.stringify(updated));
          return updated;
        });
        if (data.rooms) setRooms(data.rooms);
        if (data.messages) setMessages(data.messages);
        showToast(`Signed in as ${data.user.username}`, 'success');
      } else if (data.success === false) {
        showToast(data.error || 'Authentication rejected.', 'error');
        handleLogout();
      }
    };

    const handleUserList = (userList) => {
      setOnlineUsers(userList);
      if (user) {
        const self = userList.find(u => u.id === user.id);
        if (self) {
          setUser(prev => {
            const updated = {
              ...prev,
              blockedUsers: self.blockedUsers,
              mutedUsers: self.mutedUsers,
              isMutedGlobally: self.isMutedGlobally,
              contacts: self.contacts || [],
              sentRequests: self.sentRequests || [],
              receivedRequests: self.receivedRequests || []
            };
            localStorage.setItem('cc_user', JSON.stringify(updated));
            return updated;
          });
        }
      }
    };

    const handleRoomList = (roomList) => {
      setRooms(roomList);
    };

    const handleReceiveMessage = (msg) => {
      if (user?.blockedUsers?.includes(msg.senderId)) return;

      // Append message
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });

      // Receipt loop: if message received and sender is not us, emit delivered status
      const isFromSelf = msg.senderId === user?.id;
      if (!isFromSelf && msg.senderId !== 'system') {
        socket.emit(SOCKET_EVENTS.MESSAGE_DELIVERED, { messageId: msg.id });

        const chatKey = msg.roomId ? msg.roomId : msg.senderId;
        const isFromActive = activeChatRef.current && (
          (msg.roomId && activeChatRef.current.id === msg.roomId) ||
          (!msg.roomId && activeChatRef.current.id === msg.senderId)
        );

        if (isFromActive) {
          // If conversation is currently open, emit seen receipt immediately
          socket.emit(SOCKET_EVENTS.MESSAGE_SEEN, { messageId: msg.id });
        } else {
          // Increment unread count
          setUnreadCounts(prev => ({
            ...prev,
            [chatKey]: (prev[chatKey] || 0) + 1
          }));

          // Ring audio sound chime
          const isMuted = user?.mutedUsers?.includes(chatKey) || user?.mutedUsers?.includes(msg.senderId);
          if (soundEnabled && !isMuted) {
            playNotificationSound();
          }

          // Desktop alerts
          if (Notification.permission === 'granted' && !isMuted) {
            const sender = onlineUsers.find(u => u.id === msg.senderId);
            const senderName = sender ? sender.username : 'Someone';
            const title = msg.roomId 
              ? `${senderName} in #${rooms.find(r => r.id === msg.roomId)?.name || 'Group'}` 
              : `${senderName}`;
            const textBody = msg.mediaUrl ? `📁 Shared a ${msg.mediaType}` : msg.text;

            new Notification(title, {
              body: textBody,
              icon: '/favicon.ico'
            });
          }
        }
      }
    };

    const handleEditMessage = (updatedMsg) => {
      setMessages(prev => prev.map(m => m.id === updatedMsg.id ? updatedMsg : m));
    };

    const handleDeleteMessage = (deletedMsg) => {
      setMessages(prev => prev.map(m => m.id === deletedMsg.id ? deletedMsg : m));
    };

    const handlePinMessage = (pinnedMsg) => {
      setMessages(prev => prev.map(m => m.id === pinnedMsg.id ? pinnedMsg : m));
    };

    // Seen/Delivered updates from recipient clients
    const handleMessageDelivered = ({ messageId, status }) => {
      setMessages(prev => prev.map(m => {
        if (m.id === messageId && m.status === 'sent') {
          return { ...m, status };
        }
        return m;
      }));
    };

    const handleMessageSeen = ({ messageId, status }) => {
      setMessages(prev => prev.map(m => {
        if (m.id === messageId && (m.status === 'sent' || m.status === 'delivered')) {
          return { ...m, status };
        }
        return m;
      }));
    };

    // Emoji reactions updates
    const handleMessageReact = ({ messageId, reactions }) => {
      setMessages(prev => prev.map(m => {
        if (m.id === messageId) {
          return { ...m, reactions };
        }
        return m;
      }));
    };

    // Typing activity updates
    const handleTypingUpdate = ({ roomId, senderId, username, isTyping }) => {
      const typingKey = roomId || senderId;
      if (!typingKey) return;

      setTypingUsers(prev => {
        const currentList = prev[typingKey] || [];
        let newList;
        if (isTyping) {
          newList = currentList.includes(username) ? currentList : [...currentList, username];
        } else {
          newList = currentList.filter(name => name !== username);
        }
        return { ...prev, [typingKey]: newList };
      });
    };

    // Analytics sync updates
    const handleAnalyticsUpdate = (data) => {
      setAnalyticsData(data);
    };

    // WebRTC Signalling Event Handlers
    const handleIncomingCall = async ({ from, fromUser, offer, isVideo }) => {
      if (callStateRef.current !== 'idle') {
        socket.emit(SOCKET_EVENTS.CALL_REJECTED, { to: from });
        return;
      }
      setCallState('receiving');
      setCallPartner({ id: from, username: fromUser.username });
      setIsVideoCall(isVideo);
      incomingOfferRef.current = { from, offer, isVideo };
    };

    const handleCallAccepted = async ({ from, answer }) => {
      if (pcRef.current) {
        try {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
          setCallState('connected');
        } catch (e) {
          console.error('Error setting remote description:', e);
        }
      }
    };

    const handleCallRejected = ({ from }) => {
      showToast('Call was declined / user busy.', 'info');
      cleanupCall();
    };

    const handleIceCandidate = async ({ from, candidate }) => {
      if (pcRef.current) {
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error('Error adding remote ICE candidate:', e);
        }
      }
    };

    const handleEndCall = ({ from }) => {
      showToast('Call ended by remote party.', 'info');
      cleanupCall();
    };

    socket.on(SOCKET_EVENTS.USER_LOGIN, handleLoginResponse);
    socket.on(SOCKET_EVENTS.USER_LIST_UPDATE, handleUserList);
    socket.on(SOCKET_EVENTS.ROOM_LIST_UPDATE, handleRoomList);
    socket.on(SOCKET_EVENTS.RECEIVE_MESSAGE, handleReceiveMessage);
    socket.on(SOCKET_EVENTS.EDIT_MESSAGE, handleEditMessage);
    socket.on(SOCKET_EVENTS.DELETE_MESSAGE, handleDeleteMessage);
    socket.on(SOCKET_EVENTS.PIN_MESSAGE, handlePinMessage);
    socket.on(SOCKET_EVENTS.MESSAGE_DELIVERED, handleMessageDelivered);
    socket.on(SOCKET_EVENTS.MESSAGE_SEEN, handleMessageSeen);
    socket.on(SOCKET_EVENTS.MESSAGE_REACT, handleMessageReact);
    socket.on(SOCKET_EVENTS.TYPING_UPDATE, handleTypingUpdate);
    socket.on(SOCKET_EVENTS.ANALYTICS_UPDATE, handleAnalyticsUpdate);
    socket.on(SOCKET_EVENTS.CALL_USER, handleIncomingCall);
    socket.on(SOCKET_EVENTS.CALL_ACCEPTED, handleCallAccepted);
    socket.on(SOCKET_EVENTS.CALL_REJECTED, handleCallRejected);
    socket.on(SOCKET_EVENTS.ICE_CANDIDATE, handleIceCandidate);
    socket.on(SOCKET_EVENTS.END_CALL, handleEndCall);

    return () => {
      socket.off(SOCKET_EVENTS.USER_LOGIN, handleLoginResponse);
      socket.off(SOCKET_EVENTS.USER_LIST_UPDATE, handleUserList);
      socket.off(SOCKET_EVENTS.ROOM_LIST_UPDATE, handleRoomList);
      socket.off(SOCKET_EVENTS.RECEIVE_MESSAGE, handleReceiveMessage);
      socket.off(SOCKET_EVENTS.EDIT_MESSAGE, handleEditMessage);
      socket.off(SOCKET_EVENTS.DELETE_MESSAGE, handleDeleteMessage);
      socket.off(SOCKET_EVENTS.PIN_MESSAGE, handlePinMessage);
      socket.off(SOCKET_EVENTS.MESSAGE_DELIVERED, handleMessageDelivered);
      socket.off(SOCKET_EVENTS.MESSAGE_SEEN, handleMessageSeen);
      socket.off(SOCKET_EVENTS.MESSAGE_REACT, handleMessageReact);
      socket.off(SOCKET_EVENTS.TYPING_UPDATE, handleTypingUpdate);
      socket.off(SOCKET_EVENTS.ANALYTICS_UPDATE, handleAnalyticsUpdate);
      socket.off(SOCKET_EVENTS.CALL_USER, handleIncomingCall);
      socket.off(SOCKET_EVENTS.CALL_ACCEPTED, handleCallAccepted);
      socket.off(SOCKET_EVENTS.CALL_REJECTED, handleCallRejected);
      socket.off(SOCKET_EVENTS.ICE_CANDIDATE, handleIceCandidate);
      socket.off(SOCKET_EVENTS.END_CALL, handleEndCall);
    };
  }, [socket, user, soundEnabled, onlineUsers, rooms]);

  const handleLogin = (authenticatedUser, token, rememberMe) => {
    setUser(authenticatedUser);
    localStorage.setItem('cc_user', JSON.stringify(authenticatedUser));
    localStorage.setItem('cc_token', token);
  };

  const handleLogout = () => {
    disconnectSocket();
    localStorage.removeItem('cc_user');
    localStorage.removeItem('cc_token');
    setUser(null);
    setRooms([]);
    setMessages([]);
    setOnlineUsers([]);
    setActiveChat(null);
    setUnreadCounts({});
    cleanupCall();
  };

  const cleanupCall = () => {
    if (pcRef.current) {
      try {
        pcRef.current.close();
      } catch (e) {}
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    }
    setCallState('idle');
    setCallPartner(null);
    setLocalStream(null);
    setRemoteStream(null);
    setIsVideoCall(false);
    setAudioMuted(false);
    setVideoMuted(false);
    setIsSharingScreen(false);
    incomingOfferRef.current = null;
  };

  const onStartCall = async (targetUserId, isVideo) => {
    if (!socket || !connected) return;
    const partner = onlineUsers.find(u => u.id === targetUserId);
    if (!partner) {
      showToast('User is offline or not found', 'error');
      return;
    }

    setCallState('dialing');
    setCallPartner({ id: partner.id, username: partner.username });
    setIsVideoCall(isVideo);
    setAudioMuted(false);
    setVideoMuted(false);
    setIsSharingScreen(false);

    try {
      const constraints = {
        audio: true,
        video: isVideo ? { width: 1280, height: 720 } : false
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      setLocalStream(stream);

      const pc = new RTCPeerConnection(peerConnectionConfig);
      pcRef.current = pc;

      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit(SOCKET_EVENTS.ICE_CANDIDATE, {
            to: targetUserId,
            candidate: event.candidate
          });
        }
      };

      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      socket.emit(SOCKET_EVENTS.CALL_USER, {
        to: targetUserId,
        offer,
        fromUser: { id: user.id, username: user.username },
        isVideo
      });
    } catch (err) {
      console.error('Call initialization failed:', err);
      showToast('Could not access media hardware', 'error');
      cleanupCall();
    }
  };

  const onAccept = async () => {
    const incoming = incomingOfferRef.current;
    if (!incoming) return;

    setCallState('connected');
    setAudioMuted(false);
    setVideoMuted(false);
    setIsSharingScreen(false);

    try {
      const constraints = {
        audio: true,
        video: incoming.isVideo ? { width: 1280, height: 720 } : false
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;
      setLocalStream(stream);

      const pc = new RTCPeerConnection(peerConnectionConfig);
      pcRef.current = pc;

      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit(SOCKET_EVENTS.ICE_CANDIDATE, {
            to: incoming.from,
            candidate: event.candidate
          });
        }
      };

      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          setRemoteStream(event.streams[0]);
        }
      };

      await pc.setRemoteDescription(new RTCSessionDescription(incoming.offer));

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit(SOCKET_EVENTS.CALL_ACCEPTED, {
        to: incoming.from,
        answer
      });
    } catch (err) {
      console.error('Accepting call failed:', err);
      showToast('Hardware access error', 'error');
      socket.emit(SOCKET_EVENTS.CALL_REJECTED, { to: incoming.from });
      cleanupCall();
    }
  };

  const onDecline = () => {
    const incoming = incomingOfferRef.current;
    if (incoming) {
      socket.emit(SOCKET_EVENTS.CALL_REJECTED, { to: incoming.from });
    }
    cleanupCall();
  };

  const onHangup = () => {
    if (callPartner && (callState === 'connected' || callState === 'dialing')) {
      socket.emit(SOCKET_EVENTS.END_CALL, { to: callPartner.id });
    }
    cleanupCall();
  };

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setAudioMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setVideoMuted(!videoTrack.enabled);
      }
    }
  };

  const startScreenShare = async () => {
    if (!pcRef.current || !localStreamRef.current) return;
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      screenStreamRef.current = screenStream;
      setIsSharingScreen(true);

      const screenTrack = screenStream.getVideoTracks()[0];
      const senders = pcRef.current.getSenders();
      const videoSender = senders.find(sender => sender.track && sender.track.kind === 'video');
      
      if (videoSender) {
        videoSender.replaceTrack(screenTrack);
      }

      screenTrack.onended = () => {
        stopScreenShare();
      };
    } catch (e) {
      console.error('Screen sharing start failed:', e);
      showToast('Could not start screen share', 'error');
    }
  };

  const stopScreenShare = () => {
    if (!pcRef.current || !localStreamRef.current) return;
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    }
    setIsSharingScreen(false);

    const originalVideoTrack = localStreamRef.current.getVideoTracks()[0];
    const senders = pcRef.current.getSenders();
    const videoSender = senders.find(sender => sender.track && sender.track.kind === 'video');
    
    if (videoSender && originalVideoTrack) {
      videoSender.replaceTrack(originalVideoTrack);
    }
  };

  return (
    <div style={{ height: '100%', width: '100%' }}>
      {user ? (
        <ChatLayout
          user={user}
          socket={socket}
          connected={connected}
          connectionError={error}
          latencyQuality={latencyQuality}
          rooms={rooms}
          messages={messages}
          onlineUsers={onlineUsers}
          activeChat={activeChat}
          setActiveChat={setActiveChat}
          typingUsers={typingUsers}
          unreadCounts={unreadCounts}
          soundEnabled={soundEnabled}
          setSoundEnabled={setSoundEnabled}
          notificationsPermission={notificationsPermission}
          requestNotificationPermission={requestNotificationPermission}
          theme={theme}
          toggleTheme={toggleTheme}
          logout={handleLogout}
          showToast={showToast}
          analyticsData={analyticsData}
          onStartCall={onStartCall}
        />
      ) : (
        <Login onLogin={handleLogin} theme={theme} toggleTheme={toggleTheme} showToast={showToast} />
      )}

      {/* WebRTC Calling dialog modal */}
      {user && (
        <CallModal
          callState={callState}
          callPartner={callPartner}
          isVideoCall={isVideoCall}
          onAccept={onAccept}
          onDecline={onDecline}
          onHangup={onHangup}
          localStream={localStream}
          remoteStream={remoteStream}
          toggleAudio={toggleAudio}
          toggleVideo={toggleVideo}
          audioMuted={audioMuted}
          videoMuted={videoMuted}
          startScreenShare={startScreenShare}
          stopScreenShare={stopScreenShare}
          isSharingScreen={isSharingScreen}
        />
      )}
      
      {/* Absolute Toast Panel Overlay */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
}

export default App;
