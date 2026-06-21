const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const Story = require('../models/Story');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'cyberchat_jwt_secret_key';

const auth = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token missing' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch { res.status(401).json({ error: 'Invalid token' }); }
};

// GET /api/stories/feed - Get stories from contacts + self
router.get('/feed', auth, async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.user.id }).lean();
    const contactIds = (user?.contacts || []);
    const visibleUserIds = [...contactIds, req.user.id];

    const stories = await Story.find({
      userId: { $in: visibleUserIds },
      expiresAt: { $gt: new Date() }
    }).sort({ createdAt: -1 }).lean();

    // Group by user
    const grouped = {};
    stories.forEach(story => {
      if (!grouped[story.userId]) {
        grouped[story.userId] = { userId: story.userId, username: story.username, userAvatar: story.userAvatar, stories: [] };
      }
      grouped[story.userId].stories.push(story);
    });

    res.json({ success: true, feed: Object.values(grouped) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stories/my - Get own stories
router.get('/my', auth, async (req, res) => {
  try {
    const stories = await Story.find({ userId: req.user.id }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, stories });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/stories - Create a story
router.post('/', auth, async (req, res) => {
  try {
    const { type, mediaUrl, text, bgColor, textColor, emoji, duration } = req.body;
    const user = await User.findOne({ userId: req.user.id }).lean();

    const story = new Story({
      storyId: `story_${uuidv4()}`,
      userId: req.user.id,
      username: user?.username || req.user.username,
      userAvatar: user?.profilePhoto || '',
      type: type || 'text',
      mediaUrl: mediaUrl || '',
      text: text || '',
      bgColor: bgColor || '#1a1a2e',
      textColor: textColor || '#00ffff',
      emoji: emoji || '',
      duration: duration || 5,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });

    await story.save();
    res.json({ success: true, story });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/stories/:id/view - Mark story as viewed
router.post('/:id/view', auth, async (req, res) => {
  try {
    const story = await Story.findOne({ storyId: req.params.id });
    if (!story) return res.status(404).json({ error: 'Story not found' });

    const alreadyViewed = story.viewers.some(v => v.userId === req.user.id);
    if (!alreadyViewed) {
      const user = await User.findOne({ userId: req.user.id }).lean();
      story.viewers.push({ userId: req.user.id, username: user?.username || 'Unknown' });
      await story.save();
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/stories/:id/react - React to a story
router.post('/:id/react', auth, async (req, res) => {
  try {
    const { emoji } = req.body;
    const story = await Story.findOne({ storyId: req.params.id });
    if (!story) return res.status(404).json({ error: 'Story not found' });

    story.reactions = story.reactions.filter(r => r.userId !== req.user.id);
    if (emoji) story.reactions.push({ userId: req.user.id, emoji });
    await story.save();

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/stories/:id - Delete own story
router.delete('/:id', auth, async (req, res) => {
  try {
    const story = await Story.findOne({ storyId: req.params.id });
    if (!story) return res.status(404).json({ error: 'Not found' });
    if (story.userId !== req.user.id) return res.status(403).json({ error: 'Not your story' });
    await Story.deleteOne({ storyId: req.params.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
