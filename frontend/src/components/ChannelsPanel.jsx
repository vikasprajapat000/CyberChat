// frontend/src/components/ChannelsPanel.jsx
import React, { useState, useEffect } from 'react';
import { Search, Plus, CheckCircle, Bell, BellOff, Megaphone, X, Users } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:5000' : 'https://cyberchat-1-qiqj.onrender.com');

const CHANNEL_EMOJIS = ['📢', '🎙️', '📰', '💡', '🎯', '🔔', '🌟', '🎬', '🎤', '📊', '🏆', '🛒'];
const CHANNEL_CATEGORIES = ['General', 'News', 'Technology', 'Business', 'Entertainment', 'Sports', 'Education', 'Gaming'];

function ChannelCreateModal({ onClose, onCreated }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General');
  const [icon, setIcon] = useState('📢');
  const [broadcastOnly, setBroadcastOnly] = useState(true);
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem('cc_token');

  const submit = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/channels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name, description, category, icon, broadcastOnly, isPublic })
      });
      const data = await res.json();
      if (data.success) { onCreated?.(data.channel); onClose(); }
    } catch {}
    setLoading(false);
  };

  return (
    <div className="modal-overlay" id="channel-create-overlay">
      <div style={{ background: 'var(--bg-panel)', borderRadius: 20, border: '1px solid var(--border-glass)', width: 480, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-lg)', animation: 'scaleIn 0.2s cubic-bezier(0.16,1,0.3,1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border-glass)' }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Create Channel</h3>
          <button className="modal-close-btn" onClick={onClose} id="channel-create-close"><X size={18} /></button>
        </div>
        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Icon</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {CHANNEL_EMOJIS.map(e => (
                <div key={e} onClick={() => setIcon(e)} id={`channel-icon-${e}`}
                  style={{ width: 36, height: 36, borderRadius: 8, background: icon === e ? 'rgba(59,130,246,0.15)' : 'var(--bg-app)', border: `2px solid ${icon === e ? '#3b82f6' : 'transparent'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 18, transition: 'all 0.15s' }}>
                  {e}
                </div>
              ))}
            </div>
          </div>
          <div className="gs-field">
            <label>Channel Name *</label>
            <input className="gs-input" id="channel-name-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Tech Updates" maxLength={100} />
          </div>
          <div className="gs-field">
            <label>Description</label>
            <textarea className="gs-textarea" id="channel-desc-input" value={description} onChange={e => setDescription(e.target.value)} placeholder="What will you broadcast?" rows={3} maxLength={500} />
          </div>
          <div className="gs-field">
            <label>Category</label>
            <select className="gs-input" id="channel-category-select" value={category} onChange={e => setCategory(e.target.value)}>
              {CHANNEL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input type="checkbox" checked={broadcastOnly} onChange={e => setBroadcastOnly(e.target.checked)} id="channel-broadcast-toggle" style={{ width: 16, height: 16, accentColor: '#3b82f6' }} />
              <label htmlFor="channel-broadcast-toggle" style={{ fontSize: 14, color: 'var(--text-primary)', cursor: 'pointer' }}>
                Broadcast only (only admins can post)
              </label>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} id="channel-public-toggle" style={{ width: 16, height: 16, accentColor: '#3b82f6' }} />
              <label htmlFor="channel-public-toggle" style={{ fontSize: 14, color: 'var(--text-primary)', cursor: 'pointer' }}>
                Public Channel (discoverable)
              </label>
            </div>
          </div>
          <button className="gs-save-btn" id="channel-create-submit" onClick={submit} disabled={loading || !name.trim()}
            style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)' }}>
            {loading ? '⏳ Creating...' : '📢 Create Channel'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ChannelsPanel({ user, showToast }) {
  const [tab, setTab] = useState('subscribed');
  const [myChannels, setMyChannels] = useState([]);
  const [discoverChannels, setDiscoverChannels] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const token = localStorage.getItem('cc_token');

  const fetchMyChannels = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/channels/my`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setMyChannels(data.channels || []);
    } catch {}
  };

  const fetchDiscover = async () => {
    try {
      const url = search ? `${BACKEND_URL}/api/channels?q=${encodeURIComponent(search)}` : `${BACKEND_URL}/api/channels`;
      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setDiscoverChannels(data.channels || []);
    } catch {}
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchMyChannels(), fetchDiscover()]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (tab === 'discover') {
      const t = setTimeout(fetchDiscover, 400);
      return () => clearTimeout(t);
    }
  }, [search, tab]);

  const toggleSubscribe = async (channelId) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/channels/${channelId}/subscribe`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        showToast?.(data.subscribed ? 'Subscribed! 🔔' : 'Unsubscribed', data.subscribed ? 'success' : 'info');
        fetchMyChannels();
        fetchDiscover();
      }
    } catch {}
  };

  const isSubscribed = (channel) => channel.subscribers?.some(s => s.userId === user?.id);

  const displayList = tab === 'subscribed' ? myChannels : discoverChannels;

  return (
    <div className="channels-panel">
      <div className="channels-header">
        <h3>Channels</h3>
        <button
          id="channel-create-btn"
          onClick={() => setCreateOpen(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 9999, background: 'linear-gradient(135deg,#3b82f6,#6366f1)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
          <Plus size={13} /> New
        </button>
      </div>

      {/* Search */}
      <div className="communities-search">
        <Search size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        <input id="channels-search-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search channels..." />
      </div>

      {/* Tabs */}
      <div className="communities-tabs">
        <button className={`communities-tab ${tab === 'subscribed' ? 'active' : ''}`} id="channels-tab-subscribed" onClick={() => setTab('subscribed')}>
          Subscribed
        </button>
        <button className={`communities-tab ${tab === 'discover' ? 'active' : ''}`} id="channels-tab-discover" onClick={() => { setTab('discover'); fetchDiscover(); }}>
          Discover
        </button>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading && <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><div className="notif-loading-pulse" /></div>}

        {!loading && displayList.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📢</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>
              {tab === 'subscribed' ? 'No channels yet' : 'No channels found'}
            </div>
            <div style={{ fontSize: 12, marginTop: 4 }}>
              {tab === 'subscribed' ? 'Subscribe to channels to stay updated!' : 'Try a different search'}
            </div>
          </div>
        )}

        {displayList.map(channel => {
          const subscribed = isSubscribed(channel);
          return (
            <div key={channel.channelId} className="channel-card" id={`channel-card-${channel.channelId}`}>
              <div className="channel-icon">
                {channel.icon || '📢'}
              </div>
              <div className="channel-info">
                <div className="channel-name">
                  {channel.name}
                  {channel.isVerified && <CheckCircle size={13} style={{ color: '#3b82f6' }} />}
                </div>
                <div className="channel-desc">{channel.description || 'No description'}</div>
                <div className="channel-meta">
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Users size={11} /> {channel.subscriberCount || 0} subscribers
                  </span>
                  {channel.broadcastOnly && (
                    <span style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6', padding: '1px 6px', borderRadius: 4, fontSize: 10 }}>
                      Broadcast
                    </span>
                  )}
                  <span style={{ background: 'var(--bg-app)', padding: '1px 6px', borderRadius: 4, fontSize: 10 }}>
                    {channel.category || 'General'}
                  </span>
                </div>
              </div>
              <button
                className={`channel-subscribe-btn ${subscribed ? 'subscribed' : ''}`}
                id={`channel-subscribe-${channel.channelId}`}
                onClick={() => toggleSubscribe(channel.channelId)}
              >
                {subscribed ? (
                  <><BellOff size={12} style={{ display: 'inline', marginRight: 4 }} /> Unsubscribe</>
                ) : (
                  <><Bell size={12} style={{ display: 'inline', marginRight: 4 }} /> Subscribe</>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {createOpen && (
        <ChannelCreateModal
          onClose={() => setCreateOpen(false)}
          onCreated={(c) => { showToast?.(`Channel "${c.name}" created! 🎉`, 'success'); fetchMyChannels(); }}
        />
      )}
    </div>
  );
}
