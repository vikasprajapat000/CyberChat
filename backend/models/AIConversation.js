const mongoose = require('mongoose');

const aiConversationSchema = new mongoose.Schema({
  conversationId: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  title: { type: String, default: 'New Conversation' },
  messages: [{
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    tokens: { type: Number, default: 0 }
  }],
  isArchived: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

aiConversationSchema.index({ userId: 1, updatedAt: -1 });
aiConversationSchema.pre('save', function(next) { this.updatedAt = Date.now(); next(); });

module.exports = mongoose.model('AIConversation', aiConversationSchema);
