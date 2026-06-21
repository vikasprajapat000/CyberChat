// frontend/src/components/AIAssistant.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, Plus, Sparkles, Zap, Shield, MessageSquare, Code, MapPin, Flame } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:5000' : 'https://cyberchat-d26c.onrender.com');

const SUGGESTIONS = [
  { icon: '🔐', text: 'How does CyberChat protect my messages?' },
  { icon: '📹', text: 'How do I start a video call?' },
  { icon: '🌍', text: 'How do communities work?' },
  { icon: '⭐', text: 'What features do premium users get?' },
  { icon: '🔥', text: 'How do snap streaks work?' },
  { icon: '📍', text: 'How can I share my live location?' },
  { icon: '💻', text: 'Help me write a JavaScript function' },
  { icon: '🤖', text: 'What can you do?' }
];

function formatMessage(text) {
  // Bold: **text**
  let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Line breaks
  formatted = formatted.replace(/\n/g, '<br/>');
  return formatted;
}

export default function AIAssistant({ user }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const token = localStorage.getItem('cc_token');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const sendMessage = async (text) => {
    const msg = (text || input).trim();
    if (!msg) return;

    const userMsg = { role: 'user', content: msg, id: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const res = await fetch(`${BACKEND_URL}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ message: msg, conversationId })
      });

      const data = await res.json();

      if (data.success) {
        if (data.conversationId && !conversationId) setConversationId(data.conversationId);
        // Simulate typing delay for realism
        await new Promise(r => setTimeout(r, 600 + Math.random() * 800));
        setIsTyping(false);
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.response,
          id: Date.now() + 1
        }]);
      } else {
        setIsTyping(false);
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: '⚠️ Unable to process your request. Please try again.',
          id: Date.now() + 1
        }]);
      }
    } catch (err) {
      setIsTyping(false);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '🔌 Connection error. Please check your network and try again.',
        id: Date.now() + 1
      }]);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const startNew = () => {
    setMessages([]);
    setConversationId(null);
    setInput('');
    inputRef.current?.focus();
  };

  const userInitial = user?.username?.charAt(0).toUpperCase() || 'U';

  return (
    <div className="ai-panel">
      {/* Header */}
      <div className="ai-panel-header">
        <div className="ai-avatar" id="ai-avatar-btn">
          🤖
          <div className="ai-avatar-pulse" />
        </div>
        <div className="ai-header-info">
          <div className="ai-name">CyberAI Assistant</div>
          <div className="ai-status">
            <div className="ai-status-dot" />
            Online &mdash; Powered by CyberChat Intelligence
          </div>
        </div>
        <button className="ai-new-btn" onClick={startNew} id="ai-new-conversation-btn">
          <Plus size={14} /> New Chat
        </button>
      </div>

      {/* Messages */}
      <div className="ai-messages" id="ai-messages-container">
        {messages.length === 0 ? (
          <div className="ai-welcome">
            <div className="ai-welcome-avatar">🤖</div>
            <div className="ai-welcome-title">Hello, {user?.username || 'Cyber User'}!</div>
            <div className="ai-welcome-desc">
              I'm CyberAI — your intelligent assistant inside CyberChat. I can help you with platform features, answer questions, assist with coding, and much more.
            </div>
            <div className="ai-suggestions">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  className="ai-suggestion-btn"
                  id={`ai-suggestion-${i}`}
                  onClick={() => sendMessage(s.text)}
                >
                  {s.icon} {s.text}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div key={msg.id} className={`ai-message ${msg.role}`} id={`ai-msg-${msg.id}`}>
                <div className="ai-msg-avatar">
                  {msg.role === 'assistant' ? '🤖' : userInitial}
                </div>
                <div
                  className="ai-msg-bubble"
                  dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
                />
              </div>
            ))}
            {isTyping && (
              <div className="ai-message assistant" id="ai-typing-indicator">
                <div className="ai-msg-avatar">🤖</div>
                <div className="ai-msg-bubble">
                  <div className="ai-typing-indicator">
                    <div className="ai-typing-dot" />
                    <div className="ai-typing-dot" />
                    <div className="ai-typing-dot" />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="ai-input-area">
        <textarea
          ref={inputRef}
          className="ai-input"
          id="ai-message-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask CyberAI anything..."
          rows={1}
          disabled={isTyping}
        />
        <button
          className="ai-send-btn"
          id="ai-send-btn"
          onClick={() => sendMessage()}
          disabled={isTyping || !input.trim()}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
