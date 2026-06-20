// frontend/src/components/PollCreator.jsx
import React, { useState } from 'react';
import { X, Plus, Trash } from 'lucide-react';

function PollCreator({
  onClose,
  onSubmit
}) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']); // Start with 2 empty options

  const handleAddOption = () => {
    if (options.length >= 6) {
      alert('Maximum 6 choices allowed.');
      return;
    }
    setOptions([...options, '']);
  };

  const handleRemoveOption = (index) => {
    if (options.length <= 2) {
      alert('Minimum 2 choices are required.');
      return;
    }
    setOptions(options.filter((_, idx) => idx !== index));
  };

  const handleOptionChange = (value, index) => {
    const updated = [...options];
    updated[index] = value;
    setOptions(updated);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanQuestion = question.trim();
    const cleanOptions = options.map(opt => opt.trim()).filter(Boolean);

    if (!cleanQuestion) {
      alert('Please enter a question.');
      return;
    }
    if (cleanOptions.length < 2) {
      alert('Please provide at least 2 non-empty options.');
      return;
    }

    onSubmit(cleanQuestion, cleanOptions);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 1100,
      backgroundColor: 'rgba(0,0,0,0.5)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '40px 20px',
      overflowY: 'auto',
      boxSizing: 'border-box'
    }}>
      <div 
        className="glass-panel animate-scale"
        style={{
          width: '100%',
          maxWidth: '400px',
          backgroundColor: 'var(--bg-panel)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          margin: 'auto'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Outfit' }}>
            Create Interactive Poll
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Question */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label htmlFor="poll-question" style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Poll Question</label>
            <input
              id="poll-question"
              type="text"
              placeholder="e.g., Which feature should we code next?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              required
              style={{
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid var(--border-glass)',
                background: 'var(--bg-app)',
                color: 'var(--text-primary)',
                outline: 'none',
                fontSize: '14px'
              }}
            />
          </div>

          {/* Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Options</label>
            {options.map((option, index) => (
              <div key={index} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder={`Choice ${index + 1}`}
                  value={option}
                  onChange={(e) => handleOptionChange(e.target.value, index)}
                  required
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-glass)',
                    background: 'var(--bg-app)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    fontSize: '13px'
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleRemoveOption(index)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--danger)',
                    padding: '6px'
                  }}
                >
                  <Trash size={14} />
                </button>
              </div>
            ))}

            {options.length < 6 && (
              <button
                type="button"
                onClick={handleAddOption}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '6px 4px',
                  alignSelf: 'flex-start',
                  marginTop: '4px'
                }}
              >
                <Plus size={14} /> Add Choice
              </button>
            )}
          </div>

          <button
            type="submit"
            style={{
              backgroundColor: 'var(--primary)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '12px',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              marginTop: '10px'
            }}
          >
            Launch Poll
          </button>
        </form>
      </div>
    </div>
  );
}

export default PollCreator;
