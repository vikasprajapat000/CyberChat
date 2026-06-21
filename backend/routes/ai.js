const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const AIConversation = require('../models/AIConversation');

const JWT_SECRET = process.env.JWT_SECRET || 'cyberchat_jwt_secret_key';

const auth = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token missing' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch { res.status(401).json({ error: 'Invalid token' }); }
};

// CyberAI simulated knowledge base responses
const CYBER_AI_KNOWLEDGE = [
  { triggers: ['hello', 'hi', 'hey', 'greetings'], responses: [
    "🤖 **CyberAI online.** How can I assist you in the digital realm today?",
    "👋 Hello, cyber traveler! I'm CyberAI, your intelligent assistant. What do you need?",
    "⚡ System activated. CyberAI at your service. What's on your agenda?"
  ]},
  { triggers: ['help', 'what can you do', 'capabilities'], responses: [
    "🧠 **My capabilities include:**\n\n• Answer questions & provide information\n• Help draft messages and content\n• Explain technical concepts\n• Analyze and summarize text\n• Assist with coding questions\n• Creative writing and brainstorming\n\nWhat would you like help with?"
  ]},
  { triggers: ['encrypt', 'security', 'privacy', 'secure'], responses: [
    "🔐 **Security Mode Activated.**\n\nCyberChat uses:\n• JWT-based authentication\n• End-to-end encryption for messages\n• Disappearing messages with TTL\n• View-once media with blur overlays\n• PIN lock screen protection\n\nYour data stays secure. Anything specific you'd like to know?"
  ]},
  { triggers: ['group', 'room', 'chat'], responses: [
    "💬 **Chat Features:**\n\n• Create private/public groups\n• Direct messaging with delivery receipts\n• Communities with sub-channels\n• Broadcast channels\n• Real-time typing indicators\n• Message reactions & replies\n\nNeed help with a specific feature?"
  ]},
  { triggers: ['call', 'video', 'voice', 'webrtc'], responses: [
    "📹 **Calling Features:**\n\n• HD video calls via WebRTC\n• Crystal-clear voice calls\n• Screen sharing\n• Group calls support\n• Call history tracking\n• Noise cancellation\n\nAll calls are peer-to-peer for maximum privacy."
  ]},
  { triggers: ['premium', 'plan', 'upgrade', 'subscription'], responses: [
    "⭐ **Premium Tiers:**\n\n🆓 **Free**: Basic messaging, 5 groups, 100MB storage\n💎 **Pro ($9.99/mo)**: AI access, HD calls, 1GB storage, custom themes\n👑 **Elite ($29.99/mo)**: All Pro features + admin tools, unlimited storage, priority support\n\nUpgrade from the Premium section!"
  ]},
  { triggers: ['story', 'status'], responses: [
    "📸 **Stories & Status:**\n\nShare moments that disappear after 24 hours!\n• Upload photos, videos, or text stories\n• See who viewed your story\n• React with emojis\n• Stories auto-delete via MongoDB TTL"
  ]},
  { triggers: ['streak', 'snap'], responses: [
    "🔥 **Snap Streaks:**\n\nKeep your streak alive by messaging friends daily!\n• Streaks grow with each consecutive day\n• Fire emoji milestone badges at 7, 30, 100, 365 days\n• Check streaks in your DM conversations"
  ]},
  { triggers: ['ai', 'artificial intelligence', 'gpt', 'gemini'], responses: [
    "🤖 **About CyberAI:**\n\nI'm the built-in intelligence of CyberChat. I can:\n• Answer your questions instantly\n• Help draft professional messages\n• Explain platform features\n• Provide coding assistance\n• Summarize long texts\n\nPremium users get enhanced AI capabilities!"
  ]},
  { triggers: ['code', 'programming', 'javascript', 'python'], responses: [
    "💻 **Code Assistant Ready!**\n\nI can help with:\n• Debugging code snippets\n• Explaining algorithms\n• Code reviews\n• Best practices\n• Framework guidance\n\nPaste your code and I'll analyze it!"
  ]},
  { triggers: ['location', 'map', 'share location'], responses: [
    "📍 **Live Location Sharing:**\n\nShare your real-time location with contacts:\n• Live tracking for 15 min / 1 hr / 8 hrs\n• Interactive map view (OpenStreetMap)\n• Precision GPS coordinates\n• Automatic expiry when time ends\n\nUse the 📍 button in any chat!"
  ]}
];

