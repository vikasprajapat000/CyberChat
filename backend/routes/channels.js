const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const Channel = require('../models/Channel');

const JWT_SECRET = process.env.JWT_SECRET || 'cyberchat_jwt_secret_key';

const auth = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token missing' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch { res.status(401).json({ error: 'Invalid token' }); }
};

// GET /api/channels - Discover channels
router.get('/', auth, async (req, res) => {
  try {
    const { q, category, page = 1, limit = 20 } = req.query;
    const query = { isPublic: true };
    if (q) query.$text = { $search: q };
    if (category) query.category = category;

    const channels = await Channel.find(query)
      .sort({ subscriberCount: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    res.json({ success: true, channels });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/channels/my - Subscribed channels
router.get('/my', auth, async (req, res) => {
  try {
    const channels = await Channel.find({
      'subscribers.userId': req.user.id
    }).lean();
    res.json({ success: true, channels });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/channels/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const channel = await Channel.findOne({ channelId: req.params.id }).lean();
    if (!channel) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true, channel });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/channels - Create channel
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, isPublic, category, broadcastOnly } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });

    const channelId = `chan_${uuidv4()}`;
    const channel = new Channel({
      channelId,
      name,
      description: description || '',
      ownerId: req.user.id,
      admins: [req.user.id],
      subscribers: [{ userId: req.user.id, notifications: true }],
      subscriberCount: 1,
      isPublic: isPublic !== false,
      broadcastOnly: broadcastOnly !== false,
      category: category || 'General'
    });

    await channel.save();
    res.json({ success: true, channel });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/channels/:id/subscribe
router.post('/:id/subscribe', auth, async (req, res) => {
  try {
    const channel = await Channel.findOne({ channelId: req.params.id });
    if (!channel) return res.status(404).json({ error: 'Not found' });

    const already = channel.subscribers.some(s => s.userId === req.user.id);
    if (already) {
      channel.subscribers = channel.subscribers.filter(s => s.userId !== req.user.id);
      channel.subscriberCount = channel.subscribers.length;
      await channel.save();
      return res.json({ success: true, subscribed: false });
    }

    channel.subscribers.push({ userId: req.user.id });
    channel.subscriberCount = channel.subscribers.length;
    await channel.save();
    res.json({ success: true, subscribed: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/channels/:id - Update channel
router.patch('/:id', auth, async (req, res) => {
  try {
    const channel = await Channel.findOne({ channelId: req.params.id });
    if (!channel) return res.status(404).json({ error: 'Not found' });
    if (channel.ownerId !== req.user.id && !channel.admins.includes(req.user.id)) {
      return res.status(403).json({ error: 'Admin only' });
    }

    const allowed = ['name', 'description', 'icon', 'coverImage', 'isPublic', 'category', 'tags', 'broadcastOnly'];
    allowed.forEach(f => { if (req.body[f] !== undefined) channel[f] = req.body[f]; });
    await channel.save();
    res.json({ success: true, channel });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/channels/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const channel = await Channel.findOne({ channelId: req.params.id });
    if (!channel) return res.status(404).json({ error: 'Not found' });
    if (channel.ownerId !== req.user.id) return res.status(403).json({ error: 'Owner only' });
    await Channel.deleteOne({ channelId: req.params.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
