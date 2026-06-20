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

const roomAnnouncementSchema = new mongoose.Schema({
  id: { type: String, required: true },
  authorId: { type: String, required: true },
  text: { type: String, required: true },
  pinned: { type: Boolean, default: false },
  timestamp: { type: Date, default: Date.now }
});

const roomEventSchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  startTime: { type: Date, required: true },
  endTime: { type: Date, default: null },
  creatorId: { type: String, required: true },
  attendees: [{ type: String }],
  timestamp: { type: Date, default: Date.now }
});

const memberRoleSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  role: {
    type: String,
    enum: ['member', 'moderator', 'admin'],
    default: 'member'
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
  groupPhoto: {
    type: String,
    default: null
  },
  coverPhoto: {
    type: String,
    default: null
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
  admins: [{
    type: String
  }],
  moderators: [{
    type: String
  }],
  memberRoles: [memberRoleSchema],
  isPrivate: {
    type: Boolean,
    default: false
  },
  passcode: {
    type: String,
    default: ''
  },
  // Disappearing messages timer (in seconds, 0 = off)
  disappearingTimer: {
    type: Number,
    default: 0
  },
  // Shared content
  notes: {
    type: String,
    default: ''
  },
  tasks: [roomTaskSchema],
  announcements: [roomAnnouncementSchema],
  events: [roomEventSchema],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Room', roomSchema);
