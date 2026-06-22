// frontend/src/components/StoriesPanel.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Plus, X, ChevronLeft, ChevronRight, Eye, Camera, Type, Upload } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:5000' : 'https://cyberchat-d26c.onrender.com');

const BG_COLORS = [
  '#0a0a1a', '#1a0a2e', '#0a1a2e', '#1a2e0a',
  '#2e0a1a', '#0a2e2e', '#1a1a00', '#2e1a00',
  'linear-gradient(135deg,#0d0221,#1a0d42)', 
  'linear-gradient(135deg,#021428,#0a2a50)',
  'linear-gradient(135deg,#1a0028,#3d006a)',
  'linear-gradient(135deg,#002800,#006a00)'
];

const TEXT_COLORS = ['#00f5ff', '#bf00ff', '#39ff14', '#ff0099', '#fff200', '#ffffff', '#ff6b35', '#ff3366'];

const STORY_EMOJIS = ['🔥', '💫', '⚡', '🎯', '💎', '🚀', '🌌', '🎭', '💡', '🔮', '⚔️', '🛡️'];

function timeAgo(date) {
  const seconds = Math.floor((Date.now() - new Date(date)) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function getAvatarClass(username) {
  const classes = ['bg-av-1', 'bg-av-2', 'bg-av-3', 'bg-av-4', 'bg-av-5', 'bg-av-6', 'bg-av-7', 'bg-av-8'];
  let hash = 0;
  for (let i = 0; i < username?.length; i++) hash = username.charCodeAt(i) + ((hash << 5) - hash);
  return classes[Math.abs(hash) % classes.length];
}

// Story Viewer Component
function StoryViewer({ feed, startUserIdx, startStoryIdx = 0, onClose, onView, currentUserId }) {
  const [userIdx, setUserIdx] = useState(startUserIdx);
  const [storyIdx, setStoryIdx] = useState(startStoryIdx);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef(null);
  const DURATION = 5000;

  const currentUser = feed[userIdx];
  const currentStory = currentUser?.stories[storyIdx];

  useEffect(() => {
    if (!currentStory) return;
    onView?.(currentStory.storyId);
    setProgress(0);

    timerRef.current = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(timerRef.current);
          goNext();
          return 0;
        }
        return prev + (100 / (DURATION / 100));
      });
    }, 100);

    return () => clearInterval(timerRef.current);
  }, [storyIdx, userIdx]);

  const goNext = () => {
    const stories = feed[userIdx]?.stories || [];
    if (storyIdx < stories.length - 1) {
      setStoryIdx(s => s + 1);
    } else if (userIdx < feed.length - 1) {
      setUserIdx(u => u + 1);
      setStoryIdx(0);
    } else {
      onClose();
    }
  };

  const goPrev = () => {
    if (storyIdx > 0) {
      setStoryIdx(s => s - 1);
    } else if (userIdx > 0) {
      setUserIdx(u => u - 1);
      setStoryIdx(0);
    }
  };

  if (!currentStory) return null;
  const stories = currentUser?.stories || [];

  const bg = currentStory.type === 'text'
    ? (currentStory.bgColor?.startsWith('linear') ? currentStory.bgColor : currentStory.bgColor)
    : '#000';

  return (
    <div className="story-viewer-overlay" id="story-viewer-overlay" onClick={onClose}>
      <div className="story-viewer-container" onClick={e => e.stopPropagation()}>
        {/* Progress bars */}
        <div className="story-progress-bars">
          {stories.map((_, i) => (
            <div key={i} className="story-progress-bar">
              <div
                className="story-progress-fill"
                style={{
                  width: i < storyIdx ? '100%' : i === storyIdx ? `${progress}%` : '0%',
                  transition: i === storyIdx ? 'none' : 'none'
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="story-viewer-header">
          <div className="story-viewer-avatar">
            {currentUser.userAvatar
              ? <img src={currentUser.userAvatar} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              : <div className={`initials-avatar ${getAvatarClass(currentUser.username)}`} style={{ width: 36, height: 36, fontSize: 14 }}>
                  {currentUser.username?.charAt(0).toUpperCase()}
                </div>
            }
          </div>
          <div>
            <div className="story-viewer-name">{currentUser.username}</div>
            <div className="story-viewer-time">{timeAgo(currentStory.createdAt)}</div>
          </div>
          <button className="story-viewer-close" id="story-viewer-close" onClick={onClose}><X size={16} /></button>
        </div>

        {/* Story Content */}
        <div className="story-content" style={{ background: bg }}>
          {currentStory.type === 'image' && (
            <img src={currentStory.mediaUrl} alt="" className="story-content-image" />
          )}
          {currentStory.type === 'video' && (
            <video src={currentStory.mediaUrl} className="story-content-video" autoPlay muted loop />
          )}
          {currentStory.type === 'text' && (
            <div className="story-content-text">
              {currentStory.emoji && <div className="story-text-emoji">{currentStory.emoji}</div>}
              <div
                className="story-text-content"
                style={{ color: currentStory.textColor || '#fff' }}
              >
                {currentStory.text}
              </div>
              {currentStory.userId === currentUserId && (
                <div style={{ position: 'absolute', bottom: 60, right: 16, fontSize: 12, color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Eye size={14} /> {currentStory.viewers?.length || 0} views
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tap zones */}
        <button className="story-tap-prev" onClick={goPrev} id="story-tap-prev" />
        <button className="story-tap-next" onClick={goNext} id="story-tap-next" />

        {/* Reaction bar */}
        <div className="story-reactions-bar">
          {['❤️', '🔥', '😮', '😂', '👏'].map(emoji => (
            <button key={emoji} className="story-react-btn" onClick={() => {}}>
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Story Creator Component
export function StoryCreator({ onClose, onCreated }) {
  const [type, setType] = useState('text');
  const [text, setText] = useState('');
  const [bgColor, setBgColor] = useState(BG_COLORS[0]);
  const [textColor, setTextColor] = useState(TEXT_COLORS[0]);
  const [emoji, setEmoji] = useState('');
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState('');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);
  const token = localStorage.getItem('cc_token');

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setFilePreview(URL.createObjectURL(f));
    setType(f.type.startsWith('video/') ? 'video' : 'image');
  };

  const submit = async () => {
    if (type === 'text' && !text.trim()) return;
    if ((type === 'image' || type === 'video') && !file) return;
    setLoading(true);

    try {
      let mediaUrl = '';
      if (file) {
        const fd = new FormData();
        fd.append('file', file);
        const uploadRes = await fetch(`${BACKEND_URL}/api/upload`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: fd
        });
        const uploadData = await uploadRes.json();
        mediaUrl = uploadData.fileUrl ? `${BACKEND_URL}${uploadData.fileUrl}` : '';
      }

      const res = await fetch(`${BACKEND_URL}/api/stories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ type, text, bgColor, textColor, emoji, mediaUrl })
      });
      const data = await res.json();
      if (data.success) {
        onCreated?.();
        onClose();
      }
    } catch (err) {
      console.error('Story create error:', err);
    }
    setLoading(false);
  };

  return (
    <div className="story-creator-overlay" id="story-creator-overlay">
      <div className="story-creator-modal">
        <div className="story-creator-header">
          <h3>Create Story</h3>
          <button className="modal-close-btn" onClick={onClose} id="story-creator-close"><X size={18} /></button>
        </div>

        <div className="story-type-tabs">
          {[
            { id: 'text', label: 'Text', icon: <Type size={14} /> },
            { id: 'image', label: 'Photo', icon: <Camera size={14} /> },
            { id: 'video', label: 'Video', icon: <Upload size={14} /> }
          ].map(t => (
            <button key={t.id} className={`story-type-tab ${type === t.id ? 'active' : ''}`}
              id={`story-type-${t.id}`}
              onClick={() => { setType(t.id); setFile(null); setFilePreview(''); }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <div className="story-creator-body">
          {/* Preview */}
          <div className="story-preview" style={{
            background: type === 'text' ? (bgColor.startsWith('linear') ? bgColor : bgColor) : '#000'
          }}>
            {type === 'text' && (
              <div style={{ textAlign: 'center', padding: '20px', color: textColor }}>
                {emoji && <div style={{ fontSize: 36 }}>{emoji}</div>}
                <div style={{ fontSize: 20, fontWeight: 700, marginTop: 8 }}>{text || 'Your story text...'}</div>
              </div>
            )}
            {(type === 'image') && filePreview && <img src={filePreview} alt="" style={{ maxWidth: '100%', maxHeight: 200, objectFit: 'contain' }} />}
            {(type === 'video') && filePreview && <video src={filePreview} style={{ maxWidth: '100%', maxHeight: 200 }} muted />}
            {(type === 'image' || type === 'video') && !filePreview && (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                <Upload size={32} />
                <div style={{ fontSize: 13, marginTop: 8 }}>Upload {type}</div>
              </div>
            )}
          </div>

          {/* Text input */}
          {type === 'text' && (
            <>
              <textarea
                className="story-text-input"
                id="story-text-input"
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Type your story..."
                rows={3}
                maxLength={200}
              />
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Background Color</div>
                <div className="story-bg-picker">
                  {BG_COLORS.map((c, i) => (
                    <div key={i} className={`story-bg-swatch ${bgColor === c ? 'selected' : ''}`}
                      style={{ background: c }} onClick={() => setBgColor(c)} id={`story-bg-${i}`} />
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Text Color</div>
                <div className="story-bg-picker">
                  {TEXT_COLORS.map((c, i) => (
                    <div key={i} className={`story-bg-swatch ${textColor === c ? 'selected' : ''}`}
                      style={{ background: c, border: '2px solid rgba(255,255,255,0.2)' }}
                      onClick={() => setTextColor(c)} id={`story-textcolor-${i}`} />
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Emoji</div>
                <div className="story-bg-picker" style={{ flexWrap: 'wrap' }}>
                  {STORY_EMOJIS.map((e, i) => (
                    <div key={i} className={`story-bg-swatch ${emoji === e ? 'selected' : ''}`}
                      style={{ background: 'var(--bg-app)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}
                      onClick={() => setEmoji(emoji === e ? '' : e)} id={`story-emoji-${i}`}>{e}</div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* File upload */}
          {(type === 'image' || type === 'video') && (
            <>
              <input ref={fileInputRef} type="file" accept={type === 'image' ? 'image/*' : 'video/*'}
                style={{ display: 'none' }} onChange={handleFileChange} id="story-file-input" />
              <button
                style={{ padding: '12px', borderRadius: 12, border: '1.5px dashed var(--border-glass)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', width: '100%', fontSize: 14 }}
                onClick={() => fileInputRef.current?.click()} id="story-upload-btn">
                <Upload size={16} style={{ display: 'inline', marginRight: 6 }} />
                {file ? file.name : `Choose ${type}`}
              </button>
            </>
          )}

          <button
            className="story-submit-btn"
            id="story-submit-btn"
            onClick={submit}
            disabled={loading || (type === 'text' && !text.trim()) || ((type === 'image' || type === 'video') && !file)}
          >
            {loading ? '⏳ Posting...' : '📸 Post Story'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function StoriesPanel({ user, showToast }) {
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUserIdx, setViewerUserIdx] = useState(0);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const token = localStorage.getItem('cc_token');

  const fetchFeed = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/stories/feed`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setFeed(data.feed || []);
    } catch (err) {
      console.error('Stories fetch error:', err);
    }
    setLoading(false);
  };

  useEffect(() => { fetchFeed(); }, []);

  const openViewer = (userIdx) => {
    setViewerUserIdx(userIdx);
    setViewerOpen(true);
  };

  const markViewed = async (storyId) => {
    try {
      await fetch(`${BACKEND_URL}/api/stories/${storyId}/view`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch {}
  };

  const myFeedEntry = feed.find(f => f.userId === user?.id);
  const otherFeed = feed.filter(f => f.userId !== user?.id);

  return (
    <div className="stories-panel">
      <div className="stories-panel-header">
        <h3>Stories</h3>
        <button className="story-create-btn" id="story-create-btn" onClick={() => setCreatorOpen(true)}>
          <Plus size={14} /> Add Story
        </button>
      </div>

      <div className="stories-scroll">
        {/* My Story */}
        <div className="story-my-section">
          <div className="story-section-label">My Story</div>
          {myFeedEntry ? (
            <div className="story-user-item" id="my-story-item" onClick={() => openViewer(feed.indexOf(myFeedEntry))}>
              <div className="story-ring-wrapper">
                <div className="story-ring" />
                <div className="story-avatar-wrapper">
                  {user?.profilePhoto
                    ? <img src={`${BACKEND_URL}${user.profilePhoto}`} className="story-avatar-img" alt="" />
                    : <div className={`story-avatar-initials initials-avatar ${getAvatarClass(user?.username)}`}>
                        {user?.username?.charAt(0).toUpperCase()}
                      </div>
                  }
                </div>
                <div className="story-count-badge">{myFeedEntry.stories.length}</div>
              </div>
              <div className="story-user-info">
                <div className="story-user-name">My Story</div>
                <div className="story-user-time">{myFeedEntry.stories.length} update{myFeedEntry.stories.length !== 1 ? 's' : ''}</div>
              </div>
            </div>
          ) : (
            <div className="story-user-item" id="my-story-create-btn" onClick={() => setCreatorOpen(true)}
              style={{ cursor: 'pointer', border: '1.5px dashed var(--border-glass)', borderRadius: 12 }}>
              <div className="story-ring-wrapper" style={{ position: 'relative' }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'var(--bg-app)', border: '1.5px dashed var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                  <Plus size={22} />
                </div>
              </div>
              <div className="story-user-info">
                <div className="story-user-name">Add to my story</div>
                <div className="story-user-time">Share what's on your mind</div>
              </div>
            </div>
          )}
        </div>

        {/* Recent Updates */}
        {otherFeed.length > 0 && (
          <div className="story-contacts-section">
            <div className="story-section-label">Recent Updates</div>
            {otherFeed.map((userFeed, idx) => {
              const hasUnviewed = userFeed.stories.some(s => !s.viewers?.some(v => v.userId === user?.id));
              return (
                <div key={userFeed.userId} className="story-user-item" id={`story-user-${userFeed.userId}`}
                  onClick={() => openViewer(feed.indexOf(userFeed))}>
                  <div className="story-ring-wrapper">
                    <div className={`story-ring ${!hasUnviewed ? 'viewed' : ''}`} />
                    <div className="story-avatar-wrapper">
                      {userFeed.userAvatar
                        ? <img src={userFeed.userAvatar} className="story-avatar-img" alt="" />
                        : <div className={`story-avatar-initials initials-avatar ${getAvatarClass(userFeed.username)}`}>
                            {userFeed.username?.charAt(0).toUpperCase()}
                          </div>
                      }
                    </div>
                    <div className="story-count-badge">{userFeed.stories.length}</div>
                  </div>
                  <div className="story-user-info">
                    <div className="story-user-name">{userFeed.username}</div>
                    <div className="story-user-time">{timeAgo(userFeed.stories[userFeed.stories.length - 1]?.createdAt)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loading && feed.length === 0 && !myFeedEntry && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📸</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>No stories yet</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Add your first story to share with contacts!</div>
          </div>
        )}

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
            <div className="notif-loading-pulse" />
          </div>
        )}
      </div>

      {viewerOpen && feed.length > 0 && (
        <StoryViewer
          feed={feed}
          startUserIdx={viewerUserIdx}
          onClose={() => setViewerOpen(false)}
          onView={markViewed}
          currentUserId={user?.id}
        />
      )}

      {creatorOpen && (
        <StoryCreator
          onClose={() => setCreatorOpen(false)}
          onCreated={() => { fetchFeed(); showToast?.('Story posted! 🎉', 'success'); }}
        />
      )}
    </div>
  );
}
