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
    required: true
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
  replyToId: {
    type: String,
    default: null
  },
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
