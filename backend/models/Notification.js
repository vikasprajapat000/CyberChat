const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: [
      'message',
      'mention',
      'call_missed',
      'call_incoming',
      'friend_request',
      'friend_accepted',
      'follow',
      'group_invite',
      'group_announcement',
      'group_event',
      'broadcast',
      'login_alert',
      'report_resolved',
      'system'
    ],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  body: {
    type: String,
    default: ''
  },
  read: {
    type: Boolean,
    default: false,
    index: true
  },
  // Contextual metadata (flexible)
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
    // e.g. { senderId, chatId, roomId, callId, messageId }
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Auto-delete notifications older than 30 days
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

module.exports = mongoose.model('Notification', notificationSchema);
