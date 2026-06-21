const mongoose = require('mongoose');

const channelSchema = new mongoose.Schema({
  channelId: { type: String, required: true, unique: true },
  name: { type: String, required: true, trim: true, maxlength: 100 },
  description: { type: String, default: '', maxlength: 500 },
  icon: { type: String, default: '' },
  coverImage: { type: String, default: '' },
  ownerId: { type: String, required: true },
  admins: [{ type: String }],
  subscribers: [{
    userId: String,
    subscribedAt: { type: Date, default: Date.now },
    notifications: { type: Boolean, default: true }
  }],
  subscriberCount: { type: Number, default: 0 },
  isPublic: { type: Boolean, default: true },
  broadcastOnly: { type: Boolean, default: true }, // Only admins can post
  category: { type: String, default: 'General' },
  isVerified: { type: Boolean, default: false },
  tags: [{ type: String }],
  inviteLink: { type: String },
  totalPosts: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

channelSchema.index({ name: 'text', description: 'text' });
channelSchema.pre('save', function(next) { this.updatedAt = Date.now(); next(); });

module.exports = mongoose.model('Channel', channelSchema);
