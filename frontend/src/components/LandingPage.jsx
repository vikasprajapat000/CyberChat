// frontend/src/components/LandingPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { 
  Shield, 
  Video, 
  Timer, 
  Eye, 
  Activity, 
  Volume2, 
  ArrowRight, 
  Sparkles, 
  Terminal, 
  Cpu, 
  MessageSquare,
  Network,
  Lock,
  Globe,
  Database,
  Users,
  Compass,
  CheckCircle,
  HelpCircle
} from 'lucide-react';

function LandingPage({ onLaunch, theme, toggleTheme, user }) {
  const [activePage, setActivePage] = useState('home');
  const containerRef = useRef(null);
  const heroMockupRef = useRef(null);
  const titleRef = useRef(null);
  const cardsRef = useRef([]);

  // Reset card refs array on every render
  cardsRef.current = [];

  // Page Scroll Handler
  const navigateToPage = (pageName) => {
    setActivePage(pageName);
    const element = document.getElementById(pageName);
    if (element) {
      const navOffset = 80;
      const elementPosition = element.getBoundingClientRect().top + window.scrollY;
      const offsetPosition = elementPosition - navOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    // 1. Entrance Animations for Active Page Content
    gsap.fromTo('.page-content-wrapper', 
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' }
    );

    // Initial load animation for hero mockup and titles
    const tl = gsap.timeline({ defaults: { ease: 'power3.out', duration: 0.8 } });
    tl.fromTo('.landing-hero-tag', { scale: 0.8, opacity: 0 }, { scale: 1, opacity: 1 })
      .fromTo(titleRef.current, { y: 40, opacity: 0 }, { y: 0, opacity: 1 }, '-=0.5')
      .fromTo('.landing-hero-desc', { y: 30, opacity: 0 }, { y: 0, opacity: 1 }, '-=0.5')
      .fromTo('.landing-hero-ctas', { y: 20, opacity: 0 }, { y: 0, opacity: 1 }, '-=0.5')
      .fromTo(heroMockupRef.current, { rotationX: 45, rotationY: -15, scale: 0.85, opacity: 0 }, { rotationX: 15, rotationY: -10, scale: 1, opacity: 1, duration: 1.2 }, '-=0.4');

    // 2. Continuous Ambient Floating elements
    gsap.to('.ambient-sphere-1', {
      y: '+=40',
      x: '+=20',
      rotation: 360,
      duration: 10,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut'
    });
    gsap.to('.ambient-sphere-2', {
      y: '-=50',
      x: '-=30',
      duration: 12,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut'
    });

    // 3. Mouse Reactive 3D Tilt on Hero Mockup
    const handleMouseMove = (e) => {
      const container = containerRef.current;
      if (!container) return;

      const { width, height, left, top } = container.getBoundingClientRect();
      const x = e.clientX - left - width / 2;
      const y = e.clientY - top - height / 2;

      const xPercent = x / (width / 2);
      const yPercent = y / (height / 2);

      if (heroMockupRef.current) {
        gsap.to(heroMockupRef.current, {
          rotationY: xPercent * 20,
          rotationX: -yPercent * 20 + 10,
          transformPerspective: 1200,
          ease: 'power1.out',
          duration: 0.3
        });
      }
    };

    // 4. Scroll Spy to highlight the active nav tab
    const handleScrollSpy = () => {
      const sections = ['home', 'features', 'security', 'tech', 'pricing', 'about'];
      const scrollPos = window.scrollY + 200; // Trigger line offset

      for (const section of sections) {
        const el = document.getElementById(section);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            setActivePage(section);
            break;
          }
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('scroll', handleScrollSpy);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScrollSpy);
    };
  }, []);

  // Card Interactive 3D Hover Tilt Handler
  const handleCardMouseMove = (e, index) => {
    const card = cardsRef.current[index];
    if (!card) return;

    const { width, height, left, top } = card.getBoundingClientRect();
    const x = e.clientX - left - width / 2;
    const y = e.clientY - top - height / 2;

    const tiltX = -(y / (height / 2)) * 15;
    const tiltY = (x / (width / 2)) * 15;

    gsap.to(card, {
      rotationX: tiltX,
      rotationY: tiltY,
      transformPerspective: 800,
      scale: 1.04,
      boxShadow: '0 25px 50px rgba(0, 168, 132, 0.3)',
      borderColor: 'var(--primary)',
      duration: 0.25,
      ease: 'power2.out'
    });
  };

  const handleCardMouseLeave = (index) => {
    const card = cardsRef.current[index];
    if (!card) return;

    gsap.to(card, {
      rotationX: 0,
      rotationY: 0,
      scale: 1,
      boxShadow: 'var(--shadow-sm)',
      borderColor: 'rgba(255, 255, 255, 0.05)',
      duration: 0.45,
      ease: 'power2.out'
    });
  };

  const features = [
    {
      icon: <Video size={24} className="text-teal-400" />,
      title: "Real-time P2P Calling",
      desc: "Instant WebRTC high-definition video and audio calls with native screensharing integrated directly in your browser."
    },
    {
      icon: <Timer size={24} className="text-amber-400" />,
      title: "Disappearing Messages",
      desc: "Set automatic self-destruct timers (10 seconds to 1 day) that scrub confidential chats from all clients and databases."
    },
    {
      icon: <Eye size={24} className="text-indigo-400" />,
      title: "View-Once Ephemeral Media",
      desc: "Send sensitive files obscured by a biometric blur filter that self-destructs the moment the recipient closes the decrypted portal."
    },
    {
      icon: <Activity size={24} className="text-rose-400" />,
      title: "Live Audit & Analytics",
      desc: "Admin panels built to monitor network logs, message throughputs, active rooms, and active websocket connections."
    },
    {
      icon: <Volume2 size={24} className="text-cyan-400" />,
      title: "Spatial Soundscape Synth",
      desc: "An ambient Web Audio synthesizer widget playing cyberpunk drone hums and lofi chords to maximize workflow focus."
    },
    {
      icon: <Shield size={24} className="text-emerald-400" />,
      title: "Zero Metadata Footprints",
      desc: "Passwordless authentication, client-side decryption overlays, and server-side timers ensure strict privacy."
    }
  ];

  const pricingPlans = [
    {
      name: "Guest Plan",
      price: "$0",
      period: "forever",
      desc: "Perfect for quick, off-the-record ephemeral chats.",
      features: [
        "Access to global-lounge",
        "Disappearing messages (10s timer)",
        "Standard audio call",
        "Web Audio synth engine",
        "Max 5 active concurrent chats"
      ],
      color: "#00a884",
      glowColor: "rgba(0, 168, 132, 0.25)"
    },
    {
      name: "Hacker Pro",
      price: "$9.99",
      period: "month",
      desc: "Advanced security tools for privacy enthusiasts.",
      features: [
        "Create custom rooms (private/public)",
        "Fully customizable self-destruct timers",
        "HD Video calling & screenshare",
        "View-Once media file sharing",
        "Encrypted backup export tool",
        "Priority message delivery"
      ],
      color: "#3b82f6",
      glowColor: "rgba(59, 130, 246, 0.25)",
      popular: true
    },
    {
      name: "Cyber Elite",
      price: "$29.99",
      period: "month",
      desc: "Corporate-grade metadata sealing and admin controls.",
      features: [
        "All Hacker Pro features",
        "Full Administrative Dashboard access",
        "Biometric client-side lock keys",
        "Download audit logs in encrypted PDF format",
        "Unlimited storage for uploads",
        "Dedicated websocket channels"
      ],
      color: "#ec4899",
      glowColor: "rgba(236, 72, 153, 0.25)"
    }
  ];

  const techStack = [
    { icon: <Cpu size={32} className="text-teal-400" />, name: "React (Vite)", desc: "High-performance frontend client with optimized code bundling." },
    { icon: <Terminal size={32} className="text-blue-400" />, name: "Node.js & Express", desc: "Robust and secure backend server architecture handles REST APIs." },
    { icon: <Network size={32} className="text-indigo-400" />, name: "Socket.IO", desc: "Bi-directional websocket engine for real-time secure messaging." },
    { icon: <Shield size={32} className="text-rose-400" />, name: "WebRTC P2P", desc: "Peer-to-peer media pipeline for high-quality voice, video, and screen sharing." },
    { icon: <Database size={32} className="text-emerald-400" />, name: "MongoDB & Mongoose", desc: "Dynamic document storage utilizing TTL indexing for secure message deletion." },
    { icon: <Sparkles size={32} className="text-amber-400" />, name: "GSAP & Web Audio", desc: "Fluid 3D transform animations and real-time oscillator synthesizers." }
  ];

  const renderHome = () => (
    <div style={{ padding: '60px 8%', textAlign: 'center', position: 'relative', zIndex: 1 }}>
      <div 
        className="landing-hero-tag"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: 'rgba(0, 168, 132, 0.08)',
          border: '1px solid rgba(0, 168, 132, 0.25)',
          padding: '6px 14px',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: 700,
          color: '#00a884',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          marginBottom: '28px'
        }}
      >
        <Sparkles size={14} /> WebRTC & Socket.io Ephemeral Communication
      </div>

      <h1 
        ref={titleRef}
        style={{
          fontSize: 'min(58px, 9vw)',
          fontWeight: 900,
          lineHeight: 1.15,
          color: '#fff',
          maxWidth: '900px',
          margin: '0 auto 24px',
          fontFamily: "'Outfit', sans-serif"
        }}
      >
        Secure 3D Chat Space for the <span style={{
          background: 'linear-gradient(90deg, #00a884 0%, #3b82f6 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>Next-Gen</span> Workspace
      </h1>

      <p 
        className="landing-hero-desc"
        style={{
          fontSize: '18px',
          color: '#94a3b8',
          maxWidth: '650px',
          margin: '0 auto 40px',
          lineHeight: 1.6
        }}
      >
        A highly interactive, real-time messaging application powered by WebRTC for encrypted media calls, 3D ambient soundscapes, and advanced self-destruct timers.
      </p>

      <div 
        className="landing-hero-ctas"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          marginBottom: '80px'
        }}
      >
        <button 
          onClick={onLaunch}
          className="neon-glow-btn"
          style={{
            padding: '16px 36px',
            borderRadius: '12px',
            backgroundColor: '#00a884',
            color: '#050a0e',
            border: 'none',
            fontSize: '16px',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 8px 30px rgba(0, 168, 132, 0.4)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          {user ? 'Enter Chat' : 'Get In / Register'} <ArrowRight size={18} />
        </button>
        <button 
          onClick={() => navigateToPage('features')}
          className="secondary-btn"
          style={{
            padding: '16px 36px',
            borderRadius: '12px',
            backgroundColor: 'transparent',
            color: '#fff',
            border: '1.5px solid rgba(255,255,255,0.1)',
            fontSize: '16px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
        >
          Explore Features
        </button>
      </div>

      {/* 3D Mockup Container */}
      <div 
        style={{
          perspective: '2000px',
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          zIndex: 10,
          position: 'relative'
        }}
      >
        <div 
          ref={heroMockupRef}
          className="glass-panel"
          style={{
            width: '100%',
            maxWidth: '920px',
            height: '500px',
            borderRadius: '24px',
            boxShadow: '0 30px 60px rgba(0,0,0,0.5), 0 0 100px rgba(0, 168, 132, 0.1)',
            border: '1.5px solid rgba(255, 255, 255, 0.1)',
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(9, 15, 24, 0.9) 100%)',
            transformStyle: 'preserve-3d',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            textAlign: 'left'
          }}
        >
          {/* Window bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 24px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ef4444' }} />
              <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#eab308' }} />
              <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#22c55e' }} />
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, letterSpacing: '0.05em' }}>
              WORKSPACE INTERACTIVE SIMULATOR (CC)
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#00a884', fontSize: '11px', fontWeight: 700 }}>
              <span className="ping-pulse ping-excellent" style={{ width: '6px', height: '6px' }} /> SECURE
            </div>
          </div>

          {/* Split layout inside mockup */}
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            {/* Mock Sidebar */}
            <div style={{ width: '250px', borderRight: '1px solid rgba(255,255,255,0.06)', padding: '16px', background: 'rgba(0,0,0,0.1)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ height: '36px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', padding: '0 10px', fontSize: '12px', color: '#94a3b8' }}>
                  🔍 Search chats...
                </div>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '10px' }}>Channels</span>
                <div style={{ padding: '8px', borderRadius: '6px', background: 'rgba(0, 168, 132, 0.1)', color: '#00a884', fontSize: '13px', fontWeight: 600 }}>
                  # global-lounge
                </div>
                <div style={{ padding: '8px', borderRadius: '6px', color: '#64748b', fontSize: '13px' }}>
                  # development-room
                </div>
                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '10px' }}>Direct Messages</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'linear-gradient(135deg, #FF6B6B, #FF8E53)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: '#fff' }}>VP</div>
                  <span style={{ fontSize: '13px', color: '#94a3b8' }}>Vikas Prajapat</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'linear-gradient(135deg, #11998E, #38EF7D)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: '#fff' }}>AI</div>
                  <span style={{ fontSize: '13px', color: '#94a3b8' }}>CyberAI Assistant</span>
                </div>
              </div>
            </div>

            {/* Mock Chat Area */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px', marginBottom: '16px' }}>
                <span style={{ fontWeight: 700, color: '#fff' }}># global-lounge</span>
                <span style={{ fontSize: '11px', color: '#64748b' }}>Active members: 42</span>
              </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #FF6B6B, #FF8E53)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>VP</div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#fff' }}>Vikas Prajapat</span>
                      <span style={{ fontSize: '9px', color: '#64748b' }}>10:24 PM</span>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.04)', padding: '10px 14px', borderRadius: '0 12px 12px 12px', fontSize: '13px', color: '#cbd5e1', marginTop: '4px', maxWidth: '380px' }}>
                      Can someone summarize the status updates discussed in the dev channel today? @ai
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #7F00FF, #E100FF)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: '#fff', flexShrink: 0 }}>AI</div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#00a884' }}>CyberAI Assistant</span>
                      <span style={{ fontSize: '9px', color: '#64748b' }}>10:24 PM</span>
                    </div>
                    <div style={{ background: 'rgba(0, 168, 132, 0.08)', border: '1px solid rgba(0, 168, 132, 0.2)', padding: '10px 14px', borderRadius: '0 12px 12px 12px', fontSize: '13px', color: '#00a884', marginTop: '4px', maxWidth: '380px', lineHeight: '1.4' }}>
                      🤖 **CyberAI digest**:<br/>
                      - **Audio Modules**: Fully configured and synced.<br/>
                      - **Authentication**: Passwordless profiles operational.<br/>
                      - **3D Features**: Ready to deploy!
                    </div>
                  </div>
                </div>
              </div>

              {/* Input block inside mockup */}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px', display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1, height: '38px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', padding: '0 14px', fontSize: '13px', color: '#64748b' }}>
                  Type your secure message...
                </div>
                <button style={{ width: '38px', height: '38px', borderRadius: '8px', backgroundColor: '#00a884', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#050a0e', fontWeight: 'bold' }}>
                  ➔
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderFeatures = () => (
    <section style={{ padding: '40px 8%', position: 'relative', zIndex: 2 }}>
      <div style={{ textAlign: 'center', marginBottom: '60px' }}>
        <h2 style={{ fontSize: '40px', fontWeight: 800, color: '#fff', marginBottom: '16px' }}>
          Platform Capabilities
        </h2>
        <p style={{ fontSize: '17px', color: '#94a3b8', maxWidth: '600px', margin: '0 auto', lineHeight: 1.5 }}>
          CyberChar integrates next-generation privacy components with hardware-accelerated 3D effects. Hover over each core module below to feel the perspective shift.
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '30px',
        maxWidth: '1100px',
        margin: '0 auto'
      }}>
        {features.map((feat, idx) => (
          <div 
            key={idx}
            ref={el => cardsRef.current[idx] = el}
            onMouseMove={(e) => handleCardMouseMove(e, idx)}
            onMouseLeave={() => handleCardMouseLeave(idx)}
            className="glass-panel"
            style={{
              padding: '36px 28px',
              borderRadius: '20px',
              border: '1.5px solid rgba(255, 255, 255, 0.05)',
              background: 'rgba(15, 23, 42, 0.4)',
              textAlign: 'left',
              cursor: 'default',
              transformStyle: 'preserve-3d',
              boxShadow: 'var(--shadow-sm)',
              transition: 'border-color 0.3s ease'
            }}
          >
            <div style={{
              width: '50px',
              height: '50px',
              borderRadius: '14px',
              background: 'rgba(255,255,255,0.03)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '24px',
              border: '1px solid rgba(255,255,255,0.06)'
            }}>
              {feat.icon}
            </div>
            <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#fff', marginBottom: '12px' }}>
              {feat.title}
            </h3>
            <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: 1.6 }}>
              {feat.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );

  const renderSecurity = () => (
    <section style={{ padding: '40px 8%', position: 'relative', zIndex: 2 }}>
      <div style={{ textAlign: 'center', marginBottom: '60px' }}>
        <h2 style={{ fontSize: '40px', fontWeight: 800, color: '#fff', marginBottom: '16px' }}>
          Zero-Metadata Sealing
        </h2>
        <p style={{ fontSize: '17px', color: '#94a3b8', maxWidth: '600px', margin: '0 auto', lineHeight: 1.5 }}>
          Our security model enforces client-side decryption and immediate database recycling. Your logs never leave trace markers.
        </p>
      </div>

      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '40px',
        maxWidth: '1000px',
        margin: '0 auto',
        alignItems: 'center'
      }}>
        {/* Security Description */}
        <div style={{ flex: '1 1 450px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(5, 10, 14, 0.4)' }}>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <Lock className="text-teal-400" size={24} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>End-to-End Encryption Keys</h3>
                <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.5 }}>All chat contents and attachments are protected using standard symmetric key algorithms locally before websocket transit.</p>
              </div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(5, 10, 14, 0.4)' }}>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <Timer className="text-amber-400" size={24} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>Automatic TTL Database Scraping</h3>
                <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.5 }}>Using Mongoose TTL (Time-To-Live) indexing, disappearing messages delete themselves automatically from cloud documents with 0s delays.</p>
              </div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '24px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(5, 10, 14, 0.4)' }}>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <Eye className="text-rose-400" size={24} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>Anti-Screenshot & Blurred Overlays</h3>
                <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.5 }}>View-once media is obscured by secure render blocks. Accessing it triggers real-time console auditing and immediate destruction on viewport exit.</p>
              </div>
            </div>
          </div>
        </div>

        {/* 3D Shield Interactive Graphic */}
        <div style={{ flex: '1 1 350px', display: 'flex', justifyContent: 'center' }}>
          <div className="security-shield-3d" style={{
            perspective: '1000px',
            width: '100%',
            height: '350px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <div 
              className="glass-panel" 
              style={{
                width: '260px',
                height: '260px',
                borderRadius: '30px',
                border: '2px solid #00a884',
                boxShadow: '0 0 50px rgba(0, 168, 132, 0.2), 0 10px 30px rgba(0,0,0,0.5)',
                background: 'linear-gradient(135deg, rgba(0,168,132,0.15) 0%, rgba(59,130,246,0.08) 100%)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                transform: 'rotateY(20deg) rotateX(10deg)',
                transformStyle: 'preserve-3d',
                transition: 'transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)',
                cursor: 'pointer'
              }}
              onMouseMove={(e) => {
                const { width, height, left, top } = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - left - width/2;
                const y = e.clientY - top - height/2;
                e.currentTarget.style.transform = `rotateY(${x/width * 45}deg) rotateX(${-y/height * 45}deg) scale(1.06)`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'rotateY(20deg) rotateX(10deg)';
              }}
            >
              <Shield size={90} style={{ color: '#00a884', filter: 'drop-shadow(0 0 20px rgba(0,168,132,0.5))' }} />
              <span style={{ marginTop: '24px', fontWeight: 800, color: '#fff', fontSize: '18px', letterSpacing: '3px', fontFamily: "'Outfit', sans-serif" }}>SECURE LINK</span>
              <div style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: '30px',
                transform: 'translateZ(-20px)',
                pointerEvents: 'none',
                opacity: 0.5
              }} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );

  const renderTech = () => (
    <section style={{ padding: '40px 8%', position: 'relative', zIndex: 2 }}>
      <div style={{ textAlign: 'center', marginBottom: '60px' }}>
        <h2 style={{ fontSize: '40px', fontWeight: 800, color: '#fff', marginBottom: '16px' }}>
          Engine & Architecture
        </h2>
        <p style={{ fontSize: '17px', color: '#94a3b8', maxWidth: '600px', margin: '0 auto', lineHeight: 1.5 }}>
          CyberChar relies on a hardened JavaScript stack to run sub-millisecond encryption and media delivery.
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '30px',
        maxWidth: '1000px',
        margin: '0 auto'
      }}>
        {techStack.map((tech, idx) => (
          <div 
            key={idx}
            className="glass-panel"
            style={{
              padding: '30px 24px',
              borderRadius: '16px',
              border: '1px solid rgba(255,255,255,0.05)',
              background: 'rgba(15, 23, 42, 0.3)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              transition: 'transform 0.3s ease, border-color 0.3s ease',
              cursor: 'default'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-6px)';
              e.currentTarget.style.borderColor = 'rgba(0,168,132,0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
            }}
          >
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.02)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px',
              border: '1px solid rgba(255,255,255,0.05)'
            }}>
              {tech.icon}
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#fff', marginBottom: '10px' }}>
              {tech.name}
            </h3>
            <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.5 }}>
              {tech.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );

  const renderPricing = () => (
    <section style={{ padding: '40px 8%', position: 'relative', zIndex: 2 }}>
      <div style={{ textAlign: 'center', marginBottom: '60px' }}>
        <h2 style={{ fontSize: '40px', fontWeight: 800, color: '#fff', marginBottom: '16px' }}>
          Flexible Access Plans
        </h2>
        <p style={{ fontSize: '17px', color: '#94a3b8', maxWidth: '600px', margin: '0 auto', lineHeight: 1.5 }}>
          Select the privacy tier that suits your security demands. All transactions are logged anonymously.
        </p>
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'center',
        flexWrap: 'wrap',
        gap: '30px',
        maxWidth: '1100px',
        margin: '0 auto',
        perspective: '1500px'
      }}>
        {pricingPlans.map((plan, idx) => (
          <div 
            key={idx}
            ref={el => cardsRef.current[idx] = el}
            onMouseMove={(e) => handleCardMouseMove(e, idx)}
            onMouseLeave={(e) => {
              handleCardMouseLeave(idx);
              if (plan.popular) {
                e.currentTarget.style.boxShadow = `0 10px 40px ${plan.glowColor}`;
                e.currentTarget.style.borderColor = plan.color;
              }
            }}
            className="glass-panel"
            style={{
              flex: '1 1 300px',
              maxWidth: '350px',
              borderRadius: '24px',
              padding: '40px 30px',
              background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.7) 0%, rgba(5, 10, 14, 0.9) 100%)',
              border: plan.popular ? `2px solid ${plan.color}` : '1.5px solid rgba(255, 255, 255, 0.05)',
              boxShadow: plan.popular ? `0 15px 40px ${plan.glowColor}` : '0 10px 30px rgba(0,0,0,0.3)',
              position: 'relative',
              transformStyle: 'preserve-3d',
              display: 'flex',
              flexDirection: 'column',
              textAlign: 'left'
            }}
          >
            {plan.popular && (
              <span style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                fontSize: '11px',
                fontWeight: 800,
                color: '#fff',
                backgroundColor: plan.color,
                padding: '4px 10px',
                borderRadius: '20px',
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}>
                POPULAR
              </span>
            )}
            
            <h3 style={{ fontSize: '22px', fontWeight: 800, color: '#fff', marginBottom: '8px' }}>
              {plan.name}
            </h3>
            <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '24px', minHeight: '36px' }}>
              {plan.desc}
            </p>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '28px' }}>
              <span style={{ fontSize: '44px', fontWeight: 900, color: '#fff' }}>{plan.price}</span>
              <span style={{ fontSize: '14px', color: '#64748b' }}>/ {plan.period}</span>
            </div>

            <button 
              onClick={onLaunch}
              className="neon-glow-btn"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '12px',
                backgroundColor: plan.color,
                color: '#fff',
                border: 'none',
                fontWeight: 800,
                fontSize: '15px',
                cursor: 'pointer',
                marginBottom: '32px',
                boxShadow: `0 4px 15px ${plan.glowColor}`,
                transition: 'transform 0.2s ease'
              }}
            >
              {user ? 'Go to Chat' : 'Get In / Register'}
            </button>

            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
              {plan.features.map((feat, fidx) => (
                <li key={fidx} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#cbd5e1' }}>
                  <CheckCircle size={16} style={{ color: plan.color, flexShrink: 0 }} />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );

  const renderAbout = () => (
    <section style={{ padding: '40px 8%', position: 'relative', zIndex: 2 }}>
      <div style={{ textAlign: 'center', marginBottom: '60px' }}>
        <h2 style={{ fontSize: '40px', fontWeight: 800, color: '#fff', marginBottom: '16px' }}>
          Our Mission
        </h2>
        <p style={{ fontSize: '17px', color: '#94a3b8', maxWidth: '600px', margin: '0 auto', lineHeight: 1.5 }}>
          CyberChar aims to decouple personal communication from corporate telemetry pools. We build sovereign, zero-knowledge tunnels.
        </p>
      </div>

      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '40px',
        maxWidth: '1000px',
        margin: '0 auto',
        alignItems: 'center'
      }}>
        {/* Mission Description */}
        <div style={{ flex: '1 1 450px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ fontSize: '24px', fontWeight: 800, color: '#fff', marginBottom: '8px' }}>
            Digital Sanctuary Redefined
          </h3>
          <p style={{ fontSize: '15px', color: '#94a3b8', lineHeight: 1.6 }}>
            Traditional messenger hubs log your network graphs, trace durations, and analyze typing intervals. CyberChar operates on a zero-tracking framework. We don't store message histories unless explicitly locked, and we sweep server caches periodically.
          </p>
          <p style={{ fontSize: '15px', color: '#94a3b8', lineHeight: 1.6 }}>
            Our dynamic, client-side 3D render interfaces are more than aesthetic statements: they are designed to isolate your conversations into specialized secure viewports. Together, we are taking digital sovereignty back.
          </p>
          
          <div style={{ display: 'flex', gap: '30px', marginTop: '20px' }}>
            <div>
              <h4 style={{ fontSize: '28px', fontWeight: 900, color: '#00a884' }}>100%</h4>
              <p style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>P2P Encryption</p>
            </div>
            <div>
              <h4 style={{ fontSize: '28px', fontWeight: 900, color: '#3b82f6' }}>0.0s</h4>
              <p style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Telemetry Retained</p>
            </div>
            <div>
              <h4 style={{ fontSize: '28px', fontWeight: 900, color: '#ec4899' }}>24/7</h4>
              <p style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>Secured Channels</p>
            </div>
          </div>
        </div>

        {/* Nodes Mock Visualization */}
        <div style={{ flex: '1 1 350px', display: 'flex', justifyContent: 'center' }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '380px',
            borderRadius: '24px',
            border: '1px solid rgba(255,255,255,0.06)',
            padding: '30px',
            background: 'rgba(5, 10, 14, 0.5)',
            boxShadow: '0 15px 40px rgba(0,0,0,0.4)',
            textAlign: 'left'
          }}>
            <h4 style={{ fontSize: '16px', fontWeight: 800, color: '#fff', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Globe size={18} className="text-teal-400" /> Active Global Nodes
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justify: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)' }}>
                <span style={{ fontSize: '13px', color: '#cbd5e1' }}>🇺🇸 Node-Alpha (Oregon)</span>
                <span style={{ fontSize: '11px', color: '#00a884', fontWeight: 700 }}>12ms (Active)</span>
              </div>
              <div style={{ display: 'flex', justify: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)' }}>
                <span style={{ fontSize: '13px', color: '#cbd5e1' }}>🇩🇪 Node-Beta (Frankfurt)</span>
                <span style={{ fontSize: '11px', color: '#00a884', fontWeight: 700 }}>24ms (Active)</span>
              </div>
              <div style={{ display: 'flex', justify: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)' }}>
                <span style={{ fontSize: '13px', color: '#cbd5e1' }}>🇸🇬 Node-Gamma (Singapore)</span>
                <span style={{ fontSize: '11px', color: '#00a884', fontWeight: 700 }}>45ms (Active)</span>
              </div>
              <div style={{ display: 'flex', justify: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)' }}>
                <span style={{ fontSize: '13px', color: '#cbd5e1' }}>🇮🇳 Node-Delta (Mumbai)</span>
                <span style={{ fontSize: '11px', color: '#00a884', fontWeight: 700 }}>8ms (Active)</span>
              </div>
            </div>
            <div style={{ marginTop: '20px', fontSize: '11px', color: '#64748b', textAlign: 'center', fontWeight: 600 }}>
              Encrypted routes update automatically every 5 minutes.
            </div>
          </div>
        </div>
      </div>
    </section>
  );

  const renderActivePage = () => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '80px' }}>
        <div id="home">{renderHome()}</div>
        <div id="features">{renderFeatures()}</div>
        <div id="security">{renderSecurity()}</div>
        <div id="tech">{renderTech()}</div>
        <div id="pricing">{renderPricing()}</div>
        <div id="about">{renderAbout()}</div>
      </div>
    );
  };

  return (
    <div 
      ref={containerRef}
      className="cyber-grid-bg"
      style={{
        width: '100%',
        minHeight: '100vh',
        backgroundColor: '#050a0e',
        color: '#e2e8f0',
        fontFamily: "'Outfit', sans-serif",
        overflowX: 'hidden',
        position: 'relative',
        paddingBottom: '80px',
        paddingTop: '80px',
        boxSizing: 'border-box'
      }}
    >
      {/* Decorative Blur Spheres */}
      <div 
        className="ambient-sphere-1"
        style={{
          position: 'absolute',
          top: '15%',
          left: '10%',
          width: '280px',
          height: '280px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0, 168, 132, 0.15) 0%, transparent 70%)',
          filter: 'blur(30px)',
          pointerEvents: 'none',
          zIndex: 0
        }}
      />
      <div 
        className="ambient-sphere-2"
        style={{
          position: 'absolute',
          bottom: '25%',
          right: '5%',
          width: '320px',
          height: '320px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59, 130, 246, 0.12) 0%, transparent 70%)',
          filter: 'blur(40px)',
          pointerEvents: 'none',
          zIndex: 0
        }}
      />

      {/* Navigation Header */}
      <nav 
        className="landing-nav"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 8%',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          backdropFilter: 'blur(16px)',
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          background: 'rgba(5, 10, 14, 0.85)'
        }}
      >
        {/* Brand Logo and Name */}
        <div 
          onClick={() => navigateToPage('home')}
          style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
        >
          <img 
            src="/logo.png" 
            alt="CyberChar Logo" 
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              border: '1.5px solid rgba(0, 168, 132, 0.3)',
              boxShadow: '0 0 15px rgba(0, 168, 132, 0.2)',
              objectFit: 'cover'
            }} 
          />
          <span style={{ fontSize: '20px', fontWeight: 900, letterSpacing: '0.05em', color: '#fff' }}>
            CYBER<span style={{ color: '#00a884' }}>CHAR</span>
          </span>
        </div>

        {/* Tab links */}
        <div style={{ display: 'flex', gap: '28px', alignItems: 'center' }} className="landing-nav-links">
          {['Home', 'Features', 'Security', 'Tech Stack', 'Pricing', 'About'].map((tab) => {
            const pageId = tab === 'Tech Stack' ? 'tech' : tab.toLowerCase();
            const isActive = activePage === pageId;
            return (
              <span
                key={tab}
                onClick={() => navigateToPage(pageId)}
                style={{
                  fontSize: '14px',
                  fontWeight: isActive ? 800 : 500,
                  color: isActive ? '#00a884' : '#94a3b8',
                  cursor: 'pointer',
                  transition: 'color 0.2s ease',
                  borderBottom: isActive ? '2px solid #00a884' : '2px solid transparent',
                  paddingBottom: '4px',
                  position: 'relative'
                }}
              >
                {tab}
              </span>
            );
          })}
        </div>

        <button 
          onClick={onLaunch}
          className="neon-glow-btn"
          style={{
            padding: '10px 22px',
            borderRadius: '30px',
            backgroundColor: '#00a884',
            color: '#050a0e',
            border: 'none',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 20px rgba(0, 168, 132, 0.4)'
          }}
        >
          {user ? 'Go to Chat' : 'Get In / Register'} <ArrowRight size={15} />
        </button>
      </nav>

      {/* Main Render Page Content Wrapper */}
      <div className="page-content-wrapper" style={{ opacity: 0 }}>
        {renderActivePage()}
      </div>

      {/* Footer Branding Panel */}
      <footer style={{
        marginTop: '80px',
        padding: '40px 8% 20px',
        borderTop: '1px solid rgba(255,255,255,0.04)',
        textAlign: 'center',
        position: 'relative',
        zIndex: 2
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <img src="/logo.png" alt="Logo" style={{ width: '24px', height: '24px', borderRadius: '6px' }} />
          <span style={{ fontSize: '14px', fontWeight: 800, color: '#fff' }}>
            CYBER<span style={{ color: '#00a884' }}>CHAR</span>
          </span>
        </div>
        <p style={{ fontSize: '11px', color: '#64748b' }}>
          &copy; {new Date().getFullYear()} CyberChar. All rights reserved. Zero logs, 100% encryption.
        </p>
      </footer>
    </div>
  );
}

export default LandingPage;
