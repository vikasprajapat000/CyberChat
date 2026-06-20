const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  senderId: {
    type: String,
    required: true,
    index: true
  },
  recipientId: {
    type: String,
    default: null,
    index: true
  },
  roomId: {
    type: String,
    default: null,
    index: true
  },
  text: {
    type: String,
    default: ''
  },
  mediaUrl: {
    type: String,
    default: null
  },
  mediaType: {
    type: String,
    default: null
  },
  mediaName: {
    type: String,
    default: null
  },
  // GIF support
  gifUrl: {
    type: String,
    default: null
  },
  gifTitle: {
    type: String,
    default: null
  },
  // Reply / Forward
  replyToId: {
    type: String,
    default: null
  },
  isForwarded: {
    type: Boolean,
    default: false
  },
  forwardedFrom: {
    type: String,
    default: null  // original sender's username
  },
  // Disappearing messages
  disappearsAt: {
    type: Date,
    default: null,
    index: true  // used for MongoDB TTL cleanup
  },
  // View-once
  viewOnce: {
    type: Boolean,
    default: false
  },
  viewedBy: [{
    type: String  // userIds who have viewed it
  }],
  // Secret chat (ephemeral, still tracked for call history etc.)
  isSecret: {
    type: Boolean,
    default: false
  },
  // Mentions
  mentionedUsers: [{
    type: String  // userIds mentioned
  }],
  // Linked to a call
  callId: {
    type: String,
    default: null
  },
  // Message metadata
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  edited: {
    type: Boolean,
    default: false
  },
  deleted: {
    type: Boolean,
    default: false
  },
  pinned: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'seen', 'sent_blocked'],
    default: 'sent'
  },
  reactions: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  // Poll
  isPoll: {
    type: Boolean,
    default: false
  },
  pollData: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  }
});

module.exports = mongoose.model('Message', messageSchema);
