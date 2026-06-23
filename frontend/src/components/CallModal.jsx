// frontend/src/components/CallModal.jsx
import React, { useState, useEffect, useRef } from 'react';
import { 
  Phone, PhoneOff, Video, VideoOff, Mic, MicOff, Tv, Monitor, 
  Clock, ShieldCheck, Volume2, VolumeX, Radio, Camera, Settings, 
  Maximize2, Minimize2, RefreshCw, X, Sliders, Eye
} from 'lucide-react';

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
  isSharingScreen,
  isMobile,
  
  // Media Device/Quality props
  selectedAudioInput,
  setSelectedAudioInput,
  selectedVideoInput,
  setSelectedVideoInput,
  selectedAudioOutput,
  setSelectedAudioOutput,
  videoQuality,
  setVideoQuality,
  onDeviceChange,
  facingMode
}) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const previewVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const visualizerCanvasRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const animationFrameIdRef = useRef(null);

  const [callDuration, setCallDuration] = useState(0);
  const [noiseCancellation, setNoiseCancellation] = useState(false);
  const [backgroundBlur, setBackgroundBlur] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingTimerRef = useRef(null);

  // Advanced States
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);
  const [devices, setDevices] = useState([]);
  const [isMirrored, setIsMirrored] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [previewStream, setPreviewStream] = useState(null);

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

  // Call Recording Timer simulation
  useEffect(() => {
    if (isRecording) {
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(recordingTimerRef.current);
    }
    return () => clearInterval(recordingTimerRef.current);
  }, [isRecording]);

  useEffect(() => {
    if (callState !== 'connected') {
      setIsRecording(false);
      setRecordingDuration(0);
    }
  }, [callState]);

  // Enumerate available hardware devices
  useEffect(() => {
    const fetchDevices = async () => {
      try {
        // Enforce browser prompt first if not already granted
        if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
          const list = await navigator.mediaDevices.enumerateDevices();
          setDevices(list);
        }
      } catch (err) {
        console.warn('Failed to enumerate media devices:', err);
      }
    };
    
    if (callState === 'connected') {
      fetchDevices();
    }
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

  useEffect(() => {
    if (remoteAudioRef.current && remoteStream && !isVideoCall) {
      remoteAudioRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, isVideoCall, callState]);

  // Handle incoming video preview before accepting
  useEffect(() => {
    if (callState === 'receiving' && isVideoCall) {
      navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { width: 320, height: 240 }
      })
      .then(stream => {
        setPreviewStream(stream);
        if (previewVideoRef.current) {
          previewVideoRef.current.srcObject = stream;
        }
      })
      .catch(err => {
        console.warn('Preview camera access denied:', err);
      });
    }

    return () => {
      if (previewStream) {
        previewStream.getTracks().forEach(track => track.stop());
        setPreviewStream(null);
      }
    };
  }, [callState, isVideoCall]);

  // Web Audio API Audio Waveform Visualizer for Call Stream
  useEffect(() => {
    if (callState !== 'connected' || !remoteStream) return;
    
    const audioTracks = remoteStream.getAudioTracks();
    if (audioTracks.length === 0) return;

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;

      const audioCtx = new AudioContextClass();
      audioCtxRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(remoteStream);
      source.connect(analyser);
      
      sourceRef.current = source;

      const canvas = visualizerCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
          if (!analyserRef.current || !canvas) return;
          animationFrameIdRef.current = requestAnimationFrame(draw);

          analyser.getByteFrequencyData(dataArray);

          ctx.clearRect(0, 0, canvas.width, canvas.height);

          const barWidth = (canvas.width / bufferLength) * 1.5;
          let barHeight;
          let x = 0;

          const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
          gradient.addColorStop(0, 'rgba(0, 229, 255, 0.4)');
          gradient.addColorStop(1, 'rgba(0, 168, 132, 0.9)');

          ctx.fillStyle = gradient;

          for (let i = 0; i < bufferLength; i++) {
            barHeight = (dataArray[i] / 255) * canvas.height * 0.8;
            ctx.beginPath();
            ctx.roundRect(x, canvas.height - barHeight, barWidth - 2, barHeight, 4);
            ctx.fill();
            x += barWidth;
          }
        };

        draw();
      }
    } catch (e) {
      console.warn("Could not setup audio visualizer:", e);
    }

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
      if (sourceRef.current) {
        try { sourceRef.current.disconnect(); } catch (e) {}
        sourceRef.current = null;
      }
      if (audioCtxRef.current) {
        try {
          if (audioCtxRef.current.state !== 'closed') {
            audioCtxRef.current.close();
          }
        } catch (e) {}
        audioCtxRef.current = null;
      }
      analyserRef.current = null;
    };
  }, [remoteStream, callState]);

  const formatTimer = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Switch camera: cycles through available video input devices or toggles facingMode on mobile
  const handleSwitchCamera = () => {
    if (isMobile) {
      const nextFacingMode = facingMode === 'user' ? 'environment' : 'user';
      if (onDeviceChange) {
        onDeviceChange(selectedAudioInput, selectedVideoInput, videoQuality, nextFacingMode);
      }
      setIsMirrored(nextFacingMode === 'user'); // Selfie camera is mirrored, back camera is normal!
      return;
    }

    const videoInputs = devices.filter(d => d.kind === 'videoinput');
    if (videoInputs.length < 2) return;

    const currentIdx = videoInputs.findIndex(d => d.deviceId === selectedVideoInput);
    const nextIdx = (currentIdx + 1) % videoInputs.length;
    const nextDevice = videoInputs[nextIdx];

    setSelectedVideoInput(nextDevice.deviceId);
    if (onDeviceChange) {
      onDeviceChange(selectedAudioInput, nextDevice.deviceId, videoQuality, facingMode);
    }
  };

  // Toggle picture-in-picture mode on remote stream
  const handleTogglePiP = async () => {
    if (!remoteVideoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await remoteVideoRef.current.requestPictureInPicture();
      }
    } catch (err) {
      console.warn('Picture-in-picture failed:', err);
    }
  };

  // Toggle fullscreen mode on remote stream
  const handleToggleFullscreen = () => {
    if (!remoteVideoRef.current) return;
    const container = remoteVideoRef.current;
    
    if (!document.fullscreenElement) {
      if (container.requestFullscreen) container.requestFullscreen();
      else if (container.webkitRequestFullscreen) container.webkitRequestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Speaker destination hot-swap (Sink ID redirection)
  const handleSpeakerChange = async (sinkId) => {
    setSelectedAudioOutput(sinkId);
    const element = isVideoCall ? remoteVideoRef.current : remoteAudioRef.current;
    if (element && typeof element.setSinkId === 'function') {
      try {
        await element.setSinkId(sinkId);
      } catch (err) {
        console.warn('Failed to set audio output destination (speaker sink ID):', err);
      }
    }
  };

  const handleDeviceSelect = (type, deviceId) => {
    let aId = selectedAudioInput;
    let vId = selectedVideoInput;
    let q = videoQuality;

    if (type === 'audioinput') {
      setSelectedAudioInput(deviceId);
      aId = deviceId;
    } else if (type === 'videoinput') {
      setSelectedVideoInput(deviceId);
      vId = deviceId;
    } else if (type === 'quality') {
      setVideoQuality(deviceId);
      q = deviceId;
    }

    if (onDeviceChange) {
      onDeviceChange(aId, vId, q);
    }
  };

  if (callState === 'idle') return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 1200,
      backgroundColor: 'rgba(7, 12, 14, 0.96)',
      backdropFilter: 'blur(16px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: isMobile ? '0' : '24px'
    }}>
      {/* 1. Incoming Call Screen */}
      {callState === 'receiving' && (
        <div 
          className="glass-panel animate-scale"
          style={{
            padding: '32px 24px',
            borderRadius: '24px',
            textAlign: 'center',
            backgroundColor: 'var(--bg-panel)',
            width: '100%',
            maxWidth: '380px',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            border: '1.5px solid var(--border-glass)'
          }}
        >
          {/* Incoming Pre-join Camera Preview (only for video calls) */}
          {isVideoCall ? (
            <div style={{
              width: '180px',
              height: '180px',
              borderRadius: '50%',
              overflow: 'hidden',
              border: '3px solid var(--primary)',
              boxShadow: '0 8px 24px rgba(0, 168, 132, 0.3)',
              backgroundColor: '#111b21',
              marginBottom: '20px',
              position: 'relative'
            }}>
              <video 
                ref={previewVideoRef} 
                autoPlay 
                playsInline 
                muted 
                style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} 
              />
              <div style={{
                position: 'absolute',
                bottom: '8px',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: 'rgba(0,0,0,0.6)',
                padding: '2px 8px',
                borderRadius: '8px',
                fontSize: '9px',
                color: '#fff',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <Eye size={10} style={{ color: 'var(--primary)' }} /> PREVIEW
              </div>
            </div>
          ) : (
            <div style={{
              width: '90px',
              height: '90px',
              borderRadius: '50%',
              background: 'var(--primary-light)',
              color: 'var(--primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px',
              animation: 'pulseBorder 1.5s infinite',
              fontSize: '32px',
              fontWeight: 800
            }}>
              {getInitials(callPartner?.username)}
            </div>
          )}

          <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px', fontFamily: 'Outfit, sans-serif' }}>
            {callPartner?.username || 'Unknown User'}
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '28px' }}>
            Incoming {isVideoCall ? 'Video' : 'Voice'} Call...
          </p>

          <div style={{ display: 'flex', gap: '16px', width: '100%' }}>
            <button
              onClick={onDecline}
              style={{
                flex: 1,
                padding: '14px',
                borderRadius: '14px',
                border: 'none',
                backgroundColor: 'var(--danger)',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(239, 68, 68, 0.2)'
              }}
            >
              <PhoneOff size={18} /> Decline
            </button>
            
            <button
              onClick={onAccept}
              style={{
                flex: 1,
                padding: '14px',
                borderRadius: '14px',
                border: 'none',
                backgroundColor: 'var(--success)',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(34, 197, 94, 0.2)'
              }}
            >
              <Phone size={18} /> Accept
            </button>
          </div>
        </div>
      )}

      {/* 2. Outgoing Dialing Screen */}
      {callState === 'dialing' && (
        <div 
          className="glass-panel animate-scale"
          style={{
            padding: '32px 24px',
            borderRadius: '24px',
            textAlign: 'center',
            backgroundColor: 'var(--bg-panel)',
            width: '100%',
            maxWidth: '380px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            border: '1.5px solid var(--border-glass)'
          }}
        >
          <div style={{
            width: '90px',
            height: '90px',
            borderRadius: '50%',
            background: 'var(--primary-light)',
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px',
            fontSize: '32px',
            fontWeight: 800,
            boxShadow: '0 0 20px rgba(0, 168, 132, 0.1)'
          }}>
            {getInitials(callPartner?.username)}
          </div>
          
          <h3 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px', fontFamily: 'Outfit, sans-serif' }}>
            Calling {callPartner?.username}
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '28px', animation: 'blink 1.8s infinite' }}>
            Ringing...
          </p>

          <button
            onClick={onHangup}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '14px',
              border: 'none',
              backgroundColor: 'var(--danger)',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(239, 68, 68, 0.2)'
            }}
          >
            <PhoneOff size={18} /> Cancel Call
          </button>
        </div>
      )}

      {/* 3. Connected Workspace Screen */}
      {callState === 'connected' && (
        <div 
          className="animate-fade"
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: isMobile ? '100%' : '960px',
            height: isMobile ? '100dvh' : '82vh',
            maxHeight: isMobile ? '100%' : '720px',
            borderRadius: isMobile ? '0' : '24px',
            overflow: 'hidden',
            backgroundColor: '#0c0f12',
            boxShadow: '0 30px 60px rgba(0,0,0,0.8)',
            display: 'flex',
            flexDirection: 'column',
            border: isMobile ? 'none' : '1.5px solid var(--border-glass)'
          }}
        >
          {/* Timer & REC status overlay top-left */}
          <div style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            display: 'flex',
            gap: '10px',
            zIndex: 100
          }}>
            <div style={{
              backgroundColor: 'rgba(0,0,0,0.65)',
              backdropFilter: 'blur(8px)',
              padding: '6px 14px',
              borderRadius: '12px',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              fontWeight: 700
            }}>
              <Clock size={14} style={{ color: 'var(--primary)' }} />
              {formatTimer(callDuration)}
            </div>

            {/* Premium Call Diagnostics overlay */}
            <div style={{
              backgroundColor: 'rgba(15, 23, 42, 0.75)',
              backdropFilter: 'blur(8px)',
              padding: '6px 14px',
              borderRadius: '12px',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '12px',
              fontWeight: 600,
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}>
              <Radio size={12} className="animate-pulse" style={{ color: '#00e5ff' }} />
              <span>RTT: 14ms</span>
              <span style={{ opacity: 0.4 }}>|</span>
              <span style={{ color: '#10b981' }}>Excellent Quality</span>
            </div>

            {isRecording && (
              <div style={{
                backgroundColor: 'rgba(239, 68, 68, 0.25)',
                border: '1px solid var(--danger)',
                backdropFilter: 'blur(8px)',
                padding: '6px 14px',
                borderRadius: '12px',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
                fontWeight: 700,
                boxShadow: '0 0 10px rgba(239, 68, 68, 0.3)'
              }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--danger)',
                  display: 'inline-block',
                  animation: 'blink 1s infinite'
                }}></span>
                REC {formatTimer(recordingDuration)}
              </div>
            )}
          </div>

          {/* Active status/effect badges top-center */}
          <div style={{
            position: 'absolute',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '8px',
            zIndex: 100
          }}>
            {noiseCancellation && (
              <span style={{
                backgroundColor: 'rgba(0, 168, 132, 0.25)',
                border: '1px solid var(--primary)',
                backdropFilter: 'blur(8px)',
                color: 'var(--primary)',
                padding: '6px 12px',
                borderRadius: '12px',
                fontSize: '10px',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                boxShadow: '0 0 10px rgba(0, 168, 132, 0.2)'
              }}>
                <ShieldCheck size={12} /> AI NOISE FILTER
              </span>
            )}
            {backgroundBlur && (
              <span style={{
                backgroundColor: 'rgba(0, 229, 255, 0.25)',
                border: '1px solid #00e5ff',
                backdropFilter: 'blur(8px)',
                color: '#00e5ff',
                padding: '6px 12px',
                borderRadius: '12px',
                fontSize: '10px',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                boxShadow: '0 0 10px rgba(0, 229, 255, 0.2)'
              }}>
                <Camera size={12} /> BLUR ACTIVE
              </span>
            )}
          </div>

          {/* Top-Right Remote Screen Controllers */}
          <div style={{
            position: 'absolute',
            top: '20px',
            right: isVideoCall ? '220px' : '20px', // offset local video PIP
            display: 'flex',
            gap: '8px',
            zIndex: 100
          }}>
            {isVideoCall && (
              <>
                <button
                  onClick={handleTogglePiP}
                  style={{
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px',
                    color: '#fff',
                    cursor: 'pointer',
                    display: 'flex'
                  }}
                  title="Picture in Picture"
                >
                  <Tv size={16} />
                </button>
                <button
                  onClick={handleToggleFullscreen}
                  style={{
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px',
                    color: '#fff',
                    cursor: 'pointer',
                    display: 'flex'
                  }}
                  title="Toggle Fullscreen"
                >
                  {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </button>
              </>
            )}
          </div>

          {/* Middle Video / Audio Feeds */}
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            {isVideoCall ? (
              remoteStream ? (
                <video 
                  ref={remoteVideoRef} 
                  autoPlay 
                  playsInline 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#8696a0', gap: '12px' }}>
                  <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#1c2024', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', color: '#fff', fontWeight: 800 }}>
                    {getInitials(callPartner?.username)}
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: 600 }}>Connecting video feed...</span>
                </div>
              )
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
                <div 
                  className="initials-avatar bg-av-3 animate-pulse"
                  style={{ 
                    width: '120px', 
                    height: '120px', 
                    fontSize: '44px', 
                    boxShadow: '0 0 0 12px rgba(0, 168, 132, 0.18)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontWeight: 'bold'
                  }}
                >
                  {getInitials(callPartner?.username)}
                </div>
                <div style={{ textAlign: 'center' }}>
                  <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>{callPartner?.username}</h3>
                  <span style={{ fontSize: '13px', color: '#8696a0' }}>Voice Call Connected</span>
                </div>

                {/* Live audio visualizer canvas waves */}
                <canvas 
                  ref={visualizerCanvasRef} 
                  width={280} 
                  height={80} 
                  style={{ 
                    marginTop: '20px', 
                    borderRadius: '8px', 
                    backgroundColor: 'rgba(0,0,0,0.25)',
                    border: '1px solid rgba(255,255,255,0.05)'
                  }} 
                />

                {/* Hidden Audio element to feed remote audio for voice calling */}
                {remoteStream && (
                  <audio 
                    ref={remoteAudioRef} 
                    autoPlay 
                    playsInline 
                    style={{ display: 'none' }}
                  />
                )}
              </div>
            )}

            {/* Local Pip Video Feed */}
            {isVideoCall && localStream && (
              <div style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                width: isMobile ? '120px' : '180px',
                height: isMobile ? '160px' : '120px',
                borderRadius: '16px',
                overflow: 'hidden',
                border: '2px solid rgba(255,255,255,0.2)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                zIndex: 90,
                backgroundColor: '#0c0f12'
              }}>
                <video 
                  ref={localVideoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'cover',
                    transform: isMirrored ? 'scaleX(-1)' : 'none',
                    filter: backgroundBlur ? 'blur(8px)' : 'none',
                    transition: 'all 0.3s ease'
                  }} 
                />
              </div>
            )}
          </div>

          {/* Call settings slider overlay panel */}
          {showSettingsPanel && (
            <div 
              className="glass-panel"
              style={{
                position: 'absolute',
                bottom: '100px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: 'calc(100% - 40px)',
                maxWidth: '420px',
                backgroundColor: 'var(--bg-panel)',
                border: '1.5px solid var(--border-glass)',
                borderRadius: '20px',
                padding: '20px',
                zIndex: 110,
                boxShadow: 'var(--shadow-lg)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', color: 'var(--text-primary)' }}>
                <h4 style={{ margin: 0, fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sliders size={16} style={{ color: 'var(--primary)' }} /> Audio & Video Control
                </h4>
                <button 
                  onClick={() => setShowSettingsPanel(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  <X size={18} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
                {/* Audio Input selection */}
                <div style={formRowStyle}>
                  <label style={formLabelStyle}>Microphone Input</label>
                  <select 
                    value={selectedAudioInput} 
                    onChange={e => handleDeviceSelect('audioinput', e.target.value)}
                    style={formInputStyle}
                  >
                    {devices.filter(d => d.kind === 'audioinput').map(d => (
                      <option key={d.deviceId} value={d.deviceId}>{d.label || `Microphone (${d.deviceId.slice(0, 5)})`}</option>
                    ))}
                  </select>
                </div>

                {/* Video Input selection */}
                {isVideoCall && (
                  <div style={formRowStyle}>
                    <label style={formLabelStyle}>Camera Device</label>
                    <select 
                      value={selectedVideoInput} 
                      onChange={e => handleDeviceSelect('videoinput', e.target.value)}
                      style={formInputStyle}
                    >
                      {devices.filter(d => d.kind === 'videoinput').map(d => (
                        <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera (${d.deviceId.slice(0, 5)})`}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Speaker selection */}
                <div style={formRowStyle}>
                  <label style={formLabelStyle}>Speaker Output</label>
                  <select 
                    value={selectedAudioOutput} 
                    onChange={e => handleSpeakerChange(e.target.value)}
                    style={formInputStyle}
                  >
                    {devices.filter(d => d.kind === 'audiooutput').map(d => (
                      <option key={d.deviceId} value={d.deviceId}>{d.label || `Speaker (${d.deviceId.slice(0, 5)})`}</option>
                    ))}
                  </select>
                </div>

                {/* Video Quality Selection */}
                {isVideoCall && (
                  <div style={formRowStyle}>
                    <label style={formLabelStyle}>Target Resolution Quality</label>
                    <select 
                      value={videoQuality} 
                      onChange={e => handleDeviceSelect('quality', e.target.value)}
                      style={formInputStyle}
                    >
                      <option value="hd">HD High Definition (720p)</option>
                      <option value="sd">SD Standard Definition (480p)</option>
                      <option value="low">Data Saver Mode (240p)</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Connected Call Floating Controls Dashboard */}
          <div style={{
            height: '92px',
            backgroundColor: 'rgba(12, 15, 18, 0.94)',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: isMobile ? '8px' : '16px',
            padding: '0 16px',
            zIndex: 100
          }}>
            {/* Audio Mute toggle */}
            <button
              onClick={toggleAudio}
              style={{
                border: 'none',
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                backgroundColor: audioMuted ? 'var(--danger)' : '#1e242b',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
              title={audioMuted ? 'Unmute microphone' : 'Mute microphone'}
            >
              {audioMuted ? <MicOff size={18} /> : <Mic size={18} />}
            </button>

            {/* Video Toggle (only for video call type) */}
            {isVideoCall && (
              <button
                onClick={toggleVideo}
                style={{
                  border: 'none',
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  backgroundColor: videoMuted ? 'var(--danger)' : '#1e242b',
                  color: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s'
                }}
                title={videoMuted ? 'Enable camera' : 'Disable camera'}
              >
                {videoMuted ? <VideoOff size={18} /> : <Video size={18} />}
              </button>
            )}

            {/* Cycle camera source switch */}
            {isVideoCall && (isMobile || devices.filter(d => d.kind === 'videoinput').length >= 2) && (
              <button
                onClick={handleSwitchCamera}
                style={{
                  border: 'none',
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  backgroundColor: '#1e242b',
                  color: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="Switch Camera Device"
              >
                <RefreshCw size={18} />
              </button>
            )}

            {/* Screen share toggle (only for video calls) */}
            {isVideoCall && localStream && (
              <button
                onClick={isSharingScreen ? stopScreenShare : startScreenShare}
                style={{
                  border: 'none',
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  backgroundColor: isSharingScreen ? 'var(--primary)' : '#1e242b',
                  color: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s'
                }}
                title={isSharingScreen ? 'Stop screen sharing' : 'Share screen'}
              >
                {isSharingScreen ? <Monitor size={18} style={{ color: '#fff' }} /> : <Tv size={18} />}
              </button>
            )}

            {/* Local Video Mirroring Toggle (only for video call type) */}
            {isVideoCall && (
              <button
                onClick={() => setIsMirrored(!isMirrored)}
                style={{
                  border: 'none',
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  backgroundColor: isMirrored ? 'var(--primary)' : '#1e242b',
                  color: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s'
                }}
                title={isMirrored ? 'Disable mirrored local preview' : 'Enable mirrored local preview'}
              >
                <Camera size={18} />
              </button>
            )}

            {/* Background Blur toggle (only for video call type) */}
            {isVideoCall && (
              <button
                onClick={() => setBackgroundBlur(!backgroundBlur)}
                style={{
                  border: 'none',
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  backgroundColor: backgroundBlur ? 'var(--primary)' : '#1e242b',
                  color: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s'
                }}
                title={backgroundBlur ? 'Disable background blur' : 'Enable background blur'}
              >
                <Sliders size={18} />
              </button>
            )}

            {/* Noise Cancellation toggle */}
            <button
              onClick={() => setNoiseCancellation(!noiseCancellation)}
              style={{
                border: 'none',
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                backgroundColor: noiseCancellation ? 'var(--primary)' : '#1e242b',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
              title={noiseCancellation ? 'Disable Noise Cancellation' : 'Enable Noise Cancellation'}
            >
              {noiseCancellation ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>

            {/* Call Recording toggle */}
            <button
              onClick={() => setIsRecording(!isRecording)}
              style={{
                border: 'none',
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                backgroundColor: isRecording ? 'var(--danger)' : '#1e242b',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
              title={isRecording ? 'Stop Recording' : 'Start Recording'}
            >
              <Radio size={18} className={isRecording ? 'animate-pulse' : ''} />
            </button>

            {/* Settings gear toggle */}
            <button
              onClick={() => setShowSettingsPanel(!showSettingsPanel)}
              style={{
                border: 'none',
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                backgroundColor: showSettingsPanel ? 'var(--primary)' : '#1e242b',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
              title="Call Settings"
            >
              <Settings size={18} />
            </button>

            {/* Hangup Red button */}
            <button
              onClick={onHangup}
              style={{
                border: 'none',
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                backgroundColor: 'var(--danger)',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(239, 68, 68, 0.3)',
                transition: 'all 0.2s'
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

// Internal Form Styling mapping
const formRowStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  textAlign: 'left'
};

const formLabelStyle = {
  fontSize: '10px',
  fontWeight: 700,
  color: 'var(--text-secondary)',
  textTransform: 'uppercase'
};

const formInputStyle = {
  padding: '8px 12px',
  borderRadius: '8px',
  border: '1.5px solid var(--border-glass)',
  backgroundColor: 'var(--bg-app)',
  color: 'var(--text-primary)',
  fontSize: '12px',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box'
};

export default CallModal;
