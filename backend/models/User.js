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
  customThemeColor: {
    type: String,
    default: '#00a884'
  },
  lastSeenSetting: {
    type: String,
    enum: ['everyone', 'nobody'],
    default: 'everyone'
  },
  onlineVisibility: {
    type: String,
    enum: ['visible', 'invisible'],
    default: 'visible'
  },
  status: {
    type: String,
    enum: ['online', 'offline'],
    default: 'offline'
  },
  lastSeen: {
    type: Date,
    default: null
  },
  blockedUsers: [{
    type: String
  }],
  mutedUsers: [{
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
  isMutedGlobally: {
    type: Boolean,
    default: false
  },
  isSuspended: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', userSchema);
