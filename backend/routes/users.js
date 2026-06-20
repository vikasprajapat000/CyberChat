const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Report = require('../models/Report');
const { verifyToken } = require('./auth');

// Helper: push in-app notification
const createNotification = async (userId, type, title, body, metadata = {}) => {
  try {
    const notif = new Notification({
      id: `notif_${uuidv4().substring(0, 10)}`,
      userId,
      type,
      title,
      body,
      metadata
    });
    await notif.save();
    return notif;
  } catch (e) {
    console.error('Create Notification Error:', e);
  }
};

// GET /api/users/suggestions — friend suggestions (mutual contacts)
router.get('/suggestions', verifyToken, async (req, res) => {
  try {
    const { id, role } = req.user;
    if (role !== 'user') return res.status(403).json({ error: 'Not allowed' });

    const me = await User.findOne({ userId: id });
    if (!me) return res.status(404).json({ error: 'User not found' });

    const myContactSet = new Set(me.contacts);
    const myFollowingSet = new Set(me.following);
    const blockedSet = new Set(me.blockedUsers);

    // Find people followed by people I follow (2nd degree)
    const suggestions = [];
    const seenIds = new Set([id]);

    const followingUsers = await User.find({ userId: { $in: me.following } });
    for (const fu of followingUsers) {
      for (const fid of fu.following) {
        if (!seenIds.has(fid) && !blockedSet.has(fid) && !myFollowingSet.has(fid)) {
          seenIds.add(fid);
          const candidate = await User.findOne({ userId: fid });
          if (candidate && !candidate.isBanned && !candidate.isSuspended) {
            // Count mutuals
            const mutualCount = candidate.following.filter(x => myFollowingSet.has(x)).length;
            suggestions.push({
              id: candidate.userId,
              username: candidate.username,
              bio: candidate.bio,
              profilePhoto: candidate.profilePhoto,
              status: candidate.onlineVisibility === 'invisible' ? 'offline' : candidate.status,
              mutualCount
            });
          }
        }
      }
    }

    // Sort by mutual count
    suggestions.sort((a, b) => b.mutualCount - a.mutualCount);
    res.json({ success: true, suggestions: suggestions.slice(0, 20) });
  } catch (error) {
    console.error('Suggestions Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/users/:id — public profile
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const targetUser = await User.findOne({ userId: req.params.id });
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    const viewerId = req.user.id;
    const isContact = targetUser.contacts.includes(viewerId);

    // Privacy masking
    let profilePhoto = null;
    if (targetUser.profilePhotoVisibility === 'everyone' ||
        (targetUser.profilePhotoVisibility === 'contacts' && isContact)) {
      profilePhoto = targetUser.profilePhoto;
    }
    let lastSeen = null;
    if (targetUser.lastSeenSetting === 'everyone' ||
        (targetUser.lastSeenSetting === 'contacts' && isContact)) {
      lastSeen = targetUser.lastSeen;
    }
    const isInvisible = targetUser.onlineVisibility === 'invisible';

    res.json({
      success: true,
      user: {
        id: targetUser.userId,
        username: targetUser.username,
        bio: targetUser.bio,
        statusMsg: targetUser.statusMsg,
        profilePhoto,
        coverPhoto: targetUser.coverPhoto,
        status: isInvisible ? 'offline' : targetUser.status,
        lastSeen,
        followers: targetUser.followers || [],
        following: targetUser.following || [],
        createdAt: targetUser.createdAt
      }
    });
  } catch (error) {
    console.error('Get User Profile Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/users/:id/follow
router.post('/:id/follow', verifyToken, async (req, res) => {
  try {
    const { id: myId, role } = req.user;
    const targetId = req.params.id;

    if (role !== 'user') return res.status(403).json({ error: 'Not allowed' });
    if (myId === targetId) return res.status(400).json({ error: 'Cannot follow yourself' });

    const me = await User.findOne({ userId: myId });
    const target = await User.findOne({ userId: targetId });
    if (!me || !target) return res.status(404).json({ error: 'User not found' });

    if (!me.following.includes(targetId)) {
      me.following.push(targetId);
      await me.save();
    }

    if (!target.followers.includes(myId)) {
      target.followers.push(myId);
      await target.save();
    }

    // Notify target
    await createNotification(
      targetId,
      'follow',
      'New Follower',
      `${me.username} started following you.`,
      { followerId: myId, followerName: me.username }
    );

    res.json({ success: true, message: `Now following ${target.username}` });
  } catch (error) {
    console.error('Follow Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// DELETE /api/users/:id/follow (unfollow)
router.delete('/:id/follow', verifyToken, async (req, res) => {
  try {
    const { id: myId, role } = req.user;
    const targetId = req.params.id;
    if (role !== 'user') return res.status(403).json({ error: 'Not allowed' });

    const me = await User.findOne({ userId: myId });
    const target = await User.findOne({ userId: targetId });
    if (!me || !target) return res.status(404).json({ error: 'User not found' });

    me.following = me.following.filter(id => id !== targetId);
    target.followers = target.followers.filter(id => id !== myId);

    await me.save();
    await target.save();

    res.json({ success: true, message: `Unfollowed ${target.username}` });
  } catch (error) {
    console.error('Unfollow Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/users/:id/followers
router.get('/:id/followers', verifyToken, async (req, res) => {
  try {
    const target = await User.findOne({ userId: req.params.id });
    if (!target) return res.status(404).json({ error: 'User not found' });

    const followerUsers = await User.find(
      { userId: { $in: target.followers } },
      'userId username bio profilePhoto status onlineVisibility'
    );

    res.json({
      success: true,
      followers: followerUsers.map(u => ({
        id: u.userId,
        username: u.username,
        bio: u.bio,
        profilePhoto: u.profilePhoto,
        status: u.onlineVisibility === 'invisible' ? 'offline' : u.status
      }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /api/users/:id/following
router.get('/:id/following', verifyToken, async (req, res) => {
  try {
    const target = await User.findOne({ userId: req.params.id });
    if (!target) return res.status(404).json({ error: 'User not found' });

    const followingUsers = await User.find(
      { userId: { $in: target.following } },
      'userId username bio profilePhoto status onlineVisibility'
    );

    res.json({
      success: true,
      following: followingUsers.map(u => ({
        id: u.userId,
        username: u.username,
        bio: u.bio,
        profilePhoto: u.profilePhoto,
        status: u.onlineVisibility === 'invisible' ? 'offline' : u.status
      }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/users/:id/report
router.post('/:id/report', verifyToken, async (req, res) => {
  try {
    const { id: reporterId, role } = req.user;
    if (role !== 'user') return res.status(403).json({ error: 'Not allowed' });

    const { reason, description, messageId } = req.body;
    const targetId = req.params.id;

    if (!reason) return res.status(400).json({ error: 'Reason is required' });

    const reportedUser = await User.findOne({ userId: targetId });
    if (!reportedUser) return res.status(404).json({ error: 'User not found' });

    // Increment report count
    reportedUser.reportCount = (reportedUser.reportCount || 0) + 1;
    await reportedUser.save();

    // Save to Report collection
    const Report = require('../models/Report');
    const newReport = new Report({
      id: `rep_${uuidv4().substring(0, 8)}`,
      reportedBy: reporterId,
      targetUserId: targetId,
      targetUsername: reportedUser.username,
      reason: reason,
      description: description || '',
      messageId: messageId || null,
      timestamp: new Date()
    });
    await newReport.save();

    res.json({ success: true, message: 'Report submitted. Our team will review it.' });
  } catch (error) {
    console.error('Report User Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// POST /api/users/update-settings — update notification + privacy settings
router.post('/update-settings', verifyToken, async (req, res) => {
  try {
    const { id, role } = req.user;
    if (role !== 'user') return res.status(403).json({ error: 'Not allowed' });

    const {
      notificationSettings,
      disappearingMessageTimer,
      language,
      e2eEnabled,
      loginAlerts,
      fingerprintEnabled,
      profilePhotoVisibility
    } = req.body;

    const user = await User.findOne({ userId: id });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (notificationSettings) user.notificationSettings = { ...user.notificationSettings, ...notificationSettings };
    if (disappearingMessageTimer !== undefined) user.disappearingMessageTimer = disappearingMessageTimer;
    if (language) user.language = language;
    if (e2eEnabled !== undefined) user.e2eEnabled = e2eEnabled;
    if (loginAlerts !== undefined) user.loginAlerts = loginAlerts;
    if (fingerprintEnabled !== undefined) user.fingerprintEnabled = fingerprintEnabled;
    if (profilePhotoVisibility) user.profilePhotoVisibility = profilePhotoVisibility;

    await user.save();
    res.json({ success: true, message: 'Settings updated successfully.' });
  } catch (error) {
    console.error('Update Settings Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = { router, createNotification };
