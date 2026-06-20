const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { verifyToken } = require('./auth');

// GET /api/notifications — get user's notifications (latest 50)
router.get('/', verifyToken, async (req, res) => {
  try {
    const { id, role } = req.user;
    if (role !== 'user') return res.status(403).json({ error: 'Not allowed' });

    const notifications = await Notification.find({ userId: id })
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({ userId: id, read: false });

    res.json({
      success: true,
      notifications: notifications.map(n => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        read: n.read,
        metadata: n.metadata,
        createdAt: n.createdAt
      })),
      unreadCount
    });
  } catch (error) {
    console.error('Get Notifications Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PATCH /api/notifications/:id/read — mark single notification as read
router.patch('/:id/read', verifyToken, async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    if (role !== 'user') return res.status(403).json({ error: 'Not allowed' });

    await Notification.updateOne(
      { id: req.params.id, userId },
      { $set: { read: true } }
    );

    res.json({ success: true, message: 'Notification marked as read.' });
  } catch (error) {
    console.error('Mark Read Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// PATCH /api/notifications/mark-all-read — mark all as read
router.patch('/mark-all-read', verifyToken, async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    if (role !== 'user') return res.status(403).json({ error: 'Not allowed' });

    await Notification.updateMany({ userId, read: false }, { $set: { read: true } });
    res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (error) {
    console.error('Mark All Read Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// DELETE /api/notifications/clear — delete all notifications for user
router.delete('/clear', verifyToken, async (req, res) => {
  try {
    const { id: userId, role } = req.user;
    if (role !== 'user') return res.status(403).json({ error: 'Not allowed' });

    await Notification.deleteMany({ userId });
    res.json({ success: true, message: 'All notifications cleared.' });
  } catch (error) {
    console.error('Clear Notifications Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
