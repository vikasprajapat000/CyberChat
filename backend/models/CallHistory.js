const mongoose = require('mongoose');

const callHistorySchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  callerId: {
    type: String,
    required: true,
    index: true
  },
  callerName: {
    type: String,
    default: ''
  },
  receiverId: {
    type: String,
    default: null,  // null for group calls
    index: true
  },
  receiverName: {
    type: String,
    default: ''
  },
  roomId: {
    type: String,
    default: null  // for group calls
  },
  participants: [{
    type: String  // userIds for group calls
  }],
  type: {
    type: String,
    enum: ['audio', 'video'],
    required: true
  },
  status: {
    type: String,
    enum: ['answered', 'missed', 'declined', 'failed'],
    default: 'answered'
  },
  duration: {
    type: Number,
    default: 0  // seconds
  },
  recordingUrl: {
    type: String,
    default: null
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  endedAt: {
    type: Date,
    default: null
  }
});

module.exports = mongoose.model('CallHistory', callHistorySchema);
