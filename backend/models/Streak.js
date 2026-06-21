const mongoose = require('mongoose');

const streakSchema = new mongoose.Schema({
  users: {
    type: [String],
    validate: { validator: (v) => v.length === 2, message: 'Streak must be between exactly 2 users' }
  },
  count: { type: Number, default: 1 },
  lastMessageDate: { type: Date, default: Date.now },
  longestStreak: { type: Number, default: 1 },
  isActive: { type: Boolean, default: true },
  milestones: [{
    count: Number,
    achievedAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Compound index to quickly find streak between two users
streakSchema.index({ users: 1 }, { unique: true });
streakSchema.pre('save', function(next) {
  this.users.sort(); // Normalize order
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Streak', streakSchema);
