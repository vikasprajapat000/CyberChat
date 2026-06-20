const { v4: uuidv4 } = require('uuid');
const { SOCKET_EVENTS, DEFAULT_ROOMS } = require('../shared/constants.json');
const User = require('./models/User');
const Admin = require('./models/Admin');
const Room = require('./models/Room');
const Message = require('./models/Message');
const Report = require('./models/Report');
const Log = require('./models/Log');

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
          customThemeColor: u.customThemeColor,
          lastSeenSetting: u.lastSeenSetting,
          onlineVisibility: u.onlineVisibility,
          contacts: u.contacts || [],
          sentRequests: u.sentRequests || [],
          receivedRequests: u.receivedRequests || []
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
            customThemeColor: currentUser.role === 'user' ? profile.customThemeColor : '#00a884',
            lastSeenSetting: currentUser.role === 'user' ? profile.lastSeenSetting : 'everyone',
            onlineVisibility: currentUser.role === 'user' ? profile.onlineVisibility : 'visible',
            contacts: currentUser.role === 'user' ? (profile.contacts || []) : [],
            sentRequests: currentUser.role === 'user' ? (profile.sentRequests || []) : [],
            receivedRequests: currentUser.role === 'user' ? (profile.receivedRequests || []) : []
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
    socket.on('edit_profile', async ({ username, bio, statusMsg, customThemeColor, lastSeenSetting, onlineVisibility }) => {
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

        await profile.save();

        socket.emit('profile_updated', {
          user: {
            id: profile.userId,
            username: profile.username,
            bio: profile.bio,
            statusMsg: profile.statusMsg,
            customThemeColor: profile.customThemeColor,
            lastSeenSetting: profile.lastSeenSetting,
            onlineVisibility: profile.onlineVisibility
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
        const { senderId, recipientId, roomId, text, mediaUrl, mediaType, mediaName, replyToId, isPoll, pollData } = messageData;

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
    socket.on(SOCKET_EVENTS.CALL_USER, ({ to, offer, fromUser, isVideo }) => {
      const recipientSocketId = connectedUsers.get(to);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit(SOCKET_EVENTS.CALL_USER, {
          from: currentUserId,
          fromUser,
          offer,
          isVideo
        });
        logActivity('CALL_START', `Call signaling init between ${currentUserId} and ${to}`);
      } else {
        socket.emit(SOCKET_EVENTS.CALL_REJECTED, { reason: 'User offline' });
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

    socket.on(SOCKET_EVENTS.CALL_REJECTED, ({ to }) => {
      const sId = connectedUsers.get(to);
      if (sId) io.to(sId).emit(SOCKET_EVENTS.CALL_REJECTED, { from: currentUserId });
    });

    socket.on(SOCKET_EVENTS.ICE_CANDIDATE, ({ to, candidate }) => {
      const sId = connectedUsers.get(to);
      if (sId) io.to(sId).emit(SOCKET_EVENTS.ICE_CANDIDATE, { from: currentUserId, candidate });
    });

    socket.on(SOCKET_EVENTS.END_CALL, ({ to }) => {
      const sId = connectedUsers.get(to);
      if (sId) {
        io.to(sId).emit(SOCKET_EVENTS.END_CALL, { from: currentUserId });
        logActivity('CALL_END', `WebRTC Call hangup between ${currentUserId} and ${to}`);
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
