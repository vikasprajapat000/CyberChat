const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  reportedBy: {
    type: String,
    required: true,
    index: true
  },
  targetUserId: {
    type: String,
    required: true,
    index: true
  },
  targetUsername: {
    type: String,
    default: ''
  },
  reason: {
    type: String,
    required: true,
    enum: [
      'spam',
      'harassment',
      'hate_speech',
      'inappropriate_content',
      'impersonation',
      'fake_account',
      'violence',
      'scam',
      'other'
    ]
  },
  description: {
    type: String,
    default: ''
  },
  messageId: {
    type: String,
    default: null  // optional reference to a specific message
  },
  resolved: {
    type: Boolean,
    default: false
  },
  resolvedAt: {
    type: Date,
    default: null
  },
  resolvedBy: {
    type: String,
    default: null  // adminId who resolved
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
});

module.exports = mongoose.model('Report', reportSchema);
