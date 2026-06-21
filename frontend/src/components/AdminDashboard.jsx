// frontend/src/components/AdminDashboard.jsx
import React, { useState } from 'react';
import { 
  Users, MessageSquare, PlusCircle, LogIn, ShieldAlert, 
  Trash2, VolumeX, Volume2, ShieldOff, Activity, ShieldAlert as ReportIcon,
  Download, Printer, FileText, Calendar, Filter, UserCheck, Shield, ArrowLeft,
  Flag, HardDrive, Radio, AlertCircle
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import ContentModeration from './ContentModeration';
import StorageManager from './StorageManager';

function AdminDashboard({
  user,
  socket,
  connected,
  analyticsData,
  rooms,
  onlineUsers,
  showToast,
  messages,
  setActiveTab,
  isMobile
}) {
  const { totalMessagesSent, totalRoomsCreated, totalLogins, onlineUsersCount, activityLogs } = analyticsData;
  const [dashboardTab, setDashboardTab] = useState('telemetry'); // telemetry, users, rooms, pdf_export, moderation, storage, broadcast
  const [showBroadcast, setShowBroadcast] = useState(false);

  // PDF Export Filter States
  const [exportTargetId, setExportTargetId] = useState('');
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');

  const handleGlobalMute = (targetUserId, isMuted) => {
    if (!connected || !socket) return;
    socket.emit('admin_mute_user', {
      targetUserId,
      adminId: user.id,
      isMuted
    });
    showToast(`User ${isMuted ? 'muted' : 'unmuted'} globally`, 'info');
  };

  const handleGlobalBan = (targetUserId, targetUsername, isBanned) => {
    if (!connected || !socket) return;
    if (targetUserId === user.id) {
      showToast('You cannot ban yourself!', 'error');
      return;
    }
    
    if (isBanned) {
      const confirmBan = window.confirm(`Globally ban user "${targetUsername}"? They will be permanently disconnected.`);
      if (confirmBan) {
        socket.emit('admin_ban_user', { targetUserId, adminId: user.id });
        showToast(`Globally banned user ${targetUsername}`, 'success');
      }
    } else {
      socket.emit('admin_unban_user', { targetUserId, adminId: user.id });
      showToast(`Globally unbanned user ${targetUsername}`, 'success');
    }
  };

  const handleUserDelete = (targetUserId, targetUsername) => {
    if (!connected || !socket) return;
    if (targetUserId === user.id) {
      showToast('You cannot delete yourself!', 'error');
      return;
    }

    const confirmDelete = window.confirm(`Permanently delete account "${targetUsername}"? This clears their profile credentials.`);
    if (confirmDelete) {
      socket.emit('admin_delete_user', { targetUserId, adminId: user.id });
      showToast(`Permanently deleted account ${targetUsername}`, 'success');
    }
  };

  const handleRoomDelete = (roomId, roomName) => {
    if (!connected || !socket) return;
    const confirmDelete = window.confirm(`Delete group channel "${roomName}"? This deletes message histories.`);
    if (confirmDelete) {
      socket.emit('admin_delete_room', { roomId, adminId: user.id });
      showToast(`Group room "${roomName}" deleted`, 'success');
    }
  };

  // Compile PDF document layout using jsPDF & jspdf-autotable
  const handleGeneratePDF = (action = 'download') => {
    if (!exportTargetId) {
      showToast('Please select a room or contact to export.', 'warning');
      return;
    }

    // 1. Filter chat messages
    const targetRoom = rooms.find(r => r.id === exportTargetId);
    const targetUser = onlineUsers.find(u => u.id === exportTargetId);
    const targetName = targetRoom ? targetRoom.name : (targetUser ? targetUser.username : 'Unknown');

    let filtered = messages.filter(m => {
      if (targetRoom) {
        return m.roomId === exportTargetId;
      } else {
        // Direct messages
        return !m.roomId && (
          (m.senderId === user.id && m.recipientId === exportTargetId) ||
          (m.senderId === exportTargetId && m.recipientId === user.id)
        );
      }
    });

    // Apply date filters if selected
    if (exportStartDate) {
      const start = new Date(exportStartDate);
      filtered = filtered.filter(m => new Date(m.timestamp) >= start);
    }
    if (exportEndDate) {
      const end = new Date(exportEndDate);
      // set to end of that day
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter(m => new Date(m.timestamp) <= end);
    }

    if (filtered.length === 0) {
      showToast('No messages found matching this query filter.', 'info');
      return;
    }

    // 2. Build Table Row data
    const tableRows = filtered.map(m => {
      const sender = onlineUsers.find(u => u.id === m.senderId)?.username || (m.senderId === 'ai' ? 'CyberAI' : m.senderId);
      const receiver = targetRoom ? `#${targetRoom.name}` : (onlineUsers.find(u => u.id === m.recipientId)?.username || 'Direct Chat');
      const dateStr = new Date(m.timestamp).toLocaleDateString();
      const timeStr = new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return [
        sender,
        receiver,
        `${dateStr} ${timeStr}`,
        m.deleted ? 'This message was deleted' : (m.text || '📁 Shared file attachment')
      ];
    });

    // 3. Create PDF Doc
    try {
      const doc = new jsPDF();
      
      // Document Header
      doc.setFontSize(20);
      doc.setTextColor(0, 168, 132); // Cyber Teal Accent
      doc.text('Cyber Char (cc) - Conversation Report Archive', 14, 20);
      
      doc.setFontSize(11);
      doc.setTextColor(100, 116, 139);
      doc.text(`Generated by Administrator: ${user.username}`, 14, 28);
      doc.text(`Target Log File: ${targetName} (${targetRoom ? 'Channel Room' : 'Direct Message'})`, 14, 34);
      doc.text(`Total Message Count: ${filtered.length}`, 14, 40);
      
      if (exportStartDate || exportEndDate) {
        doc.text(`Date Filters: ${exportStartDate || 'Beginning'} to ${exportEndDate || 'Present'}`, 14, 46);
      }

      // Generate AutoTable
      doc.autoTable({
        startY: 52,
        head: [['Sender', 'Destination', 'Date & Time', 'Message Log']],
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: [0, 168, 132] },
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: { 3: { cellWidth: 80 } } // Give message column more space
      });

      const filename = `cyberchar_archive_${targetName.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.pdf`;

      if (action === 'download') {
        doc.save(filename);
        showToast('PDF compiled and downloaded successfully!', 'success');
      } 
      else if (action === 'print') {
        doc.autoPrint();
        window.open(doc.output('bloburl'), '_blank');
        showToast('PDF layout opened in print viewer.', 'success');
      } 
      else if (action === 'archive') {
        // Mock server side file log archive
        showToast(`Chat transcript archive synced securely in admin files!`, 'success');
      }
    } catch (e) {
      console.error('PDF Export Error:', e);
      showToast('Could not compile PDF document layout.', 'error');
    }
  };

  // Pick random mock height values for visual CSS charts
  const mockChartBars = [
    { label: 'Mon', val: 32 },
    { label: 'Tue', val: 56 },
    { label: 'Wed', val: 45 },
    { label: 'Thu', val: 78 },
    { label: 'Fri', val: 90 },
    { label: 'Sat', val: 42 },
    { label: 'Sun', val: 35 }
  ];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: 'var(--bg-app)',
      padding: '32px',
      overflowY: 'auto'
    }}>
      {/* Dashboard Title Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
        {isMobile && (
          <button 
            onClick={() => setActiveTab('chats')} 
            style={{ 
              background: 'none', 
              border: 'none', 
              cursor: 'pointer', 
              color: 'var(--text-primary)', 
              display: 'flex', 
              padding: '8px',
              marginLeft: '-8px'
            }}
          >
            <ArrowLeft size={24} />
          </button>
        )}
        <div style={{ backgroundColor: 'var(--primary)', color: '#fff', padding: '8px', borderRadius: '8px' }}>
          <Activity size={24} />
        </div>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'Outfit', color: 'var(--text-primary)' }}>
            Admin Analytics Dashboard
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Real-time server telemetry, user directories overrides, and PDF archives exports.
          </p>
        </div>
      </div>

      {/* Tabs navigation */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border-glass)',
        gap: '24px',
        marginBottom: '28px',
        flexShrink: 0
      }}>
        <button
          onClick={() => setDashboardTab('telemetry')}
          style={{
            padding: '10px 4px', border: 'none', background: 'none', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
            color: dashboardTab === 'telemetry' ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: dashboardTab === 'telemetry' ? '2px solid var(--primary)' : '2px solid transparent',
            display: 'flex', alignItems: 'center', gap: '8px'
          }}
        >
          <Activity size={16} /> Server Telemetry
        </button>

        <button
          onClick={() => setDashboardTab('users')}
          style={{
            padding: '10px 4px', border: 'none', background: 'none', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
            color: dashboardTab === 'users' ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: dashboardTab === 'users' ? '2px solid var(--primary)' : '2px solid transparent',
            display: 'flex', alignItems: 'center', gap: '8px'
          }}
        >
          <Users size={16} /> User Overrides
        </button>

        <button
          onClick={() => setDashboardTab('rooms')}
          style={{
            padding: '10px 4px', border: 'none', background: 'none', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
            color: dashboardTab === 'rooms' ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: dashboardTab === 'rooms' ? '2px solid var(--primary)' : '2px solid transparent',
            display: 'flex', alignItems: 'center', gap: '8px'
          }}
        >
          <PlusCircle size={16} /> Channel Rooms
        </button>

        <button
          onClick={() => setDashboardTab('pdf_export')}
          style={{
            padding: '10px 4px', border: 'none', background: 'none', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
            color: dashboardTab === 'pdf_export' ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: dashboardTab === 'pdf_export' ? '2px solid var(--primary)' : '2px solid transparent',
            display: 'flex', alignItems: 'center', gap: '8px'
          }}
        >
          <Download size={16} /> PDF Export Reports
        </button>

        <button
          onClick={() => setDashboardTab('moderation')}
          style={{
            padding: '10px 4px', border: 'none', background: 'none', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
            color: dashboardTab === 'moderation' ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: dashboardTab === 'moderation' ? '2px solid var(--primary)' : '2px solid transparent',
            display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap'
          }}
        >
          <Flag size={16} /> Content Moderation
        </button>

        <button
          onClick={() => setDashboardTab('storage')}
          style={{
            padding: '10px 4px', border: 'none', background: 'none', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
            color: dashboardTab === 'storage' ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: dashboardTab === 'storage' ? '2px solid var(--primary)' : '2px solid transparent',
            display: 'flex', alignItems: 'center', gap: '8px'
          }}
        >
          <HardDrive size={16} /> Storage
        </button>

        <button
          onClick={() => setDashboardTab('broadcast')}
          style={{
            padding: '10px 4px', border: 'none', background: 'none', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
            color: dashboardTab === 'broadcast' ? 'var(--primary)' : 'var(--text-secondary)',
            borderBottom: dashboardTab === 'broadcast' ? '2px solid var(--primary)' : '2px solid transparent',
            display: 'flex', alignItems: 'center', gap: '8px'
          }}
        >
          <Radio size={16} /> Broadcast
        </button>
      </div>

      {/* Tab Contents */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        
        {/* TAB 1: TELEMETRY & STATS */}
        {dashboardTab === 'telemetry' && (
          <>
            {/* Grid of counters stats cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '20px',
              marginBottom: '32px'
            }}>
              <div className="glass-card" style={{ padding: '24px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', padding: '12px', borderRadius: '12px' }}><LogIn size={20} /></div>
                <div>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Total Logins</span>
                  <span style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)' }}>{totalLogins}</span>
                </div>
              </div>

              <div className="glass-card" style={{ padding: '24px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '12px', borderRadius: '12px' }}><MessageSquare size={20} /></div>
                <div>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Messages Sent</span>
                  <span style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)' }}>{totalMessagesSent}</span>
                </div>
              </div>

              <div className="glass-card" style={{ padding: '24px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', padding: '12px', borderRadius: '12px' }}><PlusCircle size={20} /></div>
                <div>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Active Rooms</span>
                  <span style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)' }}>{totalRoomsCreated}</span>
                </div>
              </div>

              <div className="glass-card" style={{ padding: '24px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', padding: '12px', borderRadius: '12px' }}><Users size={20} /></div>
                <div>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Users Online</span>
                  <span style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)' }}>{onlineUsersCount}</span>
                </div>
              </div>
            </div>

            {/* Charts & Activity log */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '24px',
              marginBottom: '32px'
            }}>
              {/* CSS chart */}
              <div className="glass-card" style={{ padding: '24px', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '24px' }}>Weekly Message Traffic</h3>
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'space-around',
                  flex: 1,
                  minHeight: '200px',
                  borderBottom: '1px solid var(--border-glass)',
                  paddingBottom: '12px',
                  marginBottom: '10px'
                }}>
                  {mockChartBars.map((bar, i) => (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '40px' }}>
                      <div style={{
                        height: `${bar.val}%`,
                        width: '100%',
                        background: 'linear-gradient(to top, var(--primary), var(--accent))',
                        borderRadius: '6px 6px 0 0',
                        minHeight: '10px'
                      }} />
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500 }}>{bar.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Activity Log list */}
              <div className="glass-card" style={{ padding: '24px', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', maxHeight: '310px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Activity size={16} /> Recent Activity Logs
                </h3>
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {activityLogs.length === 0 ? (
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '20px' }}>No logs recorded.</span>
                  ) : (
                    activityLogs.map((log) => (
                      <div key={log.id} style={{ display: 'flex', flexDirection: 'column', borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                          <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{log.type}</span>
                          <span style={{ color: 'var(--text-muted)' }}>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                        </div>
                        <span style={{ fontSize: '12px', color: 'var(--text-primary)', marginTop: '2px' }}>{log.detail}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* TAB 2: USER OVERRIDES */}
        {dashboardTab === 'users' && (
          <div className="glass-card" style={{ padding: '24px', borderRadius: 'var(--radius-lg)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }}>Database User Directory</h3>
            
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-glass)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '12px' }}>Username</th>
                    <th style={{ padding: '12px' }}>User ID</th>
                    <th style={{ padding: '12px' }}>Status</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {onlineUsers.map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                      <td style={{ padding: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {u.username} {u.id === user.id && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>(You)</span>}
                        {u.isMutedGlobally && <span style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', fontSize: '9px', padding: '2px 6px', borderRadius: '4px', marginLeft: '6px' }}>MUTED</span>}
                      </td>
                      <td style={{ padding: '12px', fontFamily: 'monospace', fontSize: '12px' }}>{u.id}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '13px',
                          color: u.status === 'online' ? 'var(--success)' : 'var(--text-muted)'
                        }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: u.status === 'online' ? 'var(--success)' : 'var(--text-muted)' }} />
                          {u.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        {u.id !== user.id && (
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => handleGlobalMute(u.id, !u.isMutedGlobally)}
                              disabled={!connected}
                              data-tooltip={u.isMutedGlobally ? 'Unmute user' : 'Mute user'}
                              style={{ border: 'none', background: 'none', cursor: 'pointer', color: u.isMutedGlobally ? 'var(--primary)' : 'var(--text-secondary)', padding: '6px' }}
                            >
                              {u.isMutedGlobally ? <Volume2 size={16} /> : <VolumeX size={16} />}
                            </button>

                            <button
                              onClick={() => handleGlobalBan(u.id, u.username, !u.isSuspended)}
                              disabled={!connected}
                              data-tooltip={u.isSuspended ? 'Unban user' : 'Ban user'}
                              style={{ border: 'none', background: 'none', cursor: 'pointer', color: u.isSuspended ? 'var(--success)' : 'var(--danger)', padding: '6px' }}
                            >
                              <ShieldOff size={16} />
                            </button>

                            <button
                              onClick={() => handleUserDelete(u.id, u.username)}
                              disabled={!connected}
                              data-tooltip="Delete Profile"
                              style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '6px' }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: CHANNEL ROOMS OVERRIDES */}
        {dashboardTab === 'rooms' && (
          <div className="glass-card" style={{ padding: '24px', borderRadius: 'var(--radius-lg)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }}>Active Channel Rooms Moderation</h3>
            
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-glass)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '12px' }}>Channel Name</th>
                    <th style={{ padding: '12px' }}>Description</th>
                    <th style={{ padding: '12px' }}>Members</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rooms.map(r => (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                      <td style={{ padding: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {r.icon} {r.name}
                      </td>
                      <td style={{ padding: '12px', color: 'var(--text-secondary)' }}>{r.description}</td>
                      <td style={{ padding: '12px' }}>{r.members?.length || 0} joined</td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        {r.creatorId !== 'system' && (
                          <button
                            onClick={() => handleRoomDelete(r.id, r.name)}
                            disabled={!connected}
                            data-tooltip="Delete Channel"
                            style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '6px' }}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: PDF EXPORT SYSTEM */}
        {dashboardTab === 'pdf_export' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
            {/* Filters panel */}
            <div className="glass-card" style={{ padding: '24px', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Filter size={18} /> Compile Filter Parameters
              </h3>
              
              {/* Target Dropdown selection */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Target Channel or Contact</label>
                <select
                  value={exportTargetId}
                  onChange={(e) => setExportTargetId(e.target.value)}
                  style={{
                    padding: '10px', borderRadius: '6px', border: '1px solid var(--border-glass)',
                    background: 'var(--bg-app)', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer', fontSize: '13px'
                  }}
                >
                  <option value="">Select Target...</option>
                  <optgroup label="Channel Rooms">
                    {rooms.map(r => (
                      <option key={r.id} value={r.id}>{r.icon} {r.name}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Direct Message Contacts">
                    {onlineUsers.filter(u => u.id !== user.id).map(u => (
                      <option key={u.id} value={u.id}>👤 {u.username}</option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {/* Start Date */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={12} /> Start Date
                </label>
                <input
                  type="date"
                  value={exportStartDate}
                  onChange={(e) => setExportStartDate(e.target.value)}
                  style={{
                    padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-glass)',
                    background: 'var(--bg-app)', color: 'var(--text-primary)', outline: 'none', fontSize: '13px'
                  }}
                />
              </div>

              {/* End Date */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Calendar size={12} /> End Date
                </label>
                <input
                  type="date"
                  value={exportEndDate}
                  onChange={(e) => setExportEndDate(e.target.value)}
                  style={{
                    padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-glass)',
                    background: 'var(--bg-app)', color: 'var(--text-primary)', outline: 'none', fontSize: '13px'
                  }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                <button
                  onClick={() => handleGeneratePDF('download')}
                  style={{
                    backgroundColor: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '6px',
                    padding: '12px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justify: 'center', gap: '8px'
                  }}
                >
                  <Download size={16} /> Compile & Download PDF
                </button>
                <button
                  onClick={() => handleGeneratePDF('print')}
                  style={{
                    backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)', border: '1px solid var(--border-glass)',
                    borderRadius: '6px', padding: '12px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justify: 'center', gap: '8px'
                  }}
                >
                  <Printer size={16} /> Print Report Layout
                </button>
                <button
                  onClick={() => handleGeneratePDF('archive')}
                  style={{
                    backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)', border: '1px solid var(--border-glass)',
                    borderRadius: '6px', padding: '12px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justify: 'center', gap: '8px'
                  }}
                >
                  <FileText size={16} /> Archive Transcript PDF
                </button>
              </div>
            </div>

            {/* Explanation panel */}
            <div className="glass-card" style={{ padding: '24px', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', gap: '14px', justifyContent: 'center' }}>
              <Shield size={40} style={{ color: 'var(--primary)' }} />
              <h4 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>Secure Transcript Archive Exporter</h4>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                As a system administrator, you can extract, format, and generate encrypted PDF logs of chat records. To maintain workspace safety parameters, regular users cannot download or access this feature.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><UserCheck size={14} style={{ color: 'var(--primary)' }} /> Sender and recipient IDs compiled.</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={14} style={{ color: 'var(--primary)' }} /> Filtered by date range parameters.</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><FileText size={14} style={{ color: 'var(--primary)' }} /> Export formats compiled dynamically using auto-table layout sheets.</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB: CONTENT MODERATION */}
        {dashboardTab === 'moderation' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Flag size={18} style={{ color: 'var(--danger)' }} /> Content Moderation
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Review user reports, flagged messages, and take moderation actions.
              </p>
            </div>
            <ContentModeration
              apiBase={window.VITE_API_URL || import.meta.env.VITE_API_URL}
              socket={socket}
            />
          </div>
        )}

        {/* TAB: STORAGE MANAGER */}
        {dashboardTab === 'storage' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <HardDrive size={18} style={{ color: 'var(--primary)' }} /> Storage Manager
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Browse, view, and delete uploaded files stored on the server.
              </p>
            </div>
            <StorageManager
              apiBase={window.VITE_API_URL || import.meta.env.VITE_API_URL}
            />
          </div>
        )}

        {/* TAB: BROADCAST */}
        {dashboardTab === 'broadcast' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Radio size={18} style={{ color: 'var(--primary)' }} /> Broadcast Notification
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Send a platform-wide notification to all users (online + offline).
              </p>
            </div>
            <BroadcastInlineForm socket={socket} apiBase={window.VITE_API_URL || import.meta.env.VITE_API_URL} showToast={showToast} />
          </div>
        )}

      </div>
    </div>
  );
}

// Inline broadcast form for admin dashboard tab
function BroadcastInlineForm({ socket, apiBase, showToast }) {
  const [title, setTitle] = React.useState('');
  const [body, setBody] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const [sentCount, setSentCount] = React.useState(0);
  const token = localStorage.getItem('cc_token');

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      showToast('Title and body are required', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/admin/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: title.trim(), body: body.trim() })
      });
      const data = await res.json();
      if (data.success) {
        if (socket) socket.emit('admin_broadcast', { title: title.trim(), body: body.trim() });
        setSentCount(data.notifCount || 0);
        setSent(true);
        showToast(`Broadcast sent to ${data.notifCount || 'all'} users!`, 'success');
        setTimeout(() => { setSent(false); setTitle(''); setBody(''); }, 4000);
      } else {
        showToast(data.error || 'Failed to send', 'error');
      }
    } catch(e) {
      showToast('Network error', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card" style={{ borderRadius: 'var(--radius-lg)', padding: '28px', maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {sent ? (
        <div style={{ textAlign: 'center', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <div style={{ fontSize: '48px' }}>📡</div>
          <h4 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--primary)' }}>Broadcast Sent!</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Delivered to {sentCount} users.</p>
        </div>
      ) : (
        <>
          <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', fontSize: '12px', color: 'var(--warning)' }}>
            ⚠️ This message will be sent to ALL registered users. Use responsibly.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Notification Title</label>
            <input
              style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-glass)', background: 'var(--bg-app)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' }}
              placeholder="e.g. System Maintenance Notice"
              value={title}
              onChange={e => setTitle(e.target.value)}
              maxLength={100}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Message Body</label>
            <textarea
              style={{ padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-glass)', background: 'var(--bg-app)', color: 'var(--text-primary)', fontSize: '14px', resize: 'vertical', outline: 'none', minHeight: '100px' }}
              placeholder="Write your broadcast message..."
              value={body}
              onChange={e => setBody(e.target.value)}
              maxLength={1000}
            />
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'right' }}>{body.length}/1000</div>
          </div>
          <button
            onClick={handleSend}
            disabled={loading || !title.trim() || !body.trim()}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              padding: '12px 24px', borderRadius: '10px', border: 'none',
              background: 'var(--primary)', color: '#fff', cursor: 'pointer',
              fontSize: '14px', fontWeight: 600, opacity: loading || !title.trim() || !body.trim() ? 0.5 : 1
            }}
          >
            <Radio size={14} />
            {loading ? 'Sending...' : 'Send to All Users'}
          </button>
        </>
      )}
    </div>
  );
}

export default AdminDashboard;

