const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  username: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  password: {
    type: String,
    required: true
  },
  bio: {
    type: String,
    default: 'Hey! I am using Cyber Chat.'
  },
  statusMsg: {
    type: String,
    default: 'Active'
  },
  profilePhoto: {
    type: String,
    default: null
  },
  coverPhoto: {
    type: String,
    default: null
  },
  customThemeColor: {
    type: String,
    default: '#00a884'
  },
  displayName: {
    type: String,
    default: ''
  },
  mobileNumber: {
    type: String,
    default: ''
  },
  aboutVisibility: {
    type: String,
    enum: ['everyone', 'contacts', 'nobody'],
    default: 'everyone'
  },
  statusVisibility: {
    type: String,
    enum: ['everyone', 'contacts', 'nobody'],
    default: 'everyone'
  },
  readReceipts: {
    type: Boolean,
    default: true
  },
  hideTyping: {
    type: Boolean,
    default: false
  },
  hideRecording: {
    type: Boolean,
    default: false
  },
  hideScreenshot: {
    type: Boolean,
    default: false
  },
  isGhostMode: {
    type: Boolean,
    default: false
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  chatWallpaper: {
    type: String,
    default: 'default'
  },
  fontSize: {
    type: String,
    enum: ['small', 'medium', 'large', 'xlarge'],
    default: 'medium'
  },
  pinnedChats: [{
    type: String,
    default: []
  }],
  mutedChats: [{
    type: String,
    default: []
  }],
  archivedChats: [{
    type: String,
    default: []
  }],
  // Privacy Settings
  lastSeenSetting: {
    type: String,
    enum: ['everyone', 'contacts', 'nobody'],
    default: 'everyone'
  },
  onlineVisibility: {
    type: String,
    enum: ['visible', 'invisible'],
    default: 'visible'
  },
  profilePhotoVisibility: {
    type: String,
    enum: ['everyone', 'contacts', 'nobody'],
    default: 'everyone'
  },
  // Account Status
  status: {
    type: String,
    enum: ['online', 'offline'],
    default: 'offline'
  },
  lastSeen: {
    type: Date,
    default: null
  },
  // Social
  followers: [{
    type: String
  }],
  following: [{
    type: String
  }],
  contacts: [{
    type: String,
    default: []
  }],
  sentRequests: [{
    type: String,
    default: []
  }],
  receivedRequests: [{
    type: String,
    default: []
  }],
  // Blocks & Mutes
  blockedUsers: [{
    type: String
  }],
  mutedUsers: [{
    type: String
  }],
  // Security
  pinLock: {
    type: String,
    default: null  // hashed PIN
  },
  fingerprintEnabled: {
    type: Boolean,
    default: false
  },
  loginAlerts: {
    type: Boolean,
    default: true
  },
  e2eEnabled: {
    type: Boolean,
    default: true
  },
  // Admin Controls
  isMutedGlobally: {
    type: Boolean,
    default: false
  },
  isSuspended: {
    type: Boolean,
    default: false
  },
  isBanned: {
    type: Boolean,
    default: false
  },
  reportCount: {
    type: Number,
    default: 0
  },
  // Preferences
  language: {
    type: String,
    default: 'en'
  },
  disappearingMessageTimer: {
    type: Number,
    default: 0  // 0 = off, seconds otherwise
  },
  notificationSettings: {
    messages: { type: Boolean, default: true },
    calls: { type: Boolean, default: true },
    mentions: { type: Boolean, default: true },
    broadcasts: { type: Boolean, default: true }
  },
  // Login History
  loginHistory: [{
    ip: String,
    userAgent: String,
    timestamp: { type: Date, default: Date.now }
  }],
  // Premium Subscription
  premiumTier: {
    type: String,
    enum: ['free', 'pro', 'elite'],
    default: 'free'
  },
  premiumPlanId: { type: String, default: null },
  premiumExpiresAt: { type: Date, default: null },
  // Multi-Device Sessions
  devices: [{
    deviceId: String,
    deviceName: String,
    platform: String,
    lastActiveAt: { type: Date, default: Date.now },
    token: String
  }],
  // QR Login
  qrToken: { type: String, default: null },
  qrTokenExpiresAt: { type: Date, default: null },
  // Live Location
  liveLocation: {
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
    accuracy: { type: Number, default: null },
    sharedWith: [{ type: String }],
    expiresAt: { type: Date, default: null }
  },
  // AI Usage
  aiMessagesUsedToday: { type: Number, default: 0 },
  aiUsageResetDate: { type: Date, default: Date.now },
  // Analytics
  totalMessagesSent: { type: Number, default: 0 },
  totalCallsMade: { type: Number, default: 0 },
  storageUsedMB: { type: Number, default: 0 },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', userSchema);
