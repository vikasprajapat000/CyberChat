const { v4: uuidv4 } = require('uuid');
const { SOCKET_EVENTS, DEFAULT_ROOMS } = require('../shared/constants.json');
const User = require('./models/User');
const Admin = require('./models/Admin');
const Room = require('./models/Room');
const Message = require('./models/Message');
const Report = require('./models/Report');
const Log = require('./models/Log');
const CallHistory = require('./models/CallHistory');
const Notification = require('./models/Notification');

// Profanity list for moderating chat — NOTE: do NOT use /g flag on a shared regex with .test()
// because the lastIndex state is retained, causing alternating calls to return wrong results.
const PROFANITY_LIST = /(\b(fuck|shit|asshole|bitch|bastard|crap|dick|piss|cunt)\b)/i;

// XSS Sanitizer Helper
const sanitizeText = (str) => {
  if (!str) return '';
  return str
    .trim()
    .substring(0, 2000) // Message length limit
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

// Grammar correction rules helper (NLP Simulation)
const correctGrammarMock = (text) => {
  let corrected = text;
  const replacements = [
    { regex: /\bi is\b/gi, replacement: 'I am' },
    { regex: /\bhe don't\b/gi, replacement: "he doesn't" },
    { regex: /\bshe don't\b/gi, replacement: "she doesn't" },
    { regex: /\bwe was\b/gi, replacement: 'we were' },
    { regex: /\bthey was\b/gi, replacement: 'they were' },
    { regex: /\byour welcome\b/gi, replacement: "you're welcome" },
    { regex: /\btheir is\b/gi, replacement: "there is" },
    { regex: /\bgoto\b/gi, replacement: "go to" },
    { regex: /\bshould of\b/gi, replacement: "should have" },
    { regex: /\bwould of\b/gi, replacement: "would have" }
  ];

  replacements.forEach(rule => {
    corrected = corrected.replace(rule.regex, rule.replacement);
  });
  return corrected;
};

module.exports = function registerSocketHandlers(io, state) {
  // Pre-seed default rooms
  const seedDefaultRooms = async () => {
    try {
      for (const room of DEFAULT_ROOMS) {
        const r = await Room.findOne({ id: room.id });
        if (!r) {
          const newRoom = new Room({
            id: room.id,
            name: room.name,
            description: room.description || 'Welcome to this room!',
            icon: room.icon || '💬',
            type: 'group',
            creatorId: 'system',
            members: [],
            isPrivate: false,
            admins: ['system'],
            notes: '',
            tasks: []
          });
          await newRoom.save();
        }
      }
    } catch (e) {
      console.error('Error seeding default rooms:', e);
    }
  };
  seedDefaultRooms();

  // In-memory socket mapping (userId -> socket.id)
  const connectedUsers = new Map();

  const logActivity = async (type, detail) => {
    try {
      const newLog = new Log({
        id: `log_${uuidv4().substring(0, 8)}`,
        type,
        detail,
        timestamp: new Date()
      });
      await newLog.save();
      broadcastAnalytics();
    } catch (err) {
      console.error('Logging activity failed:', err);
    }
  };

  const broadcastAnalytics = async () => {
    try {
      const activeAdminIds = [];
      for (const [userId, socketId] of connectedUsers.entries()) {
        const u = await User.findOne({ userId });
        if (u && u.isAdmin) activeAdminIds.push(socketId);
        const a = await Admin.findOne({ adminId: userId });
        if (a) activeAdminIds.push(socketId);
      }

      if (activeAdminIds.length === 0) return;

      const totalMessagesSent = await Message.countDocuments({ senderId: { $ne: 'system' } });
      const totalRoomsCreated = await Room.countDocuments({});
      const totalLogins = await Log.countDocuments({ type: 'USER_JOIN' });
      const onlineUsersCount = await User.countDocuments({ status: 'online', onlineVisibility: { $ne: 'invisible' } });
      const activityLogs = await Log.find({}).sort({ timestamp: -1 }).limit(100);

      const analyticsData = {
        totalMessagesSent,
        totalRoomsCreated,
        totalLogins,
        onlineUsersCount,
        activityLogs: activityLogs.map(l => ({ id: l.id, type: l.type, detail: l.detail, timestamp: l.timestamp.toISOString() }))
      };

      activeAdminIds.forEach(sId => {
        io.to(sId).emit(SOCKET_EVENTS.ANALYTICS_UPDATE, analyticsData);
      });
    } catch (e) {
      console.error('Error broadcasting analytics:', e);
    }
  };

  const broadcastUserList = async () => {
    try {
      const allUsers = await User.find({});
      const userList = allUsers.map(u => {
        // Privacy setting masking
        const isInvisible = u.onlineVisibility === 'invisible';
        const hideLastSeen = u.lastSeenSetting === 'nobody';

        return {
          id: u.userId,
          username: u.username,
          status: isInvisible ? 'offline' : u.status,
          lastSeen: hideLastSeen ? null : (u.lastSeen ? u.lastSeen.toISOString() : null),
          blockedUsers: u.blockedUsers,
          mutedUsers: u.mutedUsers,
          isAdmin: u.isAdmin,
          isMutedGlobally: u.isMutedGlobally,
          bio: u.bio,
          statusMsg: u.statusMsg,
          profilePhoto: u.profilePhoto,
          coverPhoto: u.coverPhoto,
          customThemeColor: u.customThemeColor,
          lastSeenSetting: u.lastSeenSetting,
          onlineVisibility: u.onlineVisibility,
          contacts: u.contacts || [],
          sentRequests: u.sentRequests || [],
          receivedRequests: u.receivedRequests || [],
          displayName: u.displayName,
          mobileNumber: u.mobileNumber,
          aboutVisibility: u.aboutVisibility,
          statusVisibility: u.statusVisibility,
          readReceipts: u.readReceipts,
          hideTyping: u.hideTyping,
          hideRecording: u.hideRecording,
          hideScreenshot: u.hideScreenshot,
          isGhostMode: u.isGhostMode,
          isVerified: u.isVerified,
          chatWallpaper: u.chatWallpaper,
          fontSize: u.fontSize,
          pinnedChats: u.pinnedChats || [],
          mutedChats: u.mutedChats || [],
          archivedChats: u.archivedChats || []
        };
      });
      io.emit(SOCKET_EVENTS.USER_LIST_UPDATE, userList);
      broadcastAnalytics();
    } catch (e) {
      console.error('Error broadcasting user list:', e);
    }
  };

  const broadcastRoomList = async () => {
    try {
      const allRooms = await Room.find({});
      const roomList = allRooms.map(r => ({
        id: r.id,
        name: r.name,
        type: r.type,
        members: r.members,
        creatorId: r.creatorId,
        description: r.description,
        icon: r.icon,
        isPrivate: r.isPrivate,
        admins: r.admins,
        notes: r.notes,
        tasks: r.tasks
      }));
      io.emit(SOCKET_EVENTS.ROOM_LIST_UPDATE, roomList);
      broadcastAnalytics();
    } catch (e) {
      console.error('Error broadcasting room list:', e);
    }
  };

  const sendSystemNotification = async (targetRoomId, text, details = {}) => {
    try {
      const systemMsg = new Message({
        id: `sys_${uuidv4()}`,
        roomId: targetRoomId,
        text,
        senderId: 'system',
        timestamp: new Date(),
        status: 'seen'
      });
      
      await systemMsg.save();
      io.to(targetRoomId).emit(SOCKET_EVENTS.RECEIVE_MESSAGE, {
        id: systemMsg.id,
        roomId: systemMsg.roomId,
        text: systemMsg.text,
        senderId: systemMsg.senderId,
        timestamp: systemMsg.timestamp.toISOString(),
        isSystem: true,
        ...details
      });
    } catch (err) {
      console.error('System notification send failed:', err);
    }
  };

  io.on('connection', (socket) => {
    // Check authenticated user details from handshake middleware
    const currentUser = socket.user;
    if (!currentUser) return;

    const currentUserId = currentUser.id;

    // Login Handle
    socket.on(SOCKET_EVENTS.USER_LOGIN, async () => {
      try {
        const isAdminRole = currentUser.role === 'admin';
        
        let profile;
        if (isAdminRole) {
          profile = await Admin.findOne({ adminId: currentUserId });
        } else {
          profile = await User.findOne({ userId: currentUserId });
        }

        if (!profile) {
          socket.emit(SOCKET_EVENTS.USER_LOGIN, { success: false, error: 'Profile not found' });
          return;
        }

        if (currentUser.role === 'user' && profile.isSuspended) {
          socket.emit(SOCKET_EVENTS.USER_LOGIN, { success: false, error: 'Your account is suspended' });
          socket.disconnect(true);
          return;
        }

        // Set status to online in database (if regular user)
        if (currentUser.role === 'user') {
          profile.status = profile.onlineVisibility === 'invisible' ? 'offline' : 'online';
          profile.lastSeen = null;
          await profile.save();
        }

        // Add socket map reference
        connectedUsers.set(currentUserId, socket.id);
        socket.join(`user_${currentUserId}`);

        // Join default rooms
        const defaultRooms = await Room.find({ creatorId: 'system' });
        for (const room of defaultRooms) {
          if (!room.members.includes(currentUserId)) {
            room.members.push(currentUserId);
            await room.save();
          }
          socket.join(room.id);
        }

        // Query active rooms lists
        const allRooms = await Room.find({});
        const activeRooms = allRooms.filter(r => r.members.includes(currentUserId) || r.creatorId === 'system');

        // Query message history where target is in user joined rooms or direct messages related to user
        const allUserRoomIds = activeRooms.map(r => r.id);
        const relatedMessages = await Message.find({
          $or: [
            { roomId: { $in: allUserRoomIds } },
            { senderId: currentUserId },
            { recipientId: currentUserId },
            { senderId: 'system' }
          ]
        }).sort({ timestamp: 1 });

        socket.emit(SOCKET_EVENTS.USER_LOGIN, {
          success: true,
          user: {
            id: currentUserId,
            username: currentUser.username,
            role: currentUser.role,
            blockedUsers: currentUser.role === 'user' ? profile.blockedUsers : [],
            mutedUsers: currentUser.role === 'user' ? profile.mutedUsers : [],
            isAdmin: isAdminRole || profile.isAdmin,
            isMutedGlobally: currentUser.role === 'user' ? profile.isMutedGlobally : false,
            bio: currentUser.role === 'user' ? profile.bio : 'Server Administrator',
            statusMsg: currentUser.role === 'user' ? profile.statusMsg : 'Active',
            profilePhoto: currentUser.role === 'user' ? profile.profilePhoto : null,
            coverPhoto: currentUser.role === 'user' ? profile.coverPhoto : null,
            customThemeColor: currentUser.role === 'user' ? profile.customThemeColor : '#00a884',
            lastSeenSetting: currentUser.role === 'user' ? profile.lastSeenSetting : 'everyone',
            onlineVisibility: currentUser.role === 'user' ? profile.onlineVisibility : 'visible',
            contacts: currentUser.role === 'user' ? (profile.contacts || []) : [],
            sentRequests: currentUser.role === 'user' ? (profile.sentRequests || []) : [],
            receivedRequests: currentUser.role === 'user' ? (profile.receivedRequests || []) : [],
            displayName: currentUser.role === 'user' ? profile.displayName : '',
            mobileNumber: currentUser.role === 'user' ? profile.mobileNumber : '',
            aboutVisibility: currentUser.role === 'user' ? profile.aboutVisibility : 'everyone',
            statusVisibility: currentUser.role === 'user' ? profile.statusVisibility : 'everyone',
            readReceipts: currentUser.role === 'user' ? profile.readReceipts : true,
            hideTyping: currentUser.role === 'user' ? profile.hideTyping : false,
            hideRecording: currentUser.role === 'user' ? profile.hideRecording : false,
            hideScreenshot: currentUser.role === 'user' ? profile.hideScreenshot : false,
            isGhostMode: currentUser.role === 'user' ? profile.isGhostMode : false,
            isVerified: currentUser.role === 'user' ? profile.isVerified : false,
            chatWallpaper: currentUser.role === 'user' ? profile.chatWallpaper : 'default',
            fontSize: currentUser.role === 'user' ? profile.fontSize : 'medium',
            pinnedChats: currentUser.role === 'user' ? (profile.pinnedChats || []) : [],
            mutedChats: currentUser.role === 'user' ? (profile.mutedChats || []) : [],
            archivedChats: currentUser.role === 'user' ? (profile.archivedChats || []) : []
          },
          rooms: activeRooms.map(r => ({
            id: r.id,
            name: r.name,
            type: r.type,
            members: r.members,
            creatorId: r.creatorId,
            description: r.description,
            icon: r.icon,
            isPrivate: r.isPrivate,
            admins: r.admins,
            notes: r.notes,
            tasks: r.tasks
          })),
          messages: relatedMessages.map(m => ({
            id: m.id,
            senderId: m.senderId,
            recipientId: m.recipientId,
            roomId: m.roomId,
            text: m.text,
            mediaUrl: m.mediaUrl,
            mediaType: m.mediaType,
            mediaName: m.mediaName,
            replyToId: m.replyToId,
            timestamp: m.timestamp.toISOString(),
            edited: m.edited,
            deleted: m.deleted,
            pinned: m.pinned,
            status: m.status,
            reactions: m.reactions,
            isPoll: m.isPoll,
            pollData: m.pollData
          }))
        });

        for (const room of defaultRooms) {
          sendSystemNotification(room.id, `${currentUser.username} joined Cyber Chat`, { type: 'join', actor: currentUser.username });
        }

        logActivity('USER_JOIN', `${currentUser.username} logged in securely`);
        broadcastUserList();
        broadcastRoomList();
      } catch (err) {
        console.error('USER_LOGIN Socket Error:', err);
        socket.emit(SOCKET_EVENTS.USER_LOGIN, { success: false, error: 'Database synchronization failed' });
      }
    });

    // Profile updates
    socket.on('edit_profile', async ({
      username, bio, statusMsg, customThemeColor, lastSeenSetting, onlineVisibility,
      displayName, mobileNumber, aboutVisibility, statusVisibility, readReceipts,
      hideTyping, hideRecording, hideScreenshot, isGhostMode, isVerified,
      chatWallpaper, fontSize, pinnedChats, mutedChats, archivedChats
    }) => {
      try {
        if (currentUser.role !== 'user') return;
        const profile = await User.findOne({ userId: currentUserId });
        if (!profile) return;

        if (username) profile.username = sanitizeText(username);
        if (bio !== undefined) profile.bio = sanitizeText(bio);
        if (statusMsg !== undefined) profile.statusMsg = sanitizeText(statusMsg);
        if (customThemeColor) profile.customThemeColor = sanitizeText(customThemeColor);
        if (lastSeenSetting) profile.lastSeenSetting = lastSeenSetting;
        if (onlineVisibility) {
          profile.onlineVisibility = onlineVisibility;
          profile.status = onlineVisibility === 'invisible' ? 'offline' : 'online';
        }
        if (displayName !== undefined) profile.displayName = sanitizeText(displayName);
        if (mobileNumber !== undefined) profile.mobileNumber = sanitizeText(mobileNumber);
        if (aboutVisibility !== undefined) profile.aboutVisibility = aboutVisibility;
        if (statusVisibility !== undefined) profile.statusVisibility = statusVisibility;
        if (readReceipts !== undefined) profile.readReceipts = !!readReceipts;
        if (hideTyping !== undefined) profile.hideTyping = !!hideTyping;
        if (hideRecording !== undefined) profile.hideRecording = !!hideRecording;
        if (hideScreenshot !== undefined) profile.hideScreenshot = !!hideScreenshot;
        if (isGhostMode !== undefined) {
          profile.isGhostMode = !!isGhostMode;
          if (profile.isGhostMode) {
            profile.onlineVisibility = 'invisible';
            profile.status = 'offline';
            profile.lastSeenSetting = 'nobody';
            profile.readReceipts = false;
            profile.hideTyping = true;
          }
        }
        if (isVerified !== undefined) profile.isVerified = !!isVerified;
        if (chatWallpaper !== undefined) profile.chatWallpaper = chatWallpaper;
        if (fontSize !== undefined) profile.fontSize = fontSize;
        if (pinnedChats !== undefined) profile.pinnedChats = pinnedChats;
        if (mutedChats !== undefined) profile.mutedChats = mutedChats;
        if (archivedChats !== undefined) profile.archivedChats = archivedChats;

        await profile.save();

        socket.emit('profile_updated', {
          user: {
            id: profile.userId,
            username: profile.username,
            bio: profile.bio,
            statusMsg: profile.statusMsg,
            profilePhoto: profile.profilePhoto,
            coverPhoto: profile.coverPhoto,
            customThemeColor: profile.customThemeColor,
            lastSeenSetting: profile.lastSeenSetting,
            onlineVisibility: profile.onlineVisibility,
            displayName: profile.displayName,
            mobileNumber: profile.mobileNumber,
            aboutVisibility: profile.aboutVisibility,
            statusVisibility: profile.statusVisibility,
            readReceipts: profile.readReceipts,
            hideTyping: profile.hideTyping,
            hideRecording: profile.hideRecording,
            hideScreenshot: profile.hideScreenshot,
            isGhostMode: profile.isGhostMode,
            isVerified: profile.isVerified,
            chatWallpaper: profile.chatWallpaper,
            fontSize: profile.fontSize,
            pinnedChats: profile.pinnedChats || [],
            mutedChats: profile.mutedChats || [],
            archivedChats: profile.archivedChats || []
          }
        });

        logActivity('PROFILE_EDIT', `${profile.username} updated profile configurations`);
        broadcastUserList();
      } catch (err) {
        console.error('Edit Profile Socket Error:', err);
      }
    });

    // Create Room
    socket.on(SOCKET_EVENTS.CREATE_ROOM, async ({ name, description, icon, isPrivate, passcode, creatorId }) => {
      try {
        const roomId = `room_${uuidv4().substring(0, 8)}`;
        const newRoom = new Room({
          id: roomId,
          name: sanitizeText(name),
          description: sanitizeText(description) || 'No description provided.',
          icon: sanitizeText(icon) || '💬',
          type: 'group',
          creatorId: creatorId || currentUserId,
          members: [creatorId || currentUserId],
          isPrivate: !!isPrivate,
          passcode: isPrivate ? passcode : '',
          admins: [creatorId || currentUserId],
          notes: '',
          tasks: []
        });

        await newRoom.save();
        socket.join(roomId);

        logActivity('ROOM_CREATE', `Room "${newRoom.name}" created by ${currentUser.username}`);
        broadcastRoomList();
        socket.emit('room_created_success', { roomId });
        sendSystemNotification(roomId, `Room "${newRoom.name}" created by ${currentUser.username}`, { type: 'create' });
      } catch (err) {
        console.error('Create Room Error:', err);
      }
    });

    // Join Room
    socket.on(SOCKET_EVENTS.JOIN_ROOM, async ({ roomId, userId, passcode }) => {
      try {
        const room = await Room.findOne({ id: roomId });
        if (!room) return;

        if (room.isPrivate && !room.members.includes(userId)) {
          if (room.passcode !== passcode) {
            socket.emit('room_join_error', { roomId, error: 'Incorrect passcode' });
            return;
          }
        }

        if (!room.members.includes(userId)) {
          room.members.push(userId);
          await room.save();
        }

        socket.join(roomId);
        
        // Find if target user is online and join their socket to this room
        const sId = connectedUsers.get(userId);
        if (sId) {
          const targetSocket = io.sockets.sockets.get(sId);
          if (targetSocket) targetSocket.join(roomId);
        }

        logActivity('ROOM_JOIN', `${currentUser.username} joined room "${room.name}"`);
        broadcastRoomList();

        sendSystemNotification(roomId, `${currentUser.username} joined the room`, { type: 'join', actor: currentUser.username });

        const roomHistory = await Message.find({ roomId }).sort({ timestamp: 1 });
        socket.emit('room_history', { roomId, messages: roomHistory.map(m => ({
          id: m.id,
          senderId: m.senderId,
          recipientId: m.recipientId,
          roomId: m.roomId,
          text: m.text,
          mediaUrl: m.mediaUrl,
          mediaType: m.mediaType,
          mediaName: m.mediaName,
          replyToId: m.replyToId,
          timestamp: m.timestamp.toISOString(),
          edited: m.edited,
          deleted: m.deleted,
          pinned: m.pinned,
          status: m.status,
          reactions: m.reactions,
          isPoll: m.isPoll,
          pollData: m.pollData
        })) });
      } catch (err) {
        console.error('Join Room Error:', err);
      }
    });

    // Leave Room
    socket.on(SOCKET_EVENTS.LEAVE_ROOM, async ({ roomId, userId }) => {
      try {
        const room = await Room.findOne({ id: roomId });
        if (!room) return;

        room.members = room.members.filter(id => id !== userId);
        room.admins = room.admins.filter(id => id !== userId);
        await room.save();

        socket.leave(roomId);
        
        const sId = connectedUsers.get(userId);
        if (sId) {
          const targetSocket = io.sockets.sockets.get(sId);
          if (targetSocket) targetSocket.leave(roomId);
        }

        logActivity('ROOM_LEAVE', `${currentUser.username} left room "${room.name}"`);
        broadcastRoomList();
        sendSystemNotification(roomId, `${currentUser.username} left the room`, { type: 'leave', actor: currentUser.username });
      } catch (err) {
        console.error('Leave Room Error:', err);
      }
    });

    // Promote Group Admin
    socket.on('admin_promote_user', async ({ roomId, targetUserId, adminId }) => {
      try {
        const room = await Room.findOne({ id: roomId });
        if (!room) return;

        if (!room.admins.includes(adminId)) return; // verify promoter is admin

        if (!room.admins.includes(targetUserId)) {
          room.admins.push(targetUserId);
          await room.save();
          broadcastRoomList();

          const target = await User.findOne({ userId: targetUserId });
          sendSystemNotification(roomId, `${target?.username} was promoted to Group Administrator`, { type: 'promote' });
          logActivity('ADMIN_PROMOTE', `${target?.username} promoted in room "${room.name}"`);
        }
      } catch (e) {
        console.error(e);
      }
    });

    // Demote Group Admin
    socket.on('admin_demote_user', async ({ roomId, targetUserId, adminId }) => {
      try {
        const room = await Room.findOne({ id: roomId });
        if (!room) return;
        if (!room.admins.includes(adminId)) return;
        if (room.creatorId === targetUserId) return; // cannot demote creator

        room.admins = room.admins.filter(id => id !== targetUserId);
        await room.save();
        broadcastRoomList();

        const target = await User.findOne({ userId: targetUserId });
        sendSystemNotification(roomId, `${target?.username} was demoted to regular member`, { type: 'demote' });
        logActivity('ADMIN_DEMOTE', `${target?.username} demoted in room "${room.name}"`);
      } catch (e) {
        console.error(e);
      }
    });

    // Sync room notes
    socket.on(SOCKET_EVENTS.SYNC_NOTES, async ({ roomId, notesText }) => {
      try {
        const room = await Room.findOne({ id: roomId });
        if (!room) return;

        room.notes = notesText;
        await room.save();
        socket.to(roomId).emit(SOCKET_EVENTS.SYNC_NOTES, { roomId, notesText });
      } catch (e) {
        console.error(e);
      }
    });

    // Add room tasks
    socket.on(SOCKET_EVENTS.CREATE_TASK, async ({ roomId, taskName, taskAssigneeId }) => {
      try {
        const room = await Room.findOne({ id: roomId });
        if (!room) return;

        const newTask = {
          id: `tsk_${uuidv4().substring(0, 6)}`,
          name: sanitizeText(taskName),
          assigneeId: taskAssigneeId,
          completed: false,
          timestamp: new Date()
        };

        room.tasks.push(newTask);
        await room.save();
        
        broadcastRoomList();
        sendSystemNotification(roomId, `Task added: "${newTask.name}"`, { type: 'task_create' });
      } catch (err) {
        console.error(err);
      }
    });

    // Update room task status
    socket.on(SOCKET_EVENTS.UPDATE_TASK, async ({ roomId, taskId, completed }) => {
      try {
        const room = await Room.findOne({ id: roomId });
        if (!room) return;

        const task = room.tasks.find(t => t.id === taskId);
        if (task) {
          task.completed = !!completed;
          await room.save();
          broadcastRoomList();
        }
      } catch (err) {
        console.error(err);
      }
    });

    // Send Message
    socket.on(SOCKET_EVENTS.SEND_MESSAGE, async (messageData) => {
      try {
        const { senderId, recipientId, roomId, text, mediaUrl, mediaType, mediaName, replyToId, isPoll, pollData, disappearsAt, viewOnce } = messageData;

        // Verify sender global mute status
        const senderProfile = await User.findOne({ userId: senderId });
        if (senderProfile && senderProfile.isMutedGlobally) {
          socket.emit('error_notification', { message: 'You have been muted by an administrator.' });
          return;
        }

        // Verify direct message blocker
        if (recipientId) {
          const recipientProfile = await User.findOne({ userId: recipientId });
          if (recipientProfile && recipientProfile.blockedUsers.includes(senderId)) {
            socket.emit(SOCKET_EVENTS.RECEIVE_MESSAGE, {
              ...messageData,
              id: `msg_${uuidv4()}`,
              timestamp: new Date().toISOString(),
              status: 'sent_blocked'
            });
            return;
          }
        }

        // Profanity scans — create a fresh regex each call to avoid lastIndex state bug
        let messageText = text || '';
        let censored = false;
        const PROFANITY_REGEX = /\b(fuck|shit|asshole|bitch|bastard|crap|dick|piss|cunt)\b/gi;
        if (messageText && PROFANITY_REGEX.test(messageText)) {
          messageText = messageText.replace(/\b(fuck|shit|asshole|bitch|bastard|crap|dick|piss|cunt)\b/gi, (match) => '*'.repeat(match.length));
          censored = true;
        }

        const newMsg = new Message({
          id: `msg_${uuidv4()}`,
          senderId,
          recipientId,
          roomId,
          text: sanitizeText(messageText),
          mediaUrl,
          mediaType,
          mediaName,
          replyToId,
          disappearsAt: disappearsAt ? new Date(disappearsAt) : null,
          viewOnce: !!viewOnce,
          timestamp: new Date(),
          status: 'sent',
          reactions: {},
          isPoll: !!isPoll,
          pollData: isPoll ? {
            question: sanitizeText(pollData.question),
            options: pollData.options.map(opt => ({ option: sanitizeText(opt), votes: [] }))
          } : null
        });

        await newMsg.save();

        // Schedule server-side timer for disappearing messages
        if (newMsg.disappearsAt) {
          const delay = new Date(newMsg.disappearsAt).getTime() - Date.now();
          if (delay > 0) {
            setTimeout(async () => {
              try {
                const msg = await Message.findOne({ id: newMsg.id });
                if (msg) {
                  await Message.deleteOne({ id: newMsg.id });
                  
                  const deletePayload = {
                    id: newMsg.id,
                    roomId: newMsg.roomId,
                    senderId: newMsg.senderId,
                    recipientId: newMsg.recipientId,
                    isExpired: true
                  };
                  
                  if (newMsg.roomId) {
                    io.to(newMsg.roomId).emit(SOCKET_EVENTS.DELETE_MESSAGE, deletePayload);
                  } else {
                    const recSocket = connectedUsers.get(newMsg.recipientId);
                    const sndSocket = connectedUsers.get(newMsg.senderId);
                    if (recSocket) io.to(recSocket).emit(SOCKET_EVENTS.DELETE_MESSAGE, deletePayload);
                    if (sndSocket) io.to(sndSocket).emit(SOCKET_EVENTS.DELETE_MESSAGE, deletePayload);
                  }
                  logActivity('MSG_EXPIRED', `Disappearing message ${newMsg.id} expired and was erased`);
                }
              } catch (err) {
                console.error('Error executing disappearing message auto-deletion:', err);
              }
            }, delay);
          }
        }
        logActivity('MSG_SEND', `Message dispatched by ${currentUser.username}`);

        // Broadcast Message
        if (roomId) {
          io.to(roomId).emit(SOCKET_EVENTS.RECEIVE_MESSAGE, {
            ...newMsg.toObject(),
            timestamp: newMsg.timestamp.toISOString()
          });

          // Censor warning trigger
          if (censored) {
            setTimeout(() => {
              sendSystemNotification(roomId, `⚠️ [Moderator Notification]: CyberAI censored profanity from user "${currentUser.username}". Please adhere to the guidelines.`, { actor: 'CyberAI' });
            }, 400);
          }

          // NLP AI Mentions command check
          if (messageText.includes('@ai')) {
            const aiQuery = messageText.replace('@ai', '').trim().toLowerCase();
            let aiReplyText = '';

            io.to(roomId).emit(SOCKET_EVENTS.TYPING_UPDATE, { roomId, senderId: 'ai', username: 'CyberAI', isTyping: true });

            setTimeout(async () => {
              if (aiQuery === 'help') {
                aiReplyText = `🤖 **CyberAI Assistant Help Panel**:\nHere are the commands you can invoke by writing @ai followed by:\n- \`summarize\` : Summarizes the last 15 messages in this room.\n- \`correct [text]\` : Fixes grammar and typos inside the text.\n- \`suggest\` : Recommends 3 quick-replies for the last message.\n- \`moderator\` : Explains room guidelines.`;
              } 
              else if (aiQuery.startsWith('correct ')) {
                const textToCorrect = messageText.substring(messageText.toLowerCase().indexOf('correct ') + 8).trim();
                const correctedText = correctGrammarMock(textToCorrect);
                aiReplyText = `📝 **CyberAI Grammar Correction**:\n*Original*: "${textToCorrect}"\n*Corrected*: "${correctedText}"`;
              } 
              else if (aiQuery === 'summarize') {
                const recentMsgs = await Message.find({ roomId, senderId: { $nin: ['ai', 'system'] } }).sort({ timestamp: -1 }).limit(15);
                if (recentMsgs.length === 0) {
                  aiReplyText = `🤖 I couldn't find any recent messages in this room to summarize.`;
                } else {
                  // Reverse order for summary display
                  recentMsgs.reverse();
                  
                  const bullets = [];
                  for (const m of recentMsgs) {
                    const sender = await User.findOne({ userId: m.senderId });
                    bullets.push(`- **${sender ? sender.username : 'User'}**: ${m.text || '📁 Media Attachment'}`);
                  }
                  aiReplyText = `📊 **CyberAI Conversation Summary**:\nHere is a NLP digest of the last messages:\n${bullets.join('\n')}\n\n*Key Topics*: Synchronized workspace features and project development steps.`;
                }
              } 
              else if (aiQuery === 'suggest') {
                const lastMsg = await Message.findOne({ roomId, senderId: { $nin: ['ai', 'system'] } }).sort({ timestamp: -1 });
                if (!lastMsg) {
                  aiReplyText = `🤖 Send some messages first so I can offer quick suggestions!`;
                } else {
                  aiReplyText = `💡 **CyberAI Quick Reply Suggestions** (Reply to: "${lastMsg.text}"):\n1. "Excellent point, I agree."\n2. "Can you elaborate on that?"\n3. "Let's schedule a call to resolve this."`;
                }
              } 
              else {
                aiReplyText = `🤖 I am CyberAI, your collaborative workspace assistant. Type \`@ai help\` to view available triggers!`;
              }

              const aiMessage = new Message({
                id: `msg_${uuidv4()}`,
                senderId: 'ai',
                roomId,
                text: aiReplyText,
                timestamp: new Date(),
                status: 'seen'
              });

              await aiMessage.save();
              io.to(roomId).emit(SOCKET_EVENTS.RECEIVE_MESSAGE, {
                ...aiMessage.toObject(),
                timestamp: aiMessage.timestamp.toISOString()
              });
              io.to(roomId).emit(SOCKET_EVENTS.TYPING_UPDATE, { roomId, senderId: 'ai', username: 'CyberAI', isTyping: false });
            }, 1200);
          }
        } 
        else if (recipientId) {
          // Direct message send
          const recipientSocketId = connectedUsers.get(recipientId);
          const senderSocketId = connectedUsers.get(senderId);

          const payload = {
            ...newMsg.toObject(),
            timestamp: newMsg.timestamp.toISOString()
          };

          if (senderSocketId) io.to(senderSocketId).emit(SOCKET_EVENTS.RECEIVE_MESSAGE, payload);
          if (recipientSocketId) io.to(recipientSocketId).emit(SOCKET_EVENTS.RECEIVE_MESSAGE, payload);
        }
      } catch (err) {
        console.error('Send message socket error:', err);
      }
    });

    // Vote Poll
    socket.on(SOCKET_EVENTS.VOTE_POLL, async ({ messageId, optionIndex, userId }) => {
      try {
        const msg = await Message.findOne({ id: messageId });
        if (!msg || !msg.isPoll || !msg.pollData) return;

        const options = msg.pollData.options;
        if (optionIndex < 0 || optionIndex >= options.length) return;

        options.forEach((opt, idx) => {
          if (idx === optionIndex) {
            if (opt.votes.includes(userId)) {
              opt.votes = opt.votes.filter(id => id !== userId);
            } else {
              opt.votes.push(userId);
            }
          } else {
            opt.votes = opt.votes.filter(id => id !== userId);
          }
        });

        // Mark pollData as modified so Mongoose updates the nested object
        msg.markModified('pollData');
        await msg.save();

        const payload = { messageId, pollData: msg.pollData };
        if (msg.roomId) {
          io.to(msg.roomId).emit('poll_updated', payload);
        } else {
          const recSocket = connectedUsers.get(msg.recipientId);
          const sndSocket = connectedUsers.get(msg.senderId);
          if (recSocket) io.to(recSocket).emit('poll_updated', payload);
          if (sndSocket) io.to(sndSocket).emit('poll_updated', payload);
        }
      } catch (e) {
        console.error(e);
      }
    });

    // Edit message
    socket.on(SOCKET_EVENTS.EDIT_MESSAGE, async ({ messageId, text, senderId }) => {
      try {
        const msg = await Message.findOne({ id: messageId });
        if (!msg || msg.senderId !== senderId || msg.deleted) return;

        msg.text = sanitizeText(text);
        msg.edited = true;
        await msg.save();

        const payload = {
          ...msg.toObject(),
          timestamp: msg.timestamp.toISOString()
        };

        if (msg.roomId) {
          io.to(msg.roomId).emit(SOCKET_EVENTS.EDIT_MESSAGE, payload);
          sendSystemNotification(msg.roomId, `${currentUser.username} edited a message`, { type: 'edit', actor: currentUser.username });
        } else {
          const recSocket = connectedUsers.get(msg.recipientId);
          const sndSocket = connectedUsers.get(msg.senderId);
          if (recSocket) io.to(recSocket).emit(SOCKET_EVENTS.EDIT_MESSAGE, payload);
          if (sndSocket) io.to(sndSocket).emit(SOCKET_EVENTS.EDIT_MESSAGE, payload);
        }
      } catch (e) {
        console.error(e);
      }
    });

    // View-once seen & destroyed
    socket.on('view_once_message_seen', async ({ messageId }) => {
      try {
        const msg = await Message.findOne({ id: messageId });
        if (msg && msg.viewOnce) {
          await Message.deleteOne({ id: messageId });
          
          const deletePayload = {
            id: messageId,
            roomId: msg.roomId,
            senderId: msg.senderId,
            recipientId: msg.recipientId,
            viewOnce: true
          };

          if (msg.roomId) {
            io.to(msg.roomId).emit(SOCKET_EVENTS.DELETE_MESSAGE, deletePayload);
          } else {
            const recSocket = connectedUsers.get(msg.recipientId);
            const sndSocket = connectedUsers.get(msg.senderId);
            if (recSocket) io.to(recSocket).emit(SOCKET_EVENTS.DELETE_MESSAGE, deletePayload);
            if (sndSocket) io.to(sndSocket).emit(SOCKET_EVENTS.DELETE_MESSAGE, deletePayload);
          }
          logActivity('MSG_VIEW_ONCE_DESTROY', `View-once message ${messageId} destroyed after reading`);
        }
      } catch (err) {
        console.error('Error handling view once message destruction:', err);
      }
    });

    // Delete message
    socket.on(SOCKET_EVENTS.DELETE_MESSAGE, async ({ messageId, senderId }) => {
      try {
        const msg = await Message.findOne({ id: messageId });
        if (!msg) return;

        // Verify authority
        const senderProfile = await User.findOne({ userId: senderId });
        const adminProfile = await Admin.findOne({ adminId: senderId });
        
        let hasAuthority = (msg.senderId === senderId) || (adminProfile) || (senderProfile && senderProfile.isAdmin);

        if (msg.roomId && !hasAuthority) {
          const room = await Room.findOne({ id: msg.roomId });
          if (room && room.creatorId === senderId) hasAuthority = true;
        }

        if (!hasAuthority) return;

        msg.deleted = true;
        msg.text = "This message was deleted";
        msg.mediaUrl = null;
        msg.mediaType = null;
        msg.mediaName = null;
        await msg.save();

        const payload = {
          ...msg.toObject(),
          timestamp: msg.timestamp.toISOString()
        };

        if (msg.roomId) {
          io.to(msg.roomId).emit(SOCKET_EVENTS.DELETE_MESSAGE, payload);
          sendSystemNotification(msg.roomId, `${currentUser.username} deleted a message`, { type: 'delete', actor: currentUser.username });
        } else {
          const recSocket = connectedUsers.get(msg.recipientId);
          const sndSocket = connectedUsers.get(msg.senderId);
          if (recSocket) io.to(recSocket).emit(SOCKET_EVENTS.DELETE_MESSAGE, payload);
          if (sndSocket) io.to(sndSocket).emit(SOCKET_EVENTS.DELETE_MESSAGE, payload);
        }

        logActivity('MSG_DELETE', `Message ${messageId} deleted by ${currentUser.username}`);
      } catch (e) {
        console.error(e);
      }
    });

    // Clear whole chat history
    socket.on('clear_chat_history', async ({ roomId, recipientId, senderId }) => {
      try {
        let query = {};
        if (roomId) {
          query = { roomId };
        } else if (recipientId && senderId) {
          query = {
            $or: [
              { senderId, recipientId, roomId: null },
              { senderId: recipientId, recipientId: senderId, roomId: null }
            ]
          };
        } else {
          return;
        }

        await Message.deleteMany(query);

        if (roomId) {
          io.to(roomId).emit('chat_cleared', { roomId });
          sendSystemNotification(roomId, `Chat history was cleared by ${currentUser.username}`, { type: 'delete' });
        } else {
          const recSocket = connectedUsers.get(recipientId);
          const sndSocket = connectedUsers.get(senderId);
          if (recSocket) io.to(recSocket).emit('chat_cleared', { roomId: null, recipientId: senderId, senderId: recipientId });
          if (sndSocket) io.to(sndSocket).emit('chat_cleared', { roomId: null, recipientId, senderId });
        }

        logActivity('CHAT_CLEAR', `Chat history cleared by ${currentUser.username}`);
      } catch (err) {
        console.error('Clear chat history error:', err);
      }
    });

    // Delete selected messages (Bulk)
    socket.on('delete_messages_bulk', async ({ messageIds, senderId }) => {
      try {
        if (!Array.isArray(messageIds) || messageIds.length === 0) return;

        const msgs = await Message.find({ id: { $in: messageIds } });
        if (msgs.length === 0) return;

        const senderProfile = await User.findOne({ userId: senderId });
        const adminProfile = await Admin.findOne({ adminId: senderId });
        const isAdmin = adminProfile || (senderProfile && senderProfile.isAdmin);

        const roomsToNotify = new Set();
        const dmsToNotify = new Set();
        const deletedIds = [];

        for (const msg of msgs) {
          let hasAuthority = (msg.senderId === senderId) || isAdmin;
          if (msg.roomId && !hasAuthority) {
            const room = await Room.findOne({ id: msg.roomId });
            if (room && room.creatorId === senderId) hasAuthority = true;
          }

          if (hasAuthority) {
            msg.deleted = true;
            msg.text = "This message was deleted";
            msg.mediaUrl = null;
            msg.mediaType = null;
            msg.mediaName = null;
            msg.reactions = {};
            await msg.save();
            deletedIds.push(msg.id);

            if (msg.roomId) {
              roomsToNotify.add(msg.roomId);
            } else {
              dmsToNotify.add(msg.senderId);
              dmsToNotify.add(msg.recipientId);
            }
          }
        }

        if (deletedIds.length > 0) {
          roomsToNotify.forEach(rId => {
            io.to(rId).emit('messages_deleted_bulk', { messageIds: deletedIds });
          });
          dmsToNotify.forEach(pId => {
            const sId = connectedUsers.get(pId);
            if (sId) {
              io.to(sId).emit('messages_deleted_bulk', { messageIds: deletedIds });
            }
          });
          logActivity('MSG_DELETE_BULK', `${deletedIds.length} messages deleted bulk by ${currentUser.username}`);
        }
      } catch (err) {
        console.error('Bulk message deletion error:', err);
      }
    });

    // Change Password
    socket.on('change_password', async ({ currentPassword, newPassword }) => {
      try {
        const bcrypt = require('bcryptjs');
        const profile = await User.findOne({ userId: currentUserId });
        if (!profile) {
          socket.emit('change_password_response', { success: false, error: 'User profile not found' });
          return;
        }

        const matches = await bcrypt.compare(currentPassword, profile.password);
        if (!matches) {
          socket.emit('change_password_response', { success: false, error: 'Incorrect current password' });
          return;
        }

        const hashed = await bcrypt.hash(newPassword, 10);
        profile.password = hashed;
        await profile.save();

        socket.emit('change_password_response', { success: true });
        logActivity('SECURITY_EDIT', `${profile.username} successfully updated credentials`);
      } catch (err) {
        console.error(err);
        socket.emit('change_password_response', { success: false, error: 'Internal system error' });
      }
    });

    // Delete Account
    socket.on('delete_account', async ({ password }) => {
      try {
        const bcrypt = require('bcryptjs');
        const profile = await User.findOne({ userId: currentUserId });
        if (!profile) {
          socket.emit('delete_account_response', { success: false, error: 'User profile not found' });
          return;
        }

        const matches = await bcrypt.compare(password, profile.password);
        if (!matches) {
          socket.emit('delete_account_response', { success: false, error: 'Incorrect confirmation password' });
          return;
        }

        // Delete all messages sent by this user
        await Message.deleteMany({ senderId: currentUserId });
        // Delete all rooms created by this user
        await Room.deleteMany({ creatorId: currentUserId });
        // Remove from members list in other rooms
        await Room.updateMany({ members: currentUserId }, { $pull: { members: currentUserId, admins: currentUserId } });
        // Delete notifications
        await Notification.deleteMany({ userId: currentUserId });
        // Delete user report history
        await Report.deleteMany({ reportedUserId: currentUserId });
        
        // Delete user document
        await User.deleteOne({ userId: currentUserId });

        socket.emit('delete_account_response', { success: true });
        logActivity('USER_DELETE', `${profile.username} permanently deleted account`);
        
        socket.disconnect(true);
      } catch (err) {
        console.error(err);
        socket.emit('delete_account_response', { success: false, error: 'Internal server error' });
      }
    });

    // Pin message
    socket.on(SOCKET_EVENTS.PIN_MESSAGE, async ({ messageId, pinned }) => {
      try {
        const msg = await Message.findOne({ id: messageId });
        if (!msg) return;

        msg.pinned = !!pinned;
        await msg.save();

        const payload = {
          ...msg.toObject(),
          timestamp: msg.timestamp.toISOString()
        };

        if (msg.roomId) {
          io.to(msg.roomId).emit(SOCKET_EVENTS.PIN_MESSAGE, payload);
        } else {
          const recSocket = connectedUsers.get(msg.recipientId);
          const sndSocket = connectedUsers.get(msg.senderId);
          if (recSocket) io.to(recSocket).emit(SOCKET_EVENTS.PIN_MESSAGE, payload);
          if (sndSocket) io.to(sndSocket).emit(SOCKET_EVENTS.PIN_MESSAGE, payload);
        }
      } catch (e) {
        console.error(e);
      }
    });

    // Ticks receipts delivered status
    socket.on(SOCKET_EVENTS.MESSAGE_DELIVERED, async ({ messageId }) => {
      try {
        const msg = await Message.findOne({ id: messageId });
        if (msg && msg.status === 'sent') {
          msg.status = 'delivered';
          await msg.save();

          const target = msg.roomId || connectedUsers.get(msg.senderId);
          if (target) {
            io.to(target).emit(SOCKET_EVENTS.MESSAGE_DELIVERED, { messageId, status: 'delivered' });
          }
        }
      } catch (e) {
        console.error(e);
      }
    });

    // Ticks receipts seen status
    socket.on(SOCKET_EVENTS.MESSAGE_SEEN, async ({ messageId }) => {
      try {
        const msg = await Message.findOne({ id: messageId });
        if (msg && (msg.status === 'sent' || msg.status === 'delivered')) {
          msg.status = 'seen';
          await msg.save();

          const target = msg.roomId || connectedUsers.get(msg.senderId);
          if (target) {
            io.to(target).emit(SOCKET_EVENTS.MESSAGE_SEEN, { messageId, status: 'seen' });
          }
        }
      } catch (e) {
        console.error(e);
      }
    });

    // Message reactions
    socket.on(SOCKET_EVENTS.MESSAGE_REACT, async ({ messageId, emoji, username, action }) => {
      try {
        const msg = await Message.findOne({ id: messageId });
        if (!msg || msg.deleted) return;

        if (!msg.reactions) msg.reactions = {};
        const usersList = msg.reactions[emoji] || [];

        if (action === 'add') {
          if (!usersList.includes(username)) usersList.push(username);
        } else if (action === 'remove') {
          msg.reactions[emoji] = usersList.filter(name => name !== username);
        }

        if (usersList.length > 0) {
          msg.reactions[emoji] = usersList;
        } else {
          delete msg.reactions[emoji];
        }

        msg.markModified('reactions');
        await msg.save();

        if (msg.roomId) {
          io.to(msg.roomId).emit(SOCKET_EVENTS.MESSAGE_REACT, { messageId, reactions: msg.reactions });
        } else {
          const recSocket = connectedUsers.get(msg.recipientId);
          const sndSocket = connectedUsers.get(msg.senderId);
          if (recSocket) io.to(recSocket).emit(SOCKET_EVENTS.MESSAGE_REACT, { messageId, reactions: msg.reactions });
          if (sndSocket) io.to(sndSocket).emit(SOCKET_EVENTS.MESSAGE_REACT, { messageId, reactions: msg.reactions });
        }
      } catch (e) {
        console.error(e);
      }
    });

    // WebRTC calling signaling relay rules mapping
    socket.on(SOCKET_EVENTS.CALL_USER, async ({ to, offer, fromUser, isVideo, callId }) => {
      const recipientSocketId = connectedUsers.get(to);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit(SOCKET_EVENTS.CALL_USER, {
          from: currentUserId,
          fromUser,
          offer,
          isVideo,
          callId
        });
        logActivity('CALL_START', `Call signaling init between ${currentUserId} and ${to}`);

        // Notify target if they are not actively watching
        try {
          const notif = new Notification({
            id: `notif_${uuidv4().substring(0,10)}`,
            userId: to,
            type: 'call_incoming',
            title: `${isVideo ? 'Video' : 'Voice'} Call from ${currentUser.username}`,
            body: `${currentUser.username} is calling you.`,
            metadata: { callerId: currentUserId, callerName: currentUser.username, isVideo, callId }
          });
          await notif.save();
        } catch(e) { /* non-critical */ }
      } else {
        socket.emit(SOCKET_EVENTS.CALL_REJECTED, { reason: 'User offline' });
        // Save missed call record
        try {
          const missed = new CallHistory({
            id: callId || `call_${uuidv4().substring(0,10)}`,
            callerId: currentUserId,
            callerName: currentUser.username,
            receiverId: to,
            type: isVideo ? 'video' : 'audio',
            status: 'missed',
            startedAt: new Date(),
            endedAt: new Date()
          });
          await missed.save();
        } catch(e) { /* non-critical */ }
      }
    });

    socket.on(SOCKET_EVENTS.CALL_ACCEPTED, ({ to, answer }) => {
      const sId = connectedUsers.get(to);
      if (sId) {
        io.to(sId).emit(SOCKET_EVENTS.CALL_ACCEPTED, {
          from: currentUserId,
          answer
        });
        logActivity('CALL_CONNECT', `WebRTC Call active between ${currentUserId} and ${to}`);
      }
    });

    socket.on(SOCKET_EVENTS.CALL_REJECTED, async ({ to, callId }) => {
      const sId = connectedUsers.get(to);
      if (sId) io.to(sId).emit(SOCKET_EVENTS.CALL_REJECTED, { from: currentUserId });
      // Save declined call record
      try {
        const declined = new CallHistory({
          id: callId || `call_${uuidv4().substring(0,10)}`,
          callerId: to,
          receiverId: currentUserId,
          receiverName: currentUser.username,
          type: 'audio',
          status: 'declined',
          startedAt: new Date(),
          endedAt: new Date()
        });
        await declined.save();
      } catch(e) { /* non-critical */ }
    });

    socket.on(SOCKET_EVENTS.ICE_CANDIDATE, ({ to, candidate }) => {
      const sId = connectedUsers.get(to);
      if (sId) io.to(sId).emit(SOCKET_EVENTS.ICE_CANDIDATE, { from: currentUserId, candidate });
    });

    socket.on(SOCKET_EVENTS.END_CALL, async ({ to, callId, duration, type, recordingUrl }) => {
      const sId = connectedUsers.get(to);
      if (sId) {
        io.to(sId).emit(SOCKET_EVENTS.END_CALL, { from: currentUserId });
        logActivity('CALL_END', `WebRTC Call hangup between ${currentUserId} and ${to}`);
      }
      // Save call history
      try {
        const endedCall = new CallHistory({
          id: callId || `call_${uuidv4().substring(0,10)}`,
          callerId: currentUserId,
          callerName: currentUser.username,
          receiverId: to,
          type: type || 'audio',
          status: 'answered',
          duration: duration || 0,
          recordingUrl: recordingUrl || null,
          startedAt: new Date(Date.now() - (duration || 0) * 1000),
          endedAt: new Date()
        });
        await endedCall.save();
      } catch(e) { /* non-critical */ }
    });

    // Get call history for current user
    socket.on('get_call_history', async () => {
      try {
        const calls = await CallHistory.find({
          $or: [{ callerId: currentUserId }, { receiverId: currentUserId }]
        }).sort({ startedAt: -1 }).limit(50);
        socket.emit('call_history', { calls });
      } catch(e) {
        console.error('get_call_history error:', e);
      }
    });

    // Admin Dashboard Operations (restricted to Admin roles or users marked as Admin)
    socket.on(SOCKET_EVENTS.ADMIN_KICK_USER, async ({ roomId, targetUserId, adminId }) => {
      try {
        const adminProfile = await Admin.findOne({ adminId });
        const userProfile = await User.findOne({ userId: adminId });
        const room = await Room.findOne({ id: roomId });

        if (!room || (!adminProfile && (!userProfile || !userProfile.isAdmin))) return;

        room.members = room.members.filter(id => id !== targetUserId);
        room.admins = room.admins.filter(id => id !== targetUserId);
        await room.save();

        broadcastRoomList();
        
        const targetUserObj = await User.findOne({ userId: targetUserId });
        if (targetUserObj) {
          sendSystemNotification(roomId, `${targetUserObj.username} was kicked by an Administrator`, { type: 'kick', actor: targetUserObj.username });
          
          const targetSocketId = connectedUsers.get(targetUserId);
          if (targetSocketId) {
            io.to(targetSocketId).emit('kicked_from_room', { roomId, roomName: room.name });
            
            // Disconnect socket from group room channel
            const targetSocket = io.sockets.sockets.get(targetSocketId);
            if (targetSocket) targetSocket.leave(roomId);
          }
          logActivity('USER_KICK', `${targetUserObj.username} kicked from room "${room.name}" by admin`);
        }
      } catch (err) {
        console.error(err);
      }
    });

    socket.on(SOCKET_EVENTS.ADMIN_BAN_USER, async ({ targetUserId, adminId }) => {
      try {
        const adminProfile = await Admin.findOne({ adminId });
        const userProfile = await User.findOne({ userId: adminId });
        if (!adminProfile && (!userProfile || !userProfile.isAdmin)) return;

        // Set suspend status in User model
        const targetUserObj = await User.findOne({ userId: targetUserId });
        if (targetUserObj) {
          targetUserObj.isSuspended = true;
          targetUserObj.status = 'offline';
          await targetUserObj.save();

          const targetSocketId = connectedUsers.get(targetUserId);
          if (targetSocketId) {
            io.to(targetSocketId).emit('banned_notification', { reason: 'You have been suspended from the workspace by an administrator.' });
            const targetSocket = io.sockets.sockets.get(targetSocketId);
            if (targetSocket) targetSocket.disconnect(true);
          }

          logActivity('USER_BAN', `User ${targetUserObj.username} banned globally by admin`);
          broadcastUserList();
        }
      } catch (err) {
        console.error(err);
      }
    });

    // Unban User
    socket.on('admin_unban_user', async ({ targetUserId, adminId }) => {
      try {
        const adminProfile = await Admin.findOne({ adminId });
        const userProfile = await User.findOne({ userId: adminId });
        if (!adminProfile && (!userProfile || !userProfile.isAdmin)) return;

        const targetUserObj = await User.findOne({ userId: targetUserId });
        if (targetUserObj) {
          targetUserObj.isSuspended = false;
          await targetUserObj.save();

          logActivity('USER_UNBAN', `User ${targetUserObj.username} unbanned globally by admin`);
          broadcastUserList();
        }
      } catch (err) {
        console.error(err);
      }
    });

    socket.on(SOCKET_EVENTS.ADMIN_MUTE_USER, async ({ targetUserId, adminId, isMuted }) => {
      try {
        const adminProfile = await Admin.findOne({ adminId });
        const userProfile = await User.findOne({ userId: adminId });
        if (!adminProfile && (!userProfile || !userProfile.isAdmin)) return;

        const targetUserObj = await User.findOne({ userId: targetUserId });
        if (targetUserObj) {
          targetUserObj.isMutedGlobally = !!isMuted;
          await targetUserObj.save();

          const targetSocketId = connectedUsers.get(targetUserId);
          if (targetSocketId) {
            io.to(targetSocketId).emit('mute_status_update', { isMutedGlobally: targetUserObj.isMutedGlobally });
          }

          logActivity('USER_MUTE', `User ${targetUserObj.username} ${isMuted ? 'muted' : 'unmuted'} globally by admin`);
          broadcastUserList();
        }
      } catch (err) {
        console.error(err);
      }
    });

    // Admin Delete User
    socket.on('admin_delete_user', async ({ targetUserId, adminId }) => {
      try {
        const adminProfile = await Admin.findOne({ adminId });
        const userProfile = await User.findOne({ userId: adminId });
        if (!adminProfile && (!userProfile || !userProfile.isAdmin)) return;

        const targetUserObj = await User.findOne({ userId: targetUserId });
        if (targetUserObj) {
          await User.findOneAndDelete({ userId: targetUserId });

          // Kick them from all rooms
          const rooms = await Room.find({ members: targetUserId });
          for (const room of rooms) {
            room.members = room.members.filter(id => id !== targetUserId);
            room.admins = room.admins.filter(id => id !== targetUserId);
            await room.save();
          }

          const targetSocketId = connectedUsers.get(targetUserId);
          if (targetSocketId) {
            io.to(targetSocketId).emit('banned_notification', { reason: 'Your account was deleted by an administrator.' });
            const targetSocket = io.sockets.sockets.get(targetSocketId);
            if (targetSocket) targetSocket.disconnect(true);
          }

          logActivity('USER_DELETE', `User ${targetUserObj.username} deleted permanently by admin`);
          broadcastUserList();
          broadcastRoomList();
        }
      } catch (err) {
        console.error(err);
      }
    });

    // Admin Delete Room
    socket.on('admin_delete_room', async ({ roomId, adminId }) => {
      try {
        const adminProfile = await Admin.findOne({ adminId });
        const userProfile = await User.findOne({ userId: adminId });
        if (!adminProfile && (!userProfile || !userProfile.isAdmin)) return;

        const room = await Room.findOne({ id: roomId });
        if (room) {
          // Tell all clients in this room they are kicked/room deleted
          io.to(roomId).emit('room_deleted', { roomId, roomName: room.name });
          
          await Room.findOneAndDelete({ id: roomId });

          // Remove all messages in this room
          await Message.deleteMany({ roomId });

          logActivity('ROOM_DELETE', `Room "${room.name}" deleted permanently by admin`);
          broadcastRoomList();
        }
      } catch (err) {
        console.error(err);
      }
    });

    // Typing Activity
    socket.on(SOCKET_EVENTS.TYPING, ({ roomId, recipientId, isTyping, userId }) => {
      const target = roomId || connectedUsers.get(recipientId);
      if (target) {
        socket.to(target).emit(SOCKET_EVENTS.TYPING_UPDATE, {
          roomId,
          senderId: userId,
          username: currentUser.username,
          isTyping
        });
      }
    });

    // Block User direct message toggle
    socket.on(SOCKET_EVENTS.BLOCK_USER, async ({ userId, targetUserId, isBlocked }) => {
      try {
        if (currentUser.role !== 'user') return;
        const profile = await User.findOne({ userId });
        if (!profile) return;

        if (isBlocked) {
          if (!profile.blockedUsers.includes(targetUserId)) {
            profile.blockedUsers.push(targetUserId);
          }
        } else {
          profile.blockedUsers = profile.blockedUsers.filter(id => id !== targetUserId);
        }

        await profile.save();

        socket.emit(SOCKET_EVENTS.USER_LOGIN, {
          success: true,
          user: {
            id: profile.userId,
            username: profile.username,
            blockedUsers: profile.blockedUsers,
            mutedUsers: profile.mutedUsers,
            isAdmin: profile.isAdmin,
            isMutedGlobally: profile.isMutedGlobally,
            bio: profile.bio,
            statusMsg: profile.statusMsg,
            customThemeColor: profile.customThemeColor,
            lastSeenSetting: profile.lastSeenSetting,
            onlineVisibility: profile.onlineVisibility
          }
        });
        broadcastUserList();
      } catch (e) {
        console.error(e);
      }
    });

    // Mute user direct notifications toggle
    socket.on(SOCKET_EVENTS.MUTE_USER, async ({ userId, targetId, isMuted }) => {
      try {
        if (currentUser.role !== 'user') return;
        const profile = await User.findOne({ userId });
        if (!profile) return;

        if (isMuted) {
          if (!profile.mutedUsers.includes(targetId)) {
            profile.mutedUsers.push(targetId);
          }
        } else {
          profile.mutedUsers = profile.mutedUsers.filter(id => id !== targetId);
        }

        await profile.save();

        socket.emit(SOCKET_EVENTS.USER_LOGIN, {
          success: true,
          user: {
            id: profile.userId,
            username: profile.username,
            blockedUsers: profile.blockedUsers,
            mutedUsers: profile.mutedUsers,
            isAdmin: profile.isAdmin,
            isMutedGlobally: profile.isMutedGlobally,
            bio: profile.bio,
            statusMsg: profile.statusMsg,
            customThemeColor: profile.customThemeColor,
            lastSeenSetting: profile.lastSeenSetting,
            onlineVisibility: profile.onlineVisibility
          }
        });
        broadcastUserList();
      } catch (e) {
        console.error(e);
      }
    });

    // File report flag moderation
    socket.on(SOCKET_EVENTS.REPORT_USER, async ({ reporterId, reportedId, reason }) => {
      try {
        const newReport = new Report({
          id: `rep_${uuidv4().substring(0, 8)}`,
          reporterId,
          reportedId,
          reason: sanitizeText(reason),
          timestamp: new Date()
        });
        await newReport.save();

        logActivity('REPORT_FILE', `Report flags raised against user ${reportedId} by reporter ${reporterId}`);
        socket.emit('report_submitted', { success: true, reportedId });
      } catch (e) {
        console.error(e);
      }
    });

    // Mock Screenshot warnings alerts
    socket.on(SOCKET_EVENTS.REPORT_SCREENSHOT, async ({ roomId, recipientId, userId }) => {
      try {
        const alertPayload = {
          username: currentUser.username,
          roomId,
          recipientId,
          timestamp: new Date().toISOString()
        };

        logActivity('SCREENSHOT_REPORT', `Screenshot reported by ${currentUser.username} in active chat window`);

        if (roomId) {
          io.to(roomId).emit(SOCKET_EVENTS.SCREENSHOT_REPORTED, alertPayload);
          sendSystemNotification(roomId, `⚠️ Screenshot mock reported by ${currentUser.username} (Demo)`, { type: 'screenshot_warn' });
        } else if (recipientId) {
          const snd = connectedUsers.get(userId);
          const rec = connectedUsers.get(recipientId);
          if (snd) io.to(snd).emit(SOCKET_EVENTS.SCREENSHOT_REPORTED, alertPayload);
          if (rec) io.to(rec).emit(SOCKET_EVENTS.SCREENSHOT_REPORTED, alertPayload);
        }
      } catch (e) {
        console.error(e);
      }
    });

    // Send Contact Request
    socket.on('send_contact_request', async ({ senderId, targetUserId }) => {
      try {
        const sender = await User.findOne({ userId: senderId });
        const target = await User.findOne({ userId: targetUserId });

        if (!sender || !target) return;

        // Prevent duplicates
        if (!sender.sentRequests.includes(targetUserId)) {
          sender.sentRequests.push(targetUserId);
          await sender.save();
        }
        if (!target.receivedRequests.includes(senderId)) {
          target.receivedRequests.push(senderId);
          await target.save();
        }

        logActivity('CONTACT_REQ_SEND', `Contact request sent from ${sender.username} to ${target.username}`);
        await broadcastUserList();
      } catch (err) {
        console.error('send_contact_request error:', err);
      }
    });

    // Accept Contact Request
    socket.on('accept_contact_request', async ({ userId, targetUserId }) => {
      try {
        const user = await User.findOne({ userId });
        const target = await User.findOne({ userId: targetUserId });

        if (!user || !target) return;

        // Add to contacts
        if (!user.contacts.includes(targetUserId)) {
          user.contacts.push(targetUserId);
        }
        if (!target.contacts.includes(userId)) {
          target.contacts.push(userId);
        }

        // Clean up requests
        user.receivedRequests = user.receivedRequests.filter(id => id !== targetUserId);
        user.sentRequests = user.sentRequests.filter(id => id !== targetUserId);
        target.sentRequests = target.sentRequests.filter(id => id !== userId);
        target.receivedRequests = target.receivedRequests.filter(id => id !== userId);

        await user.save();
        await target.save();

        logActivity('CONTACT_REQ_ACCEPT', `Contact request accepted between ${user.username} and ${target.username}`);
        await broadcastUserList();
      } catch (err) {
        console.error('accept_contact_request error:', err);
      }
    });

    // Decline Contact Request
    socket.on('decline_contact_request', async ({ userId, targetUserId }) => {
      try {
        const user = await User.findOne({ userId });
        const target = await User.findOne({ userId: targetUserId });

        if (!user || !target) return;

        // Clean up requests
        user.receivedRequests = user.receivedRequests.filter(id => id !== targetUserId);
        target.sentRequests = target.sentRequests.filter(id => id !== userId);

        await user.save();
        await target.save();

        logActivity('CONTACT_REQ_DECLINE', `Contact request from ${target.username} declined by ${user.username}`);
        await broadcastUserList();
      } catch (err) {
        console.error('decline_contact_request error:', err);
      }
    });

    // Cancel Contact Request
    socket.on('cancel_contact_request', async ({ userId, targetUserId }) => {
      try {
        const user = await User.findOne({ userId });
        const target = await User.findOne({ userId: targetUserId });

        if (!user || !target) return;

        // Clean up requests
        user.sentRequests = user.sentRequests.filter(id => id !== targetUserId);
        target.receivedRequests = target.receivedRequests.filter(id => id !== userId);

        await user.save();
        await target.save();

        logActivity('CONTACT_REQ_CANCEL', `Contact request to ${target.username} cancelled by ${user.username}`);
        await broadcastUserList();
      } catch (err) {
        console.error('cancel_contact_request error:', err);
      }
    });

    // Remove Contact
    socket.on('remove_contact', async ({ userId, targetUserId }) => {
      try {
        const user = await User.findOne({ userId });
        const target = await User.findOne({ userId: targetUserId });

        if (!user || !target) return;

        user.contacts = user.contacts.filter(id => id !== targetUserId);
        target.contacts = target.contacts.filter(id => id !== userId);

        await user.save();
        await target.save();

        logActivity('CONTACT_REMOVE', `Contact ${target.username} removed by ${user.username}`);
        await broadcastUserList();
      } catch (err) {
        console.error('remove_contact error:', err);
      }
    });

    // ─── NEW FEATURES ─────────────────────────────────────────────────────────

    // Send disappearing message (with TTL)
    socket.on('send_disappearing_message', async (messageData) => {
      try {
        const { senderId, recipientId, roomId, text, mediaUrl, mediaType, mediaName, replyToId, timerSeconds } = messageData;
        if (!timerSeconds || timerSeconds <= 0) return;

        const senderProfile = await User.findOne({ userId: senderId });
        if (senderProfile && senderProfile.isMutedGlobally) return;

        const disappearsAt = new Date(Date.now() + timerSeconds * 1000);
        const newMsg = new Message({
          id: `msg_${uuidv4()}`,
          senderId, recipientId, roomId,
          text: sanitizeText(text),
          mediaUrl, mediaType, mediaName, replyToId,
          disappearsAt,
          timestamp: new Date(),
          status: 'sent'
        });
        await newMsg.save();

        const payload = { ...newMsg.toObject(), timestamp: newMsg.timestamp.toISOString(), disappearsAt: disappearsAt.toISOString() };
        if (roomId) {
          io.to(roomId).emit(SOCKET_EVENTS.RECEIVE_MESSAGE, payload);
        } else if (recipientId) {
          const recSock = connectedUsers.get(recipientId);
          const sndSock = connectedUsers.get(senderId);
          if (recSock) io.to(recSock).emit(SOCKET_EVENTS.RECEIVE_MESSAGE, payload);
          if (sndSock) io.to(sndSock).emit(SOCKET_EVENTS.RECEIVE_MESSAGE, payload);
        }
      } catch(e) { console.error('send_disappearing_message error:', e); }
    });

    // View-once message viewed
    socket.on('view_once_viewed', async ({ messageId }) => {
      try {
        const msg = await Message.findOne({ id: messageId });
        if (!msg || !msg.viewOnce) return;

        if (!msg.viewedBy.includes(currentUserId)) {
          msg.viewedBy.push(currentUserId);
          msg.markModified('viewedBy');
          await msg.save();
        }

        // After viewed, mark as deleted/consumed
        msg.deleted = true;
        msg.text = '📷 Photo viewed';
        msg.mediaUrl = null;
        await msg.save();

        const payload = { ...msg.toObject(), timestamp: msg.timestamp.toISOString() };
        if (msg.roomId) {
          io.to(msg.roomId).emit(SOCKET_EVENTS.DELETE_MESSAGE, payload);
        } else {
          const sndSock = connectedUsers.get(msg.senderId);
          const recSock = connectedUsers.get(msg.recipientId);
          if (sndSock) io.to(sndSock).emit(SOCKET_EVENTS.DELETE_MESSAGE, payload);
          if (recSock) io.to(recSock).emit(SOCKET_EVENTS.DELETE_MESSAGE, payload);
        }
      } catch(e) { console.error('view_once_viewed error:', e); }
    });

    // Forward message
    socket.on('forward_message', async ({ originalMessageId, targetRoomId, targetRecipientId }) => {
      try {
        const original = await Message.findOne({ id: originalMessageId });
        if (!original || original.deleted) return;

        const forwardedMsg = new Message({
          id: `msg_${uuidv4()}`,
          senderId: currentUserId,
          recipientId: targetRecipientId || null,
          roomId: targetRoomId || null,
          text: original.text,
          mediaUrl: original.mediaUrl,
          mediaType: original.mediaType,
          mediaName: original.mediaName,
          gifUrl: original.gifUrl,
          isForwarded: true,
          forwardedFrom: (await User.findOne({ userId: original.senderId }))?.username || 'Unknown',
          timestamp: new Date(),
          status: 'sent'
        });
        await forwardedMsg.save();

        const payload = { ...forwardedMsg.toObject(), timestamp: forwardedMsg.timestamp.toISOString() };
        if (targetRoomId) {
          io.to(targetRoomId).emit(SOCKET_EVENTS.RECEIVE_MESSAGE, payload);
        } else if (targetRecipientId) {
          const recSock = connectedUsers.get(targetRecipientId);
          const sndSock = connectedUsers.get(currentUserId);
          if (recSock) io.to(recSock).emit(SOCKET_EVENTS.RECEIVE_MESSAGE, payload);
          if (sndSock) io.to(sndSock).emit(SOCKET_EVENTS.RECEIVE_MESSAGE, payload);
        }
      } catch(e) { console.error('forward_message error:', e); }
    });

    // Secret chat message (ephemeral — NOT saved to DB)
    socket.on('secret_message', ({ recipientId, text, mediaUrl, mediaType }) => {
      try {
        const recSock = connectedUsers.get(recipientId);
        const sndSock = connectedUsers.get(currentUserId);
        const secretMsg = {
          id: `secret_${uuidv4().substring(0,8)}`,
          senderId: currentUserId,
          senderName: currentUser.username,
          recipientId,
          text,
          mediaUrl,
          mediaType,
          isSecret: true,
          timestamp: new Date().toISOString()
        };
        if (recSock) io.to(recSock).emit('secret_message', secretMsg);
        if (sndSock) io.to(sndSock).emit('secret_message', secretMsg);
      } catch(e) { console.error('secret_message error:', e); }
    });

    // Scheduled messages (emitted after a delay)
    socket.on('schedule_message', ({ delayMs, messageData }) => {
      try {
        const delay = Number(delayMs) || 5000;
        setTimeout(async () => {
          try {
            const { senderId, recipientId, roomId, text, mediaUrl, mediaType, mediaName } = messageData;
            
            const newMsg = new Message({
              id: `msg_${uuidv4()}`,
              senderId,
              recipientId,
              roomId,
              text: sanitizeText(text),
              mediaUrl,
              mediaType,
              mediaName,
              timestamp: new Date(),
              status: 'sent'
            });

            await newMsg.save();

            const payload = {
              ...newMsg.toObject(),
              timestamp: newMsg.timestamp.toISOString()
            };

            if (roomId) {
              io.to(roomId).emit(SOCKET_EVENTS.RECEIVE_MESSAGE, payload);
            } else if (recipientId) {
              const recipientSocketId = connectedUsers.get(recipientId);
              const senderSocketId = connectedUsers.get(senderId);
              if (senderSocketId) io.to(senderSocketId).emit(SOCKET_EVENTS.RECEIVE_MESSAGE, payload);
              if (recipientSocketId) io.to(recipientSocketId).emit(SOCKET_EVENTS.RECEIVE_MESSAGE, payload);
            }
            logActivity('MSG_SEND_SCHEDULED', `Scheduled message sent automatically after delay`);
          } catch (err) {
            console.error('Scheduled message delivery error:', err);
          }
        }, delay);
      } catch (e) {
        console.error('schedule_message error:', e);
      }
    });

    // Pin, Mute, or Archive a contact/chat room
    socket.on('toggle_chat_status', async ({ targetId, statusType, active }) => {
      try {
        const profile = await User.findOne({ userId: currentUserId });
        if (!profile) return;

        if (statusType === 'pin') {
          if (active) {
            if (!profile.pinnedChats.includes(targetId)) profile.pinnedChats.push(targetId);
          } else {
            profile.pinnedChats = profile.pinnedChats.filter(id => id !== targetId);
          }
        } else if (statusType === 'mute') {
          if (active) {
            if (!profile.mutedChats.includes(targetId)) profile.mutedChats.push(targetId);
          } else {
            profile.mutedChats = profile.mutedChats.filter(id => id !== targetId);
          }
        } else if (statusType === 'archive') {
          if (active) {
            if (!profile.archivedChats.includes(targetId)) profile.archivedChats.push(targetId);
          } else {
            profile.archivedChats = profile.archivedChats.filter(id => id !== targetId);
          }
        }

        await profile.save();

        socket.emit('chat_status_updated', {
          pinnedChats: profile.pinnedChats || [],
          mutedChats: profile.mutedChats || [],
          archivedChats: profile.archivedChats || []
        });

        broadcastUserList();
      } catch (err) {
        console.error('toggle_chat_status error:', err);
      }
    });

    // Update group settings
    socket.on('update_group_settings', async ({ roomId, name, description, icon, disappearingTimer }) => {
      try {
        const room = await Room.findOne({ id: roomId });
        if (!room) return;
        if (!room.admins.includes(currentUserId)) return;

        if (name) room.name = sanitizeText(name);
        if (description !== undefined) room.description = sanitizeText(description);
        if (icon) room.icon = sanitizeText(icon);
        if (disappearingTimer !== undefined) room.disappearingTimer = disappearingTimer;

        await room.save();
        broadcastRoomList();
        sendSystemNotification(roomId, `Group settings updated by ${currentUser.username}`, { type: 'settings_update' });
        logActivity('GROUP_SETTINGS', `Room "${room.name}" settings updated by ${currentUser.username}`);
      } catch(e) { console.error('update_group_settings error:', e); }
    });

    // Group announcement
    socket.on('group_announcement', async ({ roomId, text }) => {
      try {
        const room = await Room.findOne({ id: roomId });
        if (!room) return;
        if (!room.admins.includes(currentUserId) && !room.moderators.includes(currentUserId)) return;

        const announcement = {
          id: `ann_${uuidv4().substring(0,8)}`,
          authorId: currentUserId,
          text: sanitizeText(text),
          pinned: false,
          timestamp: new Date()
        };
        room.announcements = room.announcements || [];
        room.announcements.unshift(announcement);
        if (room.announcements.length > 20) room.announcements = room.announcements.slice(0, 20);
        await room.save();

        io.to(roomId).emit('group_announcement', { roomId, announcement });
        sendSystemNotification(roomId, `📢 Announcement: ${text.substring(0, 80)}`, { type: 'announcement', authorId: currentUserId });
        logActivity('GROUP_ANNOUNCEMENT', `Announcement posted in "${room.name}" by ${currentUser.username}`);
      } catch(e) { console.error('group_announcement error:', e); }
    });

    // Group event create
    socket.on('group_event_create', async ({ roomId, title, description, startTime, endTime }) => {
      try {
        const room = await Room.findOne({ id: roomId });
        if (!room || !room.members.includes(currentUserId)) return;

        const event = {
          id: `evt_${uuidv4().substring(0,8)}`,
          title: sanitizeText(title),
          description: sanitizeText(description || ''),
          startTime: new Date(startTime),
          endTime: endTime ? new Date(endTime) : null,
          creatorId: currentUserId,
          attendees: [currentUserId],
          timestamp: new Date()
        };
        room.events = room.events || [];
        room.events.push(event);
        await room.save();

        io.to(roomId).emit('group_event_created', { roomId, event });
        sendSystemNotification(roomId, `📅 New event: "${title}"`, { type: 'event', eventId: event.id });
      } catch(e) { console.error('group_event_create error:', e); }
    });

    // Group event RSVP (attend / unattend)
    socket.on('group_event_rsvp', async ({ roomId, eventId, attend }) => {
      try {
        const room = await Room.findOne({ id: roomId });
        if (!room) return;
        const event = room.events.find(e => e.id === eventId);
        if (!event) return;

        if (attend && !event.attendees.includes(currentUserId)) event.attendees.push(currentUserId);
        else if (!attend) event.attendees = event.attendees.filter(id => id !== currentUserId);

        room.markModified('events');
        await room.save();
        io.to(roomId).emit('group_event_updated', { roomId, event });
      } catch(e) { console.error('group_event_rsvp error:', e); }
    });

    // Remove member from group
    socket.on('remove_group_member', async ({ roomId, targetUserId }) => {
      try {
        const room = await Room.findOne({ id: roomId });
        if (!room) return;
        if (!room.admins.includes(currentUserId) && !room.moderators.includes(currentUserId)) return;
        if (room.creatorId === targetUserId) return; // cannot remove creator

        room.members = room.members.filter(id => id !== targetUserId);
        room.admins = room.admins.filter(id => id !== targetUserId);
        room.moderators = room.moderators.filter(id => id !== targetUserId);
        await room.save();

        const targetSock = connectedUsers.get(targetUserId);
        if (targetSock) {
          const ts = io.sockets.sockets.get(targetSock);
          if (ts) ts.leave(roomId);
          io.to(targetSock).emit('kicked_from_room', { roomId, roomName: room.name, reason: 'You were removed from this group.' });
        }

        broadcastRoomList();
        const target = await User.findOne({ userId: targetUserId });
        sendSystemNotification(roomId, `${target?.username || targetUserId} was removed from the group.`, { type: 'remove_member' });
        logActivity('GROUP_REMOVE_MEMBER', `${currentUser.username} removed ${targetUserId} from "${room.name}"`);
      } catch(e) { console.error('remove_group_member error:', e); }
    });

    // Update group member role (promote to moderator, demote to member)
    socket.on('update_member_role', async ({ roomId, targetUserId, role }) => {
      try {
        const room = await Room.findOne({ id: roomId });
        if (!room || !room.admins.includes(currentUserId)) return;

        // Update moderators list
        if (role === 'moderator' && !room.moderators.includes(targetUserId)) {
          room.moderators.push(targetUserId);
        } else if (role === 'member') {
          room.moderators = room.moderators.filter(id => id !== targetUserId);
          room.admins = room.admins.filter(id => id !== targetUserId);
        } else if (role === 'admin' && !room.admins.includes(targetUserId)) {
          room.admins.push(targetUserId);
        }

        // Update memberRoles subdoc
        const existingRole = room.memberRoles.find(mr => mr.userId === targetUserId);
        if (existingRole) existingRole.role = role;
        else room.memberRoles.push({ userId: targetUserId, role });
        room.markModified('memberRoles');

        await room.save();
        broadcastRoomList();
        const target = await User.findOne({ userId: targetUserId });
        sendSystemNotification(roomId, `${target?.username} was set as ${role}.`, { type: 'role_update' });
        logActivity('GROUP_ROLE_UPDATE', `${currentUser.username} set ${targetUserId} as ${role} in "${room.name}"`);
      } catch(e) { console.error('update_member_role error:', e); }
    });

    // Admin broadcast push (called after REST endpoint saves to DB)
    socket.on('admin_broadcast', async ({ title, body }) => {
      try {
        const adminProfile = await Admin.findOne({ adminId: currentUserId });
        if (!adminProfile) return;

        // Emit real-time notification to all connected users
        io.emit('broadcast_notification', {
          type: 'broadcast',
          title,
          body,
          timestamp: new Date().toISOString()
        });

        logActivity('BROADCAST', `Admin broadcast "${title}" pushed to all connected users.`);
      } catch(e) { console.error('admin_broadcast error:', e); }
    });

    // Login alert — emit to other sessions of same user
    socket.on('login_alert_ack', ({ loginIp }) => {
      // Acknowledge login alert from client side
      socket.emit('login_alert_ack', { acknowledged: true, ip: loginIp });
    });

    // @mention notification in group
    socket.on('mention_notification', async ({ mentionedUserId, roomId, senderName, messagePreview }) => {
      try {
        const mentionSock = connectedUsers.get(mentionedUserId);
        const notifPayload = {
          type: 'mention',
          title: `${senderName} mentioned you`,
          body: messagePreview,
          metadata: { roomId, senderId: currentUserId }
        };

        if (mentionSock) io.to(mentionSock).emit('mention_notification', notifPayload);

        // Save to DB
        const notif = new Notification({
          id: `notif_${uuidv4().substring(0,10)}`,
          userId: mentionedUserId,
          type: 'mention',
          title: `${senderName} mentioned you`,
          body: messagePreview,
          metadata: { roomId, senderId: currentUserId }
        });
        await notif.save();
      } catch(e) { console.error('mention_notification error:', e); }
    });

    // Login alert — push to user's other active sessions
    socket.on('push_login_alert', async ({ userId, ip, userAgent }) => {
      try {
        const sockId = connectedUsers.get(userId);
        if (sockId && sockId !== socket.id) {
          io.to(sockId).emit('login_alert', { ip, userAgent, timestamp: new Date().toISOString() });
        }
        const notif = new Notification({
          id: `notif_${uuidv4().substring(0,10)}`,
          userId,
          type: 'login_alert',
          title: 'New Login Detected',
          body: `A new login was detected from IP: ${ip}`,
          metadata: { ip, userAgent }
        });
        await notif.save();
      } catch(e) { console.error('push_login_alert error:', e); }
    });

    // ─── END NEW FEATURES ─────────────────────────────────────────────────────

    // Disconnect Handle
    socket.on('disconnect', async () => {
      try {
        if (currentUserId && connectedUsers.get(currentUserId) === socket.id) {
          // Set offline status in DB for User
          if (currentUser.role === 'user') {
            const profile = await User.findOne({ userId: currentUserId });
            if (profile) {
              profile.status = 'offline';
              profile.lastSeen = new Date();
              await profile.save();

              const defaultRooms = await Room.find({ creatorId: 'system' });
              for (const room of defaultRooms) {
                sendSystemNotification(room.id, `${currentUser.username} left Cyber Chat`, { type: 'leave', actor: currentUser.username });
              }
            }
          }

          connectedUsers.delete(currentUserId);
          logActivity('USER_LEAVE', `${currentUser.username} signed off`);

          io.emit(SOCKET_EVENTS.TYPING_UPDATE, {
            senderId: currentUserId,
            isTyping: false
          });

          broadcastUserList();
          broadcastRoomList();
        }
      } catch (e) {
        console.error('Disconnect Socket Error:', e);
      }
    });
  });
};
