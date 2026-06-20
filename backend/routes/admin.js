const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const Admin = require('../models/Admin');
const Message = require('../models/Message');
const Room = require('../models/Room');
const Report = require('../models/Report');
const Log = require('../models/Log');
const Notification = require('../models/Notification');
const CallHistory = require('../models/CallHistory');
const { verifyToken } = require('./auth');

// Admin-only middleware
const adminOnly = async (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// ─── USER MANAGEMENT ─────────────────────────────────────────────────────────

// GET /api/admin/users — list all users
router.get('/users', verifyToken, adminOnly, async (req, res) => {
  try {
    const users = await User.find({}).sort({ createdAt: -1 });
    res.json({
      success: true,
      users: users.map(u => ({
        id: u.userId,
        username: u.username,
        email: u.email,
        bio: u.bio,
        profilePhoto: u.profilePhoto,
        status: u.status,
        isSuspended: u.isSuspended,
        isBanned: u.isBanned,
        isMutedGlobally: u.isMutedGlobally,
        reportCount: u.reportCount || 0,
        createdAt: u.createdAt
      }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/admin/users/:id/ban
router.post('/users/:id/ban', verifyToken, adminOnly, async (req, res) => {
  try {
    const user = await User.findOneAndUpdate(
      { userId: req.params.id },
      { isBanned: true, isSuspended: true },
      { new: true }
    );
    if (!user) return res.status(404).json({ error: 'User not found' });

    const logEntry = new Log({
      id: `log_${uuidv4().substring(0, 8)}`,
      type: 'USER_BAN',
      detail: `User "${user.username}" was permanently banned by admin.`,
      timestamp: new Date()
    });
    await logEntry.save();

    res.json({ success: true, message: `User ${user.username} has been banned.` });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/admin/users/:id/unban
router.post('/users/:id/unban', verifyToken, adminOnly, async (req, res) => {
  try {
    const user = await User.findOneAndUpdate(
      { userId: req.params.id },
      { isBanned: false, isSuspended: false },
      { new: true }
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true, message: `User ${user.username} has been unbanned.` });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/admin/users/:id/suspend
router.post('/users/:id/suspend', verifyToken, adminOnly, async (req, res) => {
  try {
    const user = await User.findOneAndUpdate(
      { userId: req.params.id },
      { isSuspended: true },
      { new: true }
    );
    if (!user) return res.status(404).json({ error: 'User not found' });

    const logEntry = new Log({
      id: `log_${uuidv4().substring(0, 8)}`,
      type: 'USER_SUSPEND',
      detail: `User "${user.username}" was suspended.`,
      timestamp: new Date()
    });
    await logEntry.save();

    res.json({ success: true, message: `User ${user.username} has been suspended.` });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// DELETE /api/admin/users/:id — delete user
router.delete('/users/:id', verifyToken, adminOnly, async (req, res) => {
  try {
    const user = await User.findOneAndDelete({ userId: req.params.id });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Clean up their messages
    await Message.updateMany({ senderId: req.params.id }, { deleted: true, text: '[Account Deleted]' });

    const logEntry = new Log({
      id: `log_${uuidv4().substring(0, 8)}`,
      type: 'USER_DELETE',
      detail: `User "${user.username}" account permanently deleted.`,
      timestamp: new Date()
    });
    await logEntry.save();

    res.json({ success: true, message: `User ${user.username} permanently deleted.` });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/admin/users/:id/mute — global mute
router.post('/users/:id/mute', verifyToken, adminOnly, async (req, res) => {
  try {
    const user = await User.findOneAndUpdate(
      { userId: req.params.id },
      { isMutedGlobally: true },
      { new: true }
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true, message: `User ${user.username} has been globally muted.` });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/admin/users/:id/unmute
router.post('/users/:id/unmute', verifyToken, adminOnly, async (req, res) => {
  try {
    const user = await User.findOneAndUpdate(
      { userId: req.params.id },
      { isMutedGlobally: false },
      { new: true }
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true, message: `User ${user.username} has been unmuted.` });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ─── REPORTS ─────────────────────────────────────────────────────────────────

// GET /api/admin/reports
router.get('/reports', verifyToken, adminOnly, async (req, res) => {
  try {
    const reports = await Report.find({}).sort({ timestamp: -1 }).limit(200);
    res.json({ success: true, reports });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PATCH /api/admin/reports/:id/resolve
router.patch('/reports/:id/resolve', verifyToken, adminOnly, async (req, res) => {
  try {
    const report = await Report.findOneAndUpdate(
      { id: req.params.id },
      { resolved: true, resolvedAt: new Date() },
      { new: true }
    );
    if (!report) return res.status(404).json({ error: 'Report not found' });
    res.json({ success: true, message: 'Report resolved.' });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ─── CONTENT MODERATION ──────────────────────────────────────────────────────

// GET /api/admin/messages/flagged — get reported messages
router.get('/messages/flagged', verifyToken, adminOnly, async (req, res) => {
  try {
    // Get reports that reference a messageId
    const msgReports = await Report.find({ messageId: { $ne: null } }).sort({ timestamp: -1 }).limit(100);
    const messageIds = [...new Set(msgReports.map(r => r.messageId))];
    const messages = await Message.find({ id: { $in: messageIds } });

    res.json({ success: true, messages, reports: msgReports });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// DELETE /api/admin/messages/:id — admin delete a message
router.delete('/messages/:id', verifyToken, adminOnly, async (req, res) => {
  try {
    await Message.updateOne(
      { id: req.params.id },
      { deleted: true, text: '[Removed by Administrator]' }
    );
    res.json({ success: true, message: 'Message removed.' });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ─── STORAGE MANAGEMENT ──────────────────────────────────────────────────────

// GET /api/admin/storage — list uploaded files
router.get('/storage', verifyToken, adminOnly, async (req, res) => {
  try {
    const uploadsDir = path.join(__dirname, '../public/uploads');
    if (!fs.existsSync(uploadsDir)) {
      return res.json({ success: true, files: [], totalSize: 0 });
    }

    const fileNames = fs.readdirSync(uploadsDir);
    let totalSize = 0;
    const files = fileNames.map(name => {
      const fullPath = path.join(uploadsDir, name);
      const stat = fs.statSync(fullPath);
      totalSize += stat.size;
      return {
        name,
        size: stat.size,
        createdAt: stat.birthtime,
        url: `/uploads/${name}`
      };
    });

    files.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({ success: true, files, totalSize, count: files.length });
  } catch (error) {
    console.error('Storage List Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// DELETE /api/admin/storage/:filename
router.delete('/storage/:filename', verifyToken, adminOnly, async (req, res) => {
  try {
    const filename = path.basename(req.params.filename); // prevent path traversal
    const filePath = path.join(__dirname, '../public/uploads', filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    fs.unlinkSync(filePath);

    const logEntry = new Log({
      id: `log_${uuidv4().substring(0, 8)}`,
      type: 'FILE_DELETE',
      detail: `File "${filename}" deleted by admin.`,
      timestamp: new Date()
    });
    await logEntry.save();

    res.json({ success: true, message: `File ${filename} deleted.` });
  } catch (error) {
    console.error('Storage Delete Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ─── SYSTEM LOGS ─────────────────────────────────────────────────────────────

// GET /api/admin/logs
router.get('/logs', verifyToken, adminOnly, async (req, res) => {
  try {
    const { type, limit = 100, skip = 0 } = req.query;
    const query = type ? { type } : {};

    const logs = await Log.find(query)
      .sort({ timestamp: -1 })
      .skip(Number(skip))
      .limit(Number(limit));

    const total = await Log.countDocuments(query);

    res.json({
      success: true,
      logs: logs.map(l => ({
        id: l.id,
        type: l.type,
        detail: l.detail,
        timestamp: l.timestamp
      })),
      total
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ─── BROADCAST NOTIFICATION ───────────────────────────────────────────────────

// POST /api/admin/broadcast — save to DB, socket emission done in socketHandler
router.post('/broadcast', verifyToken, adminOnly, async (req, res) => {
  try {
    const { title, body } = req.body;
    if (!title || !body) return res.status(400).json({ error: 'Title and body required' });

    // Create a notification for every user
    const allUsers = await User.find({}, 'userId');
    const notifDocs = allUsers.map(u => ({
      id: `notif_${uuidv4().substring(0, 10)}`,
      userId: u.userId,
      type: 'broadcast',
      title,
      body,
      metadata: { adminId: req.user.id }
    }));

    await Notification.insertMany(notifDocs);

    const logEntry = new Log({
      id: `log_${uuidv4().substring(0, 8)}`,
      type: 'BROADCAST',
      detail: `Admin broadcast: "${title}"`,
      timestamp: new Date()
    });
    await logEntry.save();

    res.json({ success: true, message: `Broadcast sent to ${allUsers.length} users.`, notifCount: allUsers.length });
  } catch (error) {
    console.error('Broadcast Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ─── ANALYTICS ───────────────────────────────────────────────────────────────

// GET /api/admin/analytics
router.get('/analytics', verifyToken, adminOnly, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({});
    const totalMessages = await Message.countDocuments({ senderId: { $ne: 'system' } });
    const totalRooms = await Room.countDocuments({});
    const totalCalls = await CallHistory.countDocuments({});
    const onlineUsers = await User.countDocuments({ status: 'online' });
    const suspendedUsers = await User.countDocuments({ isSuspended: true });
    const bannedUsers = await User.countDocuments({ isBanned: true });
    const recentLogs = await Log.find({}).sort({ timestamp: -1 }).limit(50);

    res.json({
      success: true,
      analytics: {
        totalUsers,
        totalMessages,
        totalRooms,
        totalCalls,
        onlineUsers,
        suspendedUsers,
        bannedUsers,
        recentLogs
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
