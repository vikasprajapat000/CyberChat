// frontend/src/components/SnapMapModal.jsx
import React, { useEffect, useRef, useState } from 'react';
import { X, Navigation, Search, MapPin, Compass } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:5000' : 'https://cyberchat-4hvt.onrender.com');

function SnapMapModal({ user, onlineUsers, onClose, showToast }) {
  const canvasRef = useRef(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [myCoords, setMyCoords] = useState({ x: 400, y: 300, name: 'You (Local)' });
  const [mockLocations, setMockLocations] = useState([]);

  // Generate deterministic mock coordinates for online users
  useEffect(() => {
    const locations = onlineUsers.map((u, index) => {
      let hash = 0;
      for (let i = 0; i < u.username.length; i++) {
        hash += u.username.charCodeAt(i);
      }
      // Keep coordinates within a 800x600 coordinate system
      const x = 100 + (hash * 37) % 600;
      const y = 80 + (hash * 19) % 440;
      return {
        id: u.id,
        username: u.username,
        x,
        y,
        status: u.status,
        bio: u.bio || 'Navigating the grid...',
        profilePhoto: u.profilePhoto
      };
    });
    setMockLocations(locations);
  }, [onlineUsers]);

  // Handle location sharing simulation
  const handleShareLocation = () => {
    const randX = 150 + Math.random() * 500;
    const randY = 100 + Math.random() * 400;
    setMyCoords({ x: randX, y: randY, name: 'You (Mock Location Shared)' });
    if (showToast) {
      showToast('Mock location broadcasted on Snap Map!', 'success');
    }
  };

  // Canvas Grid Rendering Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let pulse = 0;

    const render = () => {
      pulse = (pulse + 0.05) % (Math.PI * 2);
      const scale = Math.sin(pulse) * 4 + 8; // glow radius pulse

      // Clear canvas
      ctx.fillStyle = '#0b0f19';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw cyber Grid overlay
      ctx.strokeStyle = 'rgba(0, 168, 132, 0.06)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Draw radar scan circles from center
      ctx.strokeStyle = 'rgba(0, 168, 132, 0.15)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2, 120 + Math.sin(pulse) * 30, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2, 280 - Math.sin(pulse) * 20, 0, Math.PI * 2);
      ctx.stroke();

      // Connect lines between nearby user nodes
      ctx.strokeStyle = 'rgba(108, 92, 231, 0.2)';
      ctx.lineWidth = 1;
      for (let i = 0; i < mockLocations.length; i++) {
        const u1 = mockLocations[i];
        // Connect to local user
        const distToMe = Math.hypot(u1.x - myCoords.x, u1.y - myCoords.y);
        if (distToMe < 200) {
          ctx.beginPath();
          ctx.moveTo(u1.x, u1.y);
          ctx.lineTo(myCoords.x, myCoords.y);
          ctx.stroke();
        }
        for (let j = i + 1; j < mockLocations.length; j++) {
          const u2 = mockLocations[j];
          const dist = Math.hypot(u1.x - u2.x, u1.y - u2.y);
          if (dist < 150) {
            ctx.beginPath();
            ctx.moveTo(u1.x, u1.y);
            ctx.lineTo(u2.x, u2.y);
            ctx.stroke();
          }
        }
      }

      // Draw user nodes
      mockLocations.forEach(u => {
        const isMatch = u.username.toLowerCase().includes(searchTerm.toLowerCase());
        if (searchTerm && !isMatch) return;

        // Outer neon pulse ring
        ctx.fillStyle = u.status === 'online' ? 'rgba(0, 168, 132, 0.15)' : 'rgba(148, 163, 184, 0.1)';
        ctx.beginPath();
        ctx.arc(u.x, u.y, scale + 4, 0, Math.PI * 2);
        ctx.fill();

        // Inner solid core node
        ctx.fillStyle = u.status === 'online' ? 'var(--success, #00a884)' : '#64748b';
        ctx.beginPath();
        ctx.arc(u.x, u.y, 6, 0, Math.PI * 2);
        ctx.fill();

        // Text label
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(u.username, u.x, u.y - 12);
      });

      // Draw local user node (represented in neon purple)
      ctx.fillStyle = 'rgba(168, 85, 247, 0.2)';
      ctx.beginPath();
      ctx.arc(myCoords.x, myCoords.y, scale + 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#a855f7';
      ctx.beginPath();
      ctx.arc(myCoords.x, myCoords.y, 7, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('YOU', myCoords.x, myCoords.y - 14);

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [mockLocations, myCoords, searchTerm]);

  // Click on canvas to inspect/select a node
  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Check if clicked local user
    if (Math.hypot(clickX - myCoords.x, clickY - myCoords.y) < 16) {
      setSelectedUser({
        username: user.username,
        bio: user.bio || 'Workspace host',
        coords: myCoords,
        isMe: true
      });
      return;
    }

    // Check other users
    const clicked = mockLocations.find(u => Math.hypot(clickX - u.x, clickY - u.y) < 16);
    if (clicked) {
      setSelectedUser(clicked);
    } else {
      setSelectedUser(null);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(5, 8, 16, 0.85)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: '#0f172a',
        border: '1px solid var(--border-glass, rgba(255, 255, 255, 0.08))',
        borderRadius: '16px',
        width: '900px',
        maxWidth: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid var(--border-glass, rgba(255, 255, 255, 0.08))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(30, 41, 59, 0.4)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Compass className="animate-spin" style={{ color: 'var(--primary)', animationDuration: '6s' }} size={24} />
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', fontFamily: 'Outfit', letterSpacing: '0.5px' }}>CyberChar Snap Map</h2>
              <span style={{ fontSize: '11px', color: '#64748b' }}>Live coordinate mesh tracking of connected nodes</span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: 'none',
              borderRadius: '50%',
              padding: '8px',
              cursor: 'pointer',
              color: '#94a3b8',
              display: 'flex'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Toolbar Grid Controls */}
        <div style={{
          padding: '12px 24px',
          backgroundColor: '#0b0f19',
          borderBottom: '1px solid var(--border-glass, rgba(255, 255, 255, 0.08))',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {/* Search bar */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: 1, minWidth: '220px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', color: '#64748b' }} />
            <input
              type="text"
              placeholder="Search user location on grid..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '8px',
                padding: '8px 12px 8px 32px',
                color: '#fff',
                fontSize: '12px',
                outline: 'none'
              }}
            />
          </div>

          {/* Action triggers */}
          <button
            onClick={handleShareLocation}
            style={{
              backgroundColor: 'var(--primary, #00a884)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Navigation size={14} />
            Share Coordinates
          </button>
        </div>

        {/* Map Workspace Area */}
        <div style={{ display: 'flex', position: 'relative', height: '480px' }}>
          {/* Canvas Map render */}
          <canvas
            ref={canvasRef}
            width={900}
            height={480}
            onClick={handleCanvasClick}
            style={{ display: 'block', cursor: 'crosshair', flex: 1 }}
          />

          {/* Selected Node overlay info details */}
          {selectedUser && (
            <div style={{
              position: 'absolute',
              bottom: '20px',
              left: '20px',
              backgroundColor: 'rgba(15, 23, 42, 0.95)',
              border: '1.5px solid var(--primary, #00a884)',
              borderRadius: '12px',
              padding: '16px',
              width: '280px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.6)',
              zIndex: 10,
              animation: 'slideUp 0.2s ease-out'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: '#1e293b',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  {selectedUser.profilePhoto ? (
                    <img
                      src={`${BACKEND_URL}${selectedUser.profilePhoto}`}
                      alt={selectedUser.username}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff' }}>
                      {selectedUser.username?.substring(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                <div>
                  <h4 style={{ color: '#fff', fontSize: '14px', fontWeight: 700, margin: 0 }}>{selectedUser.username}</h4>
                  <span style={{ fontSize: '10px', color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <MapPin size={10} />
                    GRID: [{Math.round(selectedUser.x)}, {Math.round(selectedUser.y)}]
                  </span>
                </div>
              </div>
              <p style={{ color: '#94a3b8', fontSize: '11px', lineHeight: '1.4', margin: '0 0 12px 0' }}>{selectedUser.bio}</p>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => {
                    setSelectedUser(null);
                  }}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    color: '#94a3b8',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontSize: '11px',
                    cursor: 'pointer',
                    flex: 1
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default SnapMapModal;
