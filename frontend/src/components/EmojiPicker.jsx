// frontend/src/components/EmojiPicker.jsx
import React, { useState } from 'react';

const EMOJI_CATEGORIES = [
  {
    id: 'smileys',
    name: 'Smileys',
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', 
      '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥸', 
      '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', 
      '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗',
      '🤔', '🫣', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲',
      '🥱', '😴', '🤤', '😪', '😵', '😵‍💫', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '💩'
    ]
  },
  {
    id: 'gestures',
    name: 'Gestures',
    emojis: [
      '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🫰', '🤟', '🤘', '🤙', '👈', 
      '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', 
      '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾'
    ]
  },
  {
    id: 'hearts',
    name: 'Hearts & Fun',
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️‍🔥', '❤️‍🩹', '❣️', '💕', '💞', 
      '💓', '💗', '💖', '💘', '💝', '💟', '💥', '🌟', '✨', '🔥', '💨', '💦', '👁️', '👄', '💤'
    ]
  },
  {
    id: 'food',
    name: 'Food & Drink',
    emojis: [
      '🍎', '🍌', '🍉', '🍇', '🍓', '🫐', '🍒', '🍑', '🍍', '🥥', '🥝', '🍕', '🍔', '🍟', '🌭', 
      '🥪', '🌮', '🌯', '🥚', '🍳', '🍿', '🍩', '🍪', '🎂', '🧁', '🍫', '🍬', '🍭', '🍦', '🍧', 
      '🍨', '🍹', '🍺', '🍻', '🍷', '☕', '🥤'
    ]
  },
  {
    id: 'activities',
    name: 'Activities',
    emojis: [
      '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🪃', 
      '🎮', '🕹️', '🎰', '🎲', '🧩', '🎭', '🎨', '🎬', '🎤', '🎧', '🎸', '🎹', '🥁'
    ]
  }
];

function EmojiPicker({ onEmojiSelect }) {
  const [activeCategory, setActiveCategory] = useState('smileys');

  const activeEmojis = EMOJI_CATEGORIES.find(cat => cat.id === activeCategory)?.emojis || [];

  return (
    <div 
      className="glass-panel animate-scale" 
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '320px',
        height: '280px',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-lg)',
        border: '1px solid var(--border-glass)',
        overflow: 'hidden',
        backgroundColor: 'var(--bg-panel)',
        userSelect: 'none'
      }}
    >
      {/* Category Tabs Header */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border-glass)',
        backgroundColor: 'var(--bg-app)',
        padding: '4px'
      }}>
        {EMOJI_CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            style={{
              flex: 1,
              padding: '8px 4px',
              border: 'none',
              background: cat.id === activeCategory ? 'var(--bg-panel)' : 'transparent',
              color: cat.id === activeCategory ? 'var(--primary)' : 'var(--text-secondary)',
              fontSize: '11px',
              fontWeight: 600,
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'background-color var(--transition-fast), color var(--transition-fast)'
            }}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Emojis Grid Area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '12px',
        display: 'grid',
        gridTemplateColumns: 'repeat(8, 1fr)',
        gap: '6px',
        alignContent: 'start'
      }}>
        {activeEmojis.map((emoji, index) => (
          <button
            key={index}
            onClick={() => onEmojiSelect(emoji)}
            style={{
              border: 'none',
              background: 'none',
              fontSize: '20px',
              padding: '4px',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color var(--transition-fast), transform var(--transition-fast)'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--border-glass)';
              e.currentTarget.style.transform = 'scale(1.15)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

export default EmojiPicker;
