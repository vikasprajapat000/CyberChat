// frontend/src/components/CommunitiesPanel.jsx
import React, { useState, useEffect } from 'react';
import { Search, Plus, Users, Hash, Globe, Lock, CheckCircle, X } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:5000' : 'https://cyberchat-1-nhlc.onrender.com');

const COMMUNITY_EMOJIS = ['🌐', '🎮', '💻', '🎨', '🎵', '📚', '💪', '🚀', '🔬', '🎭', '⚽', '🍕'];
const CATEGORIES = ['General', 'Technology', 'Gaming', 'Creative', 'Education', 'Business', 'Sports', 'Entertainment'];

function CommunityCreateModal({ onClose, onCreated }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General');
  const [isPublic, setIsPublic] = useState(true);
  const [icon, setIcon] = useState('🌐');
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem('cc_token');

  const submit = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/communities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name, description, category, isPublic, icon })
      });
      const data = await res.json();
      if (data.success) { onCreated?.(data.community); onClose(); }
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  return (
    <div className="modal-overlay" id="community-create-overlay">
      <div style={{ background: 'var(--bg-panel)', borderRadius: 20, border: '1px solid var(--border-glass)', width: 480, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-lg)', animation: 'scaleIn 0.2s cubic-bezier(0.16,1,0.3,1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border-glass)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Create Community</h3>
          <button className="modal-close-btn" onClick={onClose} id="community-create-close"><X size={18} /></button>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Icon picker */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Icon</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {COMMUNITY_EMOJIS.map(e => (
                <div key={e} onClick={() => setIcon(e)} id={`community-icon-${e}`}
                  style={{ width: 36, height: 36, borderRadius: 8, background: icon === e ? 'var(--primary-light)' : 'var(--bg-app)', border: `2px solid ${icon === e ? 'var(--primary)' : 'transparent'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 18, transition: 'all 0.15s' }}>
                  {e}
                </div>
              ))}
            </div>
          </div>
          <div className="gs-field">
            <label>Community Name *</label>
            <input className="gs-input" id="community-name-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Cyber Developers" maxLength={100} />
          </div>
          <div className="gs-field">
            <label>Description</label>
            <textarea className="gs-textarea" id="community-desc-input" value={description} onChange={e => setDescription(e.target.value)} placeholder="What is this community about?" rows={3} maxLength={500} />
          </div>
          <div className="gs-field">
            <label>Category</label>
            <select className="gs-input" id="community-category-select" value={category} onChange={e => setCategory(e.target.value)}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} id="community-public-toggle" style={{ width: 16, height: 16, accentColor: 'var(--primary)' }} />
            <label htmlFor="community-public-toggle" style={{ fontSize: 14, color: 'var(--text-primary)', cursor: 'pointer' }}>
              Public Community (anyone can find & join)
            </label>
          </div>
          <button className="gs-save-btn" id="community-create-submit" onClick={submit} disabled={loading || !name.trim()}>
            {loading ? '⏳ Creating...' : '🌐 Create Community'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CommunitiesPanel({ user, showToast }) {
  const [tab, setTab] = useState('my'); // my | discover
  const [myCommunities, setMyCommunities] = useState([]);
  const [discoverCommunities, setDiscoverCommunities] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const token = localStorage.getItem('cc_token');

  const fetchMy = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/communities/my`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setMyCommunities(data.communities || []);
    } catch {}
  };

  const fetchDiscover = async () => {
    try {
      const url = search ? `${BACKEND_URL}/api/communities?q=${encodeURIComponent(search)}` : `${BACKEND_URL}/api/communities`;
      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setDiscoverCommunities(data.communities || []);
    } catch {}
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchMy(), fetchDiscover()]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (tab === 'discover') {
      const t = setTimeout(fetchDiscover, 400);
      return () => clearTimeout(t);
    }
  }, [search, tab]);

  const joinCommunity = async (communityId) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/communities/${communityId}/join`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        showToast?.('Joined community! 🎉', 'success');
        fetchMy();
        fetchDiscover();
      } else {
        showToast?.(data.error || 'Failed to join', 'error');
      }
    } catch {}
  };

  const isMember = (community) => community.members?.some(m => m.userId === user?.id);

  const displayList = tab === 'my' ? myCommunities : discoverCommunities;

  return (
    <div className="communities-panel">
      <div className="communities-header">
        <h3>Communities</h3>
        <button className="community-create-btn" id="community-create-btn" onClick={() => setCreateOpen(true)}>
          <Plus size={13} /> New
        </button>
      </div>

      {/* Search */}
      <div className="communities-search">
        <Search size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        <input
          id="communities-search-input"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search communities..."
        />
      </div>

      {/* Tabs */}
      <div className="communities-tabs">
        <button className={`communities-tab ${tab === 'my' ? 'active' : ''}`} id="communities-tab-my" onClick={() => setTab('my')}>
          My Communities
        </button>
        <button className={`communities-tab ${tab === 'discover' ? 'active' : ''}`} id="communities-tab-discover" onClick={() => { setTab('discover'); fetchDiscover(); }}>
          Discover
        </button>
      </div>

      {/* List */}
      <div className="communities-list">
        {loading && <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><div className="notif-loading-pulse" /></div>}

        {!loading && displayList.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>{tab === 'my' ? '🌐' : '🔍'}</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>
              {tab === 'my' ? 'No communities yet' : 'No communities found'}
            </div>
            <div style={{ fontSize: 12, marginTop: 4 }}>
              {tab === 'my' ? 'Create or join a community to get started!' : 'Try a different search term'}
            </div>
          </div>
        )}

        {displayList.map(community => {
          const member = isMember(community);
          return (
            <div key={community.communityId} className="community-card" id={`community-card-${community.communityId}`}>
              <div className="community-icon">
                {community.icon ? community.icon : community.name?.charAt(0)}
              </div>
              <div className="community-info">
                <div className="community-name">
                  {community.name}
                  {community.isVerified && <CheckCircle size={14} className="community-verified" />}
                  {!community.isPublic && <Lock size={11} style={{ color: 'var(--text-muted)' }} />}
                </div>
                <div className="community-desc">{community.description || 'No description'}</div>
                <div className="community-meta">
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Users size={11} /> {community.memberCount || community.members?.length || 0} members
                  </span>
                  <span className="community-channels-count">
                    <Hash size={11} /> {community.channels?.length || 0} channels
                  </span>
                  <span style={{ background: 'var(--bg-app)', padding: '1px 6px', borderRadius: 4, fontSize: 10 }}>
                    {community.category || 'General'}
                  </span>
                </div>
              </div>
              {member ? (
                <div className="community-joined-badge">✓ Joined</div>
              ) : (
                <button
                  className="community-join-btn"
                  id={`community-join-${community.communityId}`}
                  onClick={() => joinCommunity(community.communityId)}
                >
                  Join
                </button>
              )}
            </div>
          );
        })}
      </div>

      {createOpen && (
        <CommunityCreateModal
          onClose={() => setCreateOpen(false)}
          onCreated={(c) => {
            showToast?.(`Community "${c.name}" created! 🎉`, 'success');
            fetchMy();
          }}
        />
      )}
    </div>
  );
}
