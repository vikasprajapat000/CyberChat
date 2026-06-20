const mongoose = require('mongoose');

const roomTaskSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  assigneeId: {
    type: String,
    default: ''
  },
  completed: {
    type: Boolean,
    default: false
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const roomSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  icon: {
    type: String,
    default: '💬'
  },
  type: {
    type: String,
    enum: ['group', 'direct'],
    default: 'group'
  },
  creatorId: {
    type: String,
    required: true
  },
  members: [{
    type: String
  }],
  isPrivate: {
    type: Boolean,
    default: false
  },
  passcode: {
    type: String,
    default: ''
  },
  admins: [{
    type: String
  }],
  notes: {
    type: String,
    default: ''
  },
  tasks: [roomTaskSchema],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Room', roomSchema);
