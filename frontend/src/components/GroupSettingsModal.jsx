import { useState, useEffect } from 'react';
import {
  Settings, Users, Shield, Megaphone, Calendar, Bell, Camera,
  X, Check, Clock, ChevronDown, Plus, Trash2, Crown, UserCog, UserX, Lock, Upload
} from 'lucide-react';

const TIMER_OPTIONS = [
  { label: 'Off', value: 0 },
  { label: '5 seconds', value: 5 },
  { label: '10 seconds', value: 10 },
  { label: '30 seconds', value: 30 },
  { label: '1 minute', value: 60 },
  { label: '1 hour', value: 3600 },
  { label: '24 hours', value: 86400 },
  { label: '7 days', value: 604800 }
];

export default function GroupSettingsModal({ room, currentUser, allUsers, socket, apiBase, onClose, onUpdate }) {
  const [activeTab, setActiveTab] = useState('info');
  const [name, setName] = useState(room?.name || '');
  const [description, setDescription] = useState(room?.description || '');
  const [icon, setIcon] = useState(room?.icon || '💬');
  const [disappearingTimer, setDisappearingTimer] = useState(room?.disappearingTimer || 0);
  const [saving, setSaving] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [eventTitle, setEventTitle] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventStart, setEventStart] = useState('');
  const [eventEnd, setEventEnd] = useState('');
  const [groupPhotoFile, setGroupPhotoFile] = useState(null);
  const [groupPhotoPreview, setGroupPhotoPreview] = useState(room?.groupPhoto || null);
  const [toast, setToast] = useState('');

  const isAdmin = room?.admins?.includes(currentUser?.id);
  const isModerator = room?.moderators?.includes(currentUser?.id);
  const token = localStorage.getItem('cc_token');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const saveSettings = () => {
    if (!isAdmin) return;
    setSaving(true);
    socket.emit('update_group_settings', {
      roomId: room.id,
      name: name.trim(),
      description: description.trim(),
      icon: icon.trim(),
      disappearingTimer
    });
    setTimeout(() => {
      setSaving(false);
      showToast('Settings saved!');
      onUpdate && onUpdate();
    }, 600);
  };

  const uploadGroupPhoto = async (file) => {
    const formData = new FormData();
    formData.append('photo', file);
    try {
      const res = await fetch(`${apiBase}/api/upload/group-photo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        setGroupPhotoPreview(data.groupPhoto);
        showToast('Group photo updated!');
      }
    } catch (e) {
      showToast('Failed to upload photo');
    }
  };

  const sendAnnouncement = () => {
    if (!announcement.trim() || (!isAdmin && !isModerator)) return;
    socket.emit('group_announcement', { roomId: room.id, text: announcement.trim() });
    setAnnouncement('');
    showToast('Announcement sent!');
  };

  const createEvent = () => {
    if (!eventTitle.trim() || !eventStart) return;
    socket.emit('group_event_create', {
      roomId: room.id,
      title: eventTitle.trim(),
      description: eventDesc.trim(),
      startTime: new Date(eventStart).toISOString(),
      endTime: eventEnd ? new Date(eventEnd).toISOString() : null
    });
    setEventTitle(''); setEventDesc(''); setEventStart(''); setEventEnd('');
    showToast('Event created!');
  };

  const updateMemberRole = (targetUserId, role) => {
    if (!isAdmin) return;
    socket.emit('update_member_role', { roomId: room.id, targetUserId, role });
    showToast(`Role updated to ${role}`);
    onUpdate && onUpdate();
  };

  const removeMember = (targetUserId, username) => {
    if (!isAdmin && !isModerator) return;
    if (!confirm(`Remove ${username} from this group?`)) return;
    socket.emit('remove_group_member', { roomId: room.id, targetUserId });
    onUpdate && onUpdate();
  };

  const getMemberRole = (userId) => {
    if (room.creatorId === userId) return 'creator';
    if (room.admins?.includes(userId)) return 'admin';
    if (room.moderators?.includes(userId)) return 'moderator';
    return 'member';
  };

  const TABS = [
    { id: 'info', icon: <Settings size={16} />, label: 'Info' },
    { id: 'members', icon: <Users size={16} />, label: 'Members' },
    { id: 'announcements', icon: <Megaphone size={16} />, label: 'Announce' },
    { id: 'events', icon: <Calendar size={16} />, label: 'Events' },
    { id: 'security', icon: <Shield size={16} />, label: 'Security' }
  ];

  const EMOJI_OPTIONS = ['💬', '🚀', '🎮', '🏆', '🎵', '📚', '💡', '🔥', '⚡', '🌟', '🎯', '🛡️', '💻', '🌍', '🎭'];

  const members = room?.members?.map(mId => allUsers.find(u => u.id === mId)).filter(Boolean) || [];

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="group-settings-modal">
        {/* Header */}
        <div className="group-settings-header">
          <h3>Group Settings</h3>
          <button className="modal-close-btn" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Tabs */}
        <div className="group-settings-tabs">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`group-settings-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="group-settings-body">

          {/* INFO TAB */}
          {activeTab === 'info' && (
            <div className="gs-tab-content">
              {/* Group Photo */}
              <div className="gs-photo-section">
                <div className="gs-photo-avatar">
                  {groupPhotoPreview
                    ? <img src={`${apiBase}${groupPhotoPreview}`} alt="Group" />
                    : <span className="gs-photo-icon">{icon}</span>}
                  {isAdmin && (
                    <label className="gs-photo-edit-btn">
                      <Camera size={14} />
                      <input
                        type="file"
                        accept="image/*"
                        hidden
                        onChange={e => { if (e.target.files[0]) uploadGroupPhoto(e.target.files[0]); }}
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Group icon picker */}
              {isAdmin && (
                <div className="gs-field">
                  <label>Group Icon</label>
                  <div className="gs-emoji-grid">
                    {EMOJI_OPTIONS.map(em => (
                      <button
                        key={em}
                        className={`gs-emoji-btn ${icon === em ? 'selected' : ''}`}
                        onClick={() => setIcon(em)}
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="gs-field">
                <label>Group Name</label>
                <input
                  className="gs-input"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  disabled={!isAdmin}
                  placeholder="Enter group name..."
                  maxLength={60}
                />
              </div>

              <div className="gs-field">
                <label>Description</label>
                <textarea
                  className="gs-textarea"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  disabled={!isAdmin}
                  placeholder="What is this group about?"
                  rows={3}
                  maxLength={200}
                />
              </div>

              {isAdmin && (
                <button className="gs-save-btn" onClick={saveSettings} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              )}
            </div>
          )}

          {/* MEMBERS TAB */}
          {activeTab === 'members' && (
            <div className="gs-tab-content">
              <div className="gs-members-count">{members.length} members</div>
              <div className="gs-members-list">
                {members.map(member => {
                  const role = getMemberRole(member.id);
                  return (
                    <div key={member.id} className="gs-member-item">
                      <div className="gs-member-avatar">
                        {member.profilePhoto
                          ? <img src={`${apiBase}${member.profilePhoto}`} alt={member.username} />
                          : <div className="gs-member-initial">{member.username[0].toUpperCase()}</div>}
                      </div>
                      <div className="gs-member-info">
                        <div className="gs-member-name">
                          {member.username}
                          {member.id === currentUser?.id && <span className="gs-member-you">You</span>}
                        </div>
                        <div className={`gs-member-role gs-role-${role}`}>
                          {role === 'creator' && <Crown size={10} />}
                          {role === 'admin' && <Shield size={10} />}
                          {role === 'moderator' && <UserCog size={10} />}
                          {role}
                        </div>
                      </div>
                      {isAdmin && member.id !== currentUser?.id && role !== 'creator' && (
                        <div className="gs-member-actions">
                          {role === 'member' && (
                            <>
                              <button className="gs-member-btn" title="Make Moderator" onClick={() => updateMemberRole(member.id, 'moderator')}>
                                <UserCog size={14} />
                              </button>
                              <button className="gs-member-btn" title="Make Admin" onClick={() => updateMemberRole(member.id, 'admin')}>
                                <Shield size={14} />
                              </button>
                            </>
                          )}
                          {(role === 'moderator' || role === 'admin') && (
                            <button className="gs-member-btn" title="Demote" onClick={() => updateMemberRole(member.id, 'member')}>
                              <ChevronDown size={14} />
                            </button>
                          )}
                          <button className="gs-member-btn danger" title="Remove" onClick={() => removeMember(member.id, member.username)}>
                            <UserX size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ANNOUNCEMENTS TAB */}
          {activeTab === 'announcements' && (
            <div className="gs-tab-content">
              {(isAdmin || isModerator) && (
                <div className="gs-announce-composer">
                  <textarea
                    className="gs-textarea"
                    value={announcement}
                    onChange={e => setAnnouncement(e.target.value)}
                    placeholder="Write an announcement for the group..."
                    rows={3}
                    maxLength={500}
                  />
                  <button className="gs-save-btn" onClick={sendAnnouncement} disabled={!announcement.trim()}>
                    <Megaphone size={14} /> Send Announcement
                  </button>
                </div>
              )}
              <div className="gs-announcements-list">
                {(!room.announcements || room.announcements.length === 0) && (
                  <div className="gs-empty">No announcements yet.</div>
                )}
                {(room.announcements || []).map(ann => (
                  <div key={ann.id} className="gs-announcement-item">
                    <div className="gs-ann-text">{ann.text}</div>
                    <div className="gs-ann-time">{new Date(ann.timestamp).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* EVENTS TAB */}
          {activeTab === 'events' && (
            <div className="gs-tab-content">
              <div className="gs-event-form">
                <input className="gs-input" placeholder="Event title" value={eventTitle} onChange={e => setEventTitle(e.target.value)} />
                <textarea className="gs-textarea" placeholder="Description (optional)" value={eventDesc} onChange={e => setEventDesc(e.target.value)} rows={2} />
                <div className="gs-event-times">
                  <div className="gs-field">
                    <label>Start Time</label>
                    <input type="datetime-local" className="gs-input" value={eventStart} onChange={e => setEventStart(e.target.value)} />
                  </div>
                  <div className="gs-field">
                    <label>End Time (optional)</label>
                    <input type="datetime-local" className="gs-input" value={eventEnd} onChange={e => setEventEnd(e.target.value)} />
                  </div>
                </div>
                <button className="gs-save-btn" onClick={createEvent} disabled={!eventTitle.trim() || !eventStart}>
                  <Plus size={14} /> Create Event
                </button>
              </div>
              <div className="gs-events-list">
                {(!room.events || room.events.length === 0) && (
                  <div className="gs-empty">No events scheduled.</div>
                )}
                {(room.events || []).map(evt => (
                  <div key={evt.id} className="gs-event-item">
                    <Calendar size={16} />
                    <div>
                      <div className="gs-event-title">{evt.title}</div>
                      {evt.description && <div className="gs-event-desc">{evt.description}</div>}
                      <div className="gs-event-time">📅 {new Date(evt.startTime).toLocaleString()}</div>
                      <div className="gs-event-attendees">👥 {evt.attendees?.length || 0} attending</div>
                    </div>
                    <button
                      className="gs-rsvp-btn"
                      onClick={() => socket.emit('group_event_rsvp', {
                        roomId: room.id, eventId: evt.id,
                        attend: !evt.attendees?.includes(currentUser?.id)
                      })}
                    >
                      {evt.attendees?.includes(currentUser?.id) ? '✅ Going' : '+ RSVP'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECURITY TAB */}
          {activeTab === 'security' && (
            <div className="gs-tab-content">
              <div className="gs-field">
                <label><Clock size={14} /> Disappearing Messages</label>
                <p className="gs-field-hint">Messages in this group will auto-delete after the selected time.</p>
                <select
                  className="gs-input"
                  value={disappearingTimer}
                  onChange={e => setDisappearingTimer(Number(e.target.value))}
                  disabled={!isAdmin}
                >
                  {TIMER_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              {isAdmin && (
                <button className="gs-save-btn" onClick={saveSettings} disabled={saving}>
                  Save Security Settings
                </button>
              )}
              <div className="gs-info-box">
                <Shield size={14} />
                <span>Group ID: <code>{room?.id}</code></span>
              </div>
              <div className="gs-info-box">
                <Users size={14} />
                <span>Members: {room?.members?.length || 0}</span>
              </div>
              <div className="gs-info-box">
                <Shield size={14} />
                <span>Private: {room?.isPrivate ? '🔒 Yes' : '🌐 No'}</span>
              </div>
            </div>
          )}
        </div>

        {/* Toast */}
        {toast && <div className="gs-toast">{toast}</div>}
      </div>
    </div>
  );
}
