const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Streak = require('../models/Streak');

const JWT_SECRET = process.env.JWT_SECRET || 'cyberchat_jwt_secret_key';

const auth = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token missing' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch { res.status(401).json({ error: 'Invalid token' }); }
};

// GET /api/streaks/:partnerId - Get streak with a specific partner
router.get('/:partnerId', auth, async (req, res) => {
  try {
    const users = [req.user.id, req.params.partnerId].sort();
    const streak = await Streak.findOne({ users }).lean();

    if (!streak) return res.json({ success: true, streak: null, count: 0 });

    // Check if streak is still active (last message within 26 hours)
    const hoursSinceLast = (Date.now() - new Date(streak.lastMessageDate).getTime()) / (1000 * 60 * 60);
    const isActive = hoursSinceLast <= 26;

    res.json({ success: true, streak, count: isActive ? streak.count : 0, isActive });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/streaks - Get all streaks for current user
router.get('/', auth, async (req, res) => {
  try {
    const streaks = await Streak.find({
      users: req.user.id,
      count: { $gte: 1 }
    }).sort({ count: -1 }).lean();

    res.json({ success: true, streaks });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/streaks/update - Called internally when a message is sent
router.post('/update', auth, async (req, res) => {
  try {
    const { partnerId } = req.body;
    if (!partnerId) return res.status(400).json({ error: 'partnerId required' });

    const users = [req.user.id, partnerId].sort();
    let streak = await Streak.findOne({ users });

    if (!streak) {
      streak = new Streak({ users, count: 1, lastMessageDate: new Date() });
    } else {
      const hoursSinceLast = (Date.now() - new Date(streak.lastMessageDate).getTime()) / (1000 * 60 * 60);
      const daysSinceLast = hoursSinceLast / 24;

      if (daysSinceLast >= 1 && daysSinceLast <= 2) {
        // Consecutive day - increment streak
        streak.count += 1;
        if (streak.count > streak.longestStreak) streak.longestStreak = streak.count;

        // Record milestones
        const milestones = [7, 14, 30, 50, 100, 200, 365];
        if (milestones.includes(streak.count)) {
          streak.milestones.push({ count: streak.count, achievedAt: new Date() });
        }
      } else if (daysSinceLast > 2) {
        // Streak broken
        streak.count = 1;
      }
      // If same day, just update the timestamp
      streak.lastMessageDate = new Date();
    }

    streak.isActive = true;
    await streak.save();

    res.json({ success: true, streak, count: streak.count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
