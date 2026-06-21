const mongoose = require('mongoose');

const storySchema = new mongoose.Schema({
  storyId: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  username: { type: String, required: true },
  userAvatar: { type: String, default: '' },
  type: { type: String, enum: ['image', 'video', 'text'], default: 'text' },
  mediaUrl: { type: String, default: '' },
  text: { type: String, default: '', maxlength: 200 },
  bgColor: { type: String, default: '#1a1a2e' },
  textColor: { type: String, default: '#00ffff' },
  emoji: { type: String, default: '' },
  duration: { type: Number, default: 5 }, // seconds to display
  viewers: [{
    userId: String,
    username: String,
    viewedAt: { type: Date, default: Date.now }
  }],
  reactions: [{
    userId: String,
    emoji: String,
    reactedAt: { type: Date, default: Date.now }
  }],
  isArchived: { type: Boolean, default: false },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) },
  createdAt: { type: Date, default: Date.now }
});

// TTL index - MongoDB auto-deletes after expiresAt
storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
storySchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Story', storySchema);
