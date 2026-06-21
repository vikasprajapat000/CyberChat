const mongoose = require('mongoose');

const premiumPlanSchema = new mongoose.Schema({
  planId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  currency: { type: String, default: 'USD' },
  billingCycle: { type: String, enum: ['monthly', 'yearly', 'lifetime'], default: 'monthly' },
  tier: { type: String, enum: ['free', 'pro', 'elite'], required: true },
  features: [{ type: String }],
  limits: {
    maxFileSize: { type: Number, default: 25 }, // MB
    maxGroups: { type: Number, default: 5 },
    maxCommunities: { type: Number, default: 3 },
    maxChannels: { type: Number, default: 2 },
    maxStorageMB: { type: Number, default: 100 },
    aiAccess: { type: Boolean, default: false },
    aiMessagesPerDay: { type: Number, default: 0 },
    prioritySupport: { type: Boolean, default: false },
    customThemes: { type: Boolean, default: false },
    advancedAnalytics: { type: Boolean, default: false },
    disappearingMessages: { type: Boolean, default: true },
    viewOnceMedia: { type: Boolean, default: false },
    screensharing: { type: Boolean, default: false },
    groupCalls: { type: Boolean, default: false }
  },
  badge: { type: String, default: '' }, // emoji or icon name
  color: { type: String, default: '#00ffff' },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('PremiumPlan', premiumPlanSchema);
