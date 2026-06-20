// frontend/src/components/CallModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, Tv, Monitor, Clock } from 'lucide-react';

function CallModal({
  callState,       // 'idle' | 'dialing' | 'receiving' | 'connected'
  callPartner,     // { id, username }
  isVideoCall,
  onAccept,
  onDecline,
  onHangup,
  localStream,
  remoteStream,
  toggleAudio,
  toggleVideo,
  audioMuted,
  videoMuted,
  startScreenShare,
  stopScreenShare,
  isSharingScreen
}) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [callDuration, setCallDuration] = useState(0);

  // Call timer interval
  useEffect(() => {
    let timer;
    if (callState === 'connected') {
      setCallDuration(0);
      timer = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [callState]);

  // Bind video streams on state change
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, callState]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, callState]);

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (callState === 'idle') return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 1200,
      backgroundColor: 'rgba(7, 12, 14, 0.95)', // ultra-dark overlay
      backdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }}>
      {/* A. Ringing Dialog (Receiving Call) */}
      {callState === 'receiving' && (
        <div 
          className="glass-panel animate-scale"
          style={{
            padding: '40px 32px',
            borderRadius: '24px',
            textAlign: 'center',
            backgroundColor: 'var(--bg-panel)',
            width: '100%',
            maxWidth: '360px',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}
        >
          {/* Pulsing ring indicator */}
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'var(--primary-light)',
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '24px',
            animation: 'pulseBorder 1.5s infinite'
          }}>
            {isVideoCall ? <Video size={36} /> : <Phone size={36} />}
          </div>
          
          <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
            Incoming {isVideoCall ? 'Video' : 'Voice'} Call
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '32px' }}>
            {callPartner?.username || 'Someone'} is calling you...
          </p>

          <div style={{ display: 'flex', gap: '16px', width: '100%' }}>
            {/* Decline */}
            <button
              onClick={onDecline}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: 'var(--danger)',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <PhoneOff size={18} /> Decline
            </button>
            
            {/* Accept */}
            <button
              onClick={onAccept}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: 'var(--success)',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <Phone size={18} /> Accept
            </button>
          </div>
        </div>
      )}

      {/* B. Dialing Dialog (Outgoing Call) */}
      {callState === 'dialing' && (
        <div 
          className="glass-panel animate-scale"
          style={{
            padding: '40px 32px',
            borderRadius: '24px',
            textAlign: 'center',
            backgroundColor: 'var(--bg-panel)',
            width: '100%',
            maxWidth: '360px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}
        >
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'var(--primary-light)',
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '24px'
          }}>
            {isVideoCall ? <Video size={36} className="animate-pulse" /> : <Phone size={36} className="animate-pulse" />}
          </div>
          
          <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
            Calling...
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '32px' }}>
            Waiting for {callPartner?.username} to pick up...
          </p>

          <button
            onClick={onHangup}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '12px',
              border: 'none',
              backgroundColor: 'var(--danger)',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <PhoneOff size={18} /> Cancel Call
          </button>
        </div>
      )}

      {/* C. Call Workspace (Connected Video/Audio Call Panel) */}
      {callState === 'connected' && (
        <div 
          className="animate-fade"
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: '960px',
            height: '80vh',
            maxHeight: '680px',
            borderRadius: '24px',
            overflow: 'hidden',
            backgroundColor: '#1c2024',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* Calls Timer Display Overlay top-left */}
          <div style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            backgroundColor: 'rgba(0,0,0,0.6)',
            padding: '6px 14px',
            borderRadius: '12px',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            zIndex: 30,
            fontSize: '13px',
            fontWeight: 600
          }}>
            <Clock size={14} style={{ color: 'var(--primary)' }} />
            {formatTimer(callDuration)}
          </div>

          {/* Videos Feeds Layout */}
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            {/* 1. Remote partner video (Main View) */}
            {isVideoCall ? (
              remoteStream ? (
                <video 
                  ref={remoteVideoRef} 
                  autoPlay 
                  playsInline 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8696a0', flexDir: 'column', gap: '10px' }}>
                  <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#2f353d', display: 'flex', alignItems: 'center', justify: 'center', fontSize: '24px', color: '#fff' }}>
                    {callPartner?.username ? getInitials(callPartner.username) : '?'}
                  </div>
                  <span>Voice Calling {callPartner?.username}...</span>
                </div>
              )
            ) : (
              // Audio only view layout
              <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
                <div 
                  className="initials-avatar bg-av-2 animate-pulse"
                  style={{ width: '110px', height: '110px', fontSize: '42px', boxShadow: '0 0 0 10px rgba(0, 168, 132, 0.15)' }}
                >
                  {getInitials(callPartner?.username)}
                </div>
                <span style={{ fontSize: '18px', fontWeight: 600, color: '#fff' }}>{callPartner?.username}</span>
                <span style={{ fontSize: '13px', color: '#8696a0' }}>Voice Call Active</span>
              </div>
            )}

            {/* 2. Local self video (PIP mini view in top-right) */}
            {isVideoCall && localStream && (
              <div style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                width: '180px',
                height: '120px',
                borderRadius: '14px',
                overflow: 'hidden',
                border: '2px solid rgba(255,255,255,0.2)',
                boxShadow: 'var(--shadow-md)',
                zIndex: 20,
                backgroundColor: '#111b21'
              }}>
                <video 
                  ref={localVideoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
              </div>
            )}
          </div>

          {/* Bottom control toolbar */}
          <div style={{
            height: '84px',
            backgroundColor: 'rgba(23, 27, 31, 0.95)',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            zIndex: 30
          }}>
            {/* Audio Mute toggle */}
            <button
              onClick={toggleAudio}
              style={{
                border: 'none',
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: audioMuted ? 'var(--danger)' : '#2f353d',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title={audioMuted ? 'Unmute microphone' : 'Mute microphone'}
            >
              {audioMuted ? <MicOff size={20} /> : <Mic size={20} />}
            </button>

            {/* Video Toggle (only for video call type) */}
            {isVideoCall && (
              <button
                onClick={toggleVideo}
                style={{
                  border: 'none',
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  backgroundColor: videoMuted ? 'var(--danger)' : '#2f353d',
                  color: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title={videoMuted ? 'Enable camera' : 'Disable camera'}
              >
                {videoMuted ? <VideoOff size={20} /> : <Video size={20} />}
              </button>
            )}

            {/* Screen share toggle (only for video calls) */}
            {isVideoCall && localStream && (
              <button
                onClick={isSharingScreen ? stopScreenShare : startScreenShare}
                style={{
                  border: 'none',
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  backgroundColor: isSharingScreen ? 'var(--primary)' : '#2f353d',
                  color: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title={isSharingScreen ? 'Stop screen sharing' : 'Share screen'}
              >
                {isSharingScreen ? <Monitor size={20} /> : <Tv size={20} />}
              </button>
            )}

            {/* Hangup Red button */}
            <button
              onClick={onHangup}
              style={{
                border: 'none',
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: 'var(--danger)',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Hangup / End call"
            >
              <PhoneOff size={20} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Helpers
const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2);
  return (parts[0][0] + parts[1][0]).substring(0, 2);
};

export default CallModal;