function generateAIResponse(userMessage) {
  const msg = userMessage.toLowerCase();
  
  for (const entry of CYBER_AI_KNOWLEDGE) {
    if (entry.triggers.some(t => msg.includes(t))) {
      const responses = entry.responses;
      return responses[Math.floor(Math.random() * responses.length)];
    }
  }

  // Default intelligent-sounding responses
  const defaultResponses = [
    `🧠 **Processing your query:** "${userMessage}"\n\nBased on my analysis, this is an interesting topic. Let me provide context:\n\nCyberChat is designed to handle complex communication scenarios. Could you provide more specific details so I can give you the most accurate response?`,
    `⚡ **CyberAI Response:**\n\nI've analyzed your message. Here are my insights:\n\n• Your query relates to communication and digital interaction\n• CyberChat handles this seamlessly\n• Multiple features are available to address this\n\nWould you like me to elaborate on any specific aspect?`,
    `🤖 **Analyzing:** "${userMessage}"\n\nThank you for your question! CyberAI is trained on extensive data about secure communications, digital privacy, and modern collaboration tools.\n\nIs there a specific feature of CyberChat you'd like to explore?`,
    `💡 **Smart Response:**\n\nGreat question! Here's what I know about this:\n\nIn the context of modern communications, what you're describing is quite relevant. CyberChat's architecture is specifically designed to handle these scenarios efficiently.\n\nWhat else would you like to know?`
  ];

  return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
}

// POST /api/ai/chat - Send message to AI
router.post('/chat', auth, async (req, res) => {
  try {
    const { message, conversationId } = req.body;
    if (!message?.trim()) return res.status(400).json({ error: 'Message required' });

    let conversation;
    if (conversationId) {
      conversation = await AIConversation.findOne({ conversationId, userId: req.user.id });
    }

    if (!conversation) {
      conversation = new AIConversation({
        conversationId: `aiconv_${uuidv4()}`,
        userId: req.user.id,
        title: message.substring(0, 50),
        messages: []
      });
    }

    // Add user message
    conversation.messages.push({ role: 'user', content: message });

    // Generate AI response (simulated with delays for realism)
    const aiResponse = generateAIResponse(message);
    conversation.messages.push({ role: 'assistant', content: aiResponse });

    // Keep only last 100 messages per conversation
    if (conversation.messages.length > 100) {
      conversation.messages = conversation.messages.slice(-100);
    }

    await conversation.save();

    res.json({
      success: true,
      response: aiResponse,
      conversationId: conversation.conversationId
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ai/conversations - List user's AI conversations
router.get('/conversations', auth, async (req, res) => {
  try {
    const conversations = await AIConversation.find({
      userId: req.user.id,
      isArchived: false
    })
    .select('conversationId title updatedAt messages')
    .sort({ updatedAt: -1 })
    .limit(20)
    .lean();

    const summaries = conversations.map(c => ({
      conversationId: c.conversationId,
      title: c.title,
      updatedAt: c.updatedAt,
      messageCount: c.messages.length,
      lastMessage: c.messages[c.messages.length - 1]?.content?.substring(0, 80) || ''
    }));

    res.json({ success: true, conversations: summaries });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ai/conversations/:id - Get conversation history
router.get('/conversations/:id', auth, async (req, res) => {
  try {
    const conversation = await AIConversation.findOne({
      conversationId: req.params.id,
      userId: req.user.id
    }).lean();

    if (!conversation) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true, conversation });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/ai/conversations/:id
router.delete('/conversations/:id', auth, async (req, res) => {
  try {
    await AIConversation.deleteOne({ conversationId: req.params.id, userId: req.user.id });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
