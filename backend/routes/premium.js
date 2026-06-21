const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const PremiumPlan = require('../models/PremiumPlan');
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

// Seed default plans if they don't exist
async function seedPlans() {
  const count = await PremiumPlan.countDocuments();
  if (count === 0) {
    await PremiumPlan.insertMany([
      {
        planId: 'plan_free',
        name: 'Cyber Free',
        price: 0,
        tier: 'free',
        features: [
          'Real-time messaging',
          'Voice & video calls',
          'Up to 5 groups',
          'Up to 3 communities',
          '100MB storage',
          'Basic themes',
          'Disappearing messages'
        ],
        limits: { maxFileSize: 10, maxGroups: 5, maxCommunities: 3, maxChannels: 0,
          maxStorageMB: 100, aiAccess: false, aiMessagesPerDay: 0 },
        badge: '🆓',
        color: '#64748b'
      },
      {
        planId: 'plan_pro',
        name: 'Hacker Pro',
        price: 9.99,
        tier: 'pro',
        features: [
          'Everything in Free',
          'AI Assistant (50 msgs/day)',
          'Unlimited groups & communities',
          'Create broadcast channels',
          'HD video calls & screen sharing',
          'View-once media',
          '1GB storage',
          'Custom themes & accents',
          'Priority message delivery',
          'Snap streaks'
        ],
        limits: { maxFileSize: 50, maxGroups: -1, maxCommunities: -1, maxChannels: 5,
          maxStorageMB: 1024, aiAccess: true, aiMessagesPerDay: 50, customThemes: true,
          viewOnceMedia: true, screensharing: true, groupCalls: true },
        badge: '💎',
        color: '#3b82f6'
      },
      {
        planId: 'plan_elite',
        name: 'Cyber Elite',
        price: 29.99,
        tier: 'elite',
        features: [
          'Everything in Pro',
          'AI Assistant (unlimited)',
          'Admin dashboard access',
          'Advanced analytics',
          'Unlimited storage',
          'Priority support',
          'Export encrypted backups',
          'QR multi-device login',
          'Dedicated channels',
          'Custom community branding'
        ],
        limits: { maxFileSize: 200, maxGroups: -1, maxCommunities: -1, maxChannels: -1,
          maxStorageMB: -1, aiAccess: true, aiMessagesPerDay: -1, customThemes: true,
          viewOnceMedia: true, screensharing: true, groupCalls: true,
          prioritySupport: true, advancedAnalytics: true },
        badge: '👑',
        color: '#a855f7'
      }
    ]);
  }
}
seedPlans().catch(console.error);

// GET /api/premium/plans
router.get('/plans', auth, async (req, res) => {
  try {
    const plans = await PremiumPlan.find({ isActive: true }).lean();
    res.json({ success: true, plans });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/premium/status - Get current user's premium status
router.get('/status', auth, async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.user.id })
      .select('premiumTier premiumExpiresAt premiumPlanId').lean();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const plan = await PremiumPlan.findOne({ tier: user.premiumTier || 'free' }).lean();
    res.json({ success: true, tier: user.premiumTier || 'free', plan, expiresAt: user.premiumExpiresAt });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/premium/upgrade - Simulate plan upgrade
router.post('/upgrade', auth, async (req, res) => {
  try {
    const { planId } = req.body;
    const plan = await PremiumPlan.findOne({ planId }).lean();
    if (!plan) return res.status(404).json({ error: 'Plan not found' });

    const user = await User.findOne({ userId: req.user.id });
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Simulate successful payment (30 days from now)
    const expiresAt = plan.tier === 'free' ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    user.premiumTier = plan.tier;
    user.premiumExpiresAt = expiresAt;
    user.premiumPlanId = planId;
    await user.save();

    res.json({
      success: true,
      message: `Successfully upgraded to ${plan.name}!`,
      tier: plan.tier,
      expiresAt
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
