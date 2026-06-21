const mongoose = require('mongoose');

const communitySchema = new mongoose.Schema({
  communityId: { type: String, required: true, unique: true },
  name: { type: String, required: true, trim: true, maxlength: 100 },
  description: { type: String, default: '', maxlength: 500 },
  icon: { type: String, default: '' },
  coverImage: { type: String, default: '' },
  ownerId: { type: String, required: true },
  admins: [{ type: String }],
  moderators: [{ type: String }],
  members: [{
    userId: String,
    joinedAt: { type: Date, default: Date.now },
    role: { type: String, enum: ['member', 'moderator', 'admin', 'owner'], default: 'member' }
  }],
  channels: [{
    channelId: String,
    name: String,
    description: String,
    type: { type: String, enum: ['text', 'voice', 'announcement'], default: 'text' },
    isPrivate: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
  }],
  isPublic: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  tags: [{ type: String }],
  category: { type: String, default: 'General' },
  memberCount: { type: Number, default: 0 },
  rules: [{ type: String }],
  inviteCode: { type: String, unique: true, sparse: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

communitySchema.index({ name: 'text', description: 'text', tags: 'text' });
communitySchema.pre('save', function(next) { this.updatedAt = Date.now(); next(); });

module.exports = mongoose.model('Community', communitySchema);
