const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const Community = require('../models/Community');

const JWT_SECRET = process.env.JWT_SECRET || 'cyberchat_jwt_secret_key';

// Auth middleware
const auth = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token missing' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch { res.status(401).json({ error: 'Invalid token' }); }
};

// GET /api/communities - List/discover communities
router.get('/', auth, async (req, res) => {
  try {
    const { q, category, page = 1, limit = 20 } = req.query;
    const query = { isPublic: true };
    if (q) query.$text = { $search: q };
    if (category) query.category = category;

    const communities = await Community.find(query)
      .sort({ memberCount: -1, createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    res.json({ success: true, communities });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/communities/my - Get user's communities
router.get('/my', auth, async (req, res) => {
  try {
    const communities = await Community.find({
      'members.userId': req.user.id
    }).lean();
    res.json({ success: true, communities });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/communities/:id - Get community details
router.get('/:id', auth, async (req, res) => {
  try {
    const community = await Community.findOne({ communityId: req.params.id }).lean();
    if (!community) return res.status(404).json({ error: 'Community not found' });
    res.json({ success: true, community });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/communities - Create community
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, isPublic, category, tags, rules } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });

    const communityId = `comm_${uuidv4()}`;
    const inviteCode = uuidv4().substring(0, 8).toUpperCase();
    const defaultChannelId = `ch_${uuidv4()}`;

    const community = new Community({
      communityId,
      name,
      description: description || '',
      ownerId: req.user.id,
      admins: [req.user.id],
      members: [{ userId: req.user.id, role: 'owner' }],
      channels: [
        { channelId: defaultChannelId, name: 'general', description: 'General discussion', type: 'text' },
        { channelId: `ch_${uuidv4()}`, name: 'announcements', description: 'Important announcements', type: 'announcement' }
      ],
      isPublic: isPublic !== false,
      category: category || 'General',
      tags: tags || [],
      rules: rules || [],
      memberCount: 1,
      inviteCode
    });

    await community.save();
    res.json({ success: true, community });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/communities/:id/join - Join a community
router.post('/:id/join', auth, async (req, res) => {
  try {
    const community = await Community.findOne({ communityId: req.params.id });
    if (!community) return res.status(404).json({ error: 'Community not found' });

    const alreadyMember = community.members.some(m => m.userId === req.user.id);
    if (alreadyMember) return res.status(400).json({ error: 'Already a member' });

    community.members.push({ userId: req.user.id, role: 'member' });
    community.memberCount = community.members.length;
    await community.save();

    res.json({ success: true, message: 'Joined community' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/communities/:id/leave - Leave community
router.post('/:id/leave', auth, async (req, res) => {
  try {
    const community = await Community.findOne({ communityId: req.params.id });
    if (!community) return res.status(404).json({ error: 'Community not found' });

    if (community.ownerId === req.user.id) {
      return res.status(400).json({ error: 'Owner cannot leave. Transfer ownership first.' });
    }

    community.members = community.members.filter(m => m.userId !== req.user.id);
    community.memberCount = community.members.length;
    await community.save();

    res.json({ success: true, message: 'Left community' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/communities/:id/channels - Add a channel to community
router.post('/:id/channels', auth, async (req, res) => {
  try {
    const { name, description, type } = req.body;
    const community = await Community.findOne({ communityId: req.params.id });
    if (!community) return res.status(404).json({ error: 'Community not found' });

    const isAdmin = community.admins.includes(req.user.id) || community.ownerId === req.user.id;
    if (!isAdmin) return res.status(403).json({ error: 'Admin only' });

    const newChannel = {
      channelId: `ch_${uuidv4()}`,
      name: name || 'new-channel',
      description: description || '',
      type: type || 'text'
    };
    community.channels.push(newChannel);
    await community.save();

    res.json({ success: true, channel: newChannel });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/communities/:id - Update community
router.patch('/:id', auth, async (req, res) => {
  try {
    const community = await Community.findOne({ communityId: req.params.id });
    if (!community) return res.status(404).json({ error: 'Community not found' });

    const isAdmin = community.admins.includes(req.user.id) || community.ownerId === req.user.id;
    if (!isAdmin) return res.status(403).json({ error: 'Admin only' });

    const allowed = ['name', 'description', 'icon', 'coverImage', 'isPublic', 'category', 'tags', 'rules'];
    allowed.forEach(field => {
      if (req.body[field] !== undefined) community[field] = req.body[field];
    });

    await community.save();
    res.json({ success: true, community });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/communities/:id - Delete community
router.delete('/:id', auth, async (req, res) => {
  try {
    const community = await Community.findOne({ communityId: req.params.id });
    if (!community) return res.status(404).json({ error: 'Not found' });
    if (community.ownerId !== req.user.id) return res.status(403).json({ error: 'Owner only' });

    await Community.deleteOne({ communityId: req.params.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
