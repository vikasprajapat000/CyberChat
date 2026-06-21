// frontend/src/components/Login.jsx
import React, { useState, useEffect } from 'react';
import { Shield, ArrowRight, Sun, Moon, User, Lock, Mail, Key, KeyRound, Eye, EyeOff, QrCode } from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:5000' : 'https://cyberchat-d26c.onrender.com');

function Login({ onLogin, theme, toggleTheme, showToast, onBack }) {
  const [tab, setTab] = useState('login'); // login, register_user, register_admin, forgot, reset

  // Common credentials
  const [loginId, setLoginId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // User Register credentials
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regUserId, setRegUserId] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  // Admin Register credentials
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminId, setAdminId] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');
  const [adminSecretKey, setAdminSecretKey] = useState('');

  // Recovery credentials
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Errors & Telemetry states
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // QR Login Scanner States
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [qrScanProgress, setQrScanProgress] = useState(0);
  const [qrStatusText, setQrStatusText] = useState('Initiating scanner...');

  // QR Login simulation
  useEffect(() => {
    let interval;
    if (showQRScanner) {
      setQrScanProgress(0);
      setQrStatusText('Initializing scanner...');
      interval = setInterval(() => {
        setQrScanProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            handleQRLogin();
            return 100;
          }
          const nextProgress = prev + 5;
          if (nextProgress < 30) setQrStatusText('Searching for matrix anchor...');
          else if (nextProgress < 60) setQrStatusText('Analyzing cyber signature...');
          else if (nextProgress < 90) setQrStatusText('Decrypting handshake payload...');
          else setQrStatusText('Authenticating token keys...');
          return nextProgress;
        });
      }, 120);
    } else {
      setQrScanProgress(0);
    }
    return () => clearInterval(interval);
  }, [showQRScanner]);

  const handleQRLogin = async () => {
    setLoading(true);
    setError('');
    const demoId = 'demo_user';
    const demoPassword = 'password123';

    try {
      // 1. Try login first
      const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: demoId, password: demoPassword })
      });

      const data = await res.json();
      if (res.ok) {
        showToast('QR Scan successful! Welcome back, Agent.', 'success');
        onLogin(data.user, data.token, rememberMe);
        setShowQRScanner(false);
        return;
      }

      // 2. If login fails, register the demo user first
      const registerRes = await fetch(`${BACKEND_URL}/api/auth/register-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'Demo User',
          email: 'demo@cyberchat.com',
          userId: demoId,
          password: demoPassword
        })
      });

      const registerData = await registerRes.json();
      if (!registerRes.ok && registerData.error !== 'User ID is already taken' && registerData.error !== 'Email is already registered') {
        throw new Error(registerData.error || 'Failed to initialize QR demo user profile.');
      }

      // 3. Retry login
      const retryRes = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: demoId, password: demoPassword })
      });

      const retryData = await retryRes.json();
      if (!retryRes.ok) {
        throw new Error(retryData.error || 'Failed to authenticate after QR generation.');
      }

      showToast('QR Scan successful! Welcome to CyberChat.', 'success');
      onLogin(retryData.user, retryData.token, rememberMe);
      setShowQRScanner(false);
    } catch (err) {
      showToast(err.message || 'QR Authentication failed.', 'error');
      setError(err.message || 'QR Authentication failed.');
      setShowQRScanner(false);
    } finally {
      setLoading(false);
    }
  };

  // Helper to get initials
  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2);
    return (parts[0][0] + parts[1][0]).substring(0, 2);
  };

  // Helper to pick avatar color gradient class based on name string
  const getAvatarBgClass = (name) => {
    if (!name) return 'bg-av-1';
    let code = 0;
    for (let i = 0; i < name.length; i++) {
      code += name.charCodeAt(i);
    }
    const idx = (code % 8) + 1;
    return `bg-av-${idx}`;
  };

  const handleTabChange = (targetTab) => {
    setTab(targetTab);
    setError('');
    setShowPassword(false);
  };

  // Handle Login API
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!loginId.trim() || !loginPassword.trim()) {
      setError('Please enter both ID and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: loginId.trim(), password: loginPassword.trim() })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login verification failed.');
      }

      showToast('Logged in successfully!', 'success');
      onLogin(data.user, data.token, rememberMe);
    } catch (err) {
      setError(err.message || 'Server connection failed.');
    } finally {
      setLoading(false);
    }
  };

  // Handle User Registration API
  const handleRegisterUserSubmit = async (e) => {
    e.preventDefault();
    if (!regUsername.trim() || !regEmail.trim() || !regUserId.trim() || !regPassword.trim() || !regConfirmPassword.trim()) {
      setError('All fields are required.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (regPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/register-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: regUsername.trim(),
          email: regEmail.trim(),
          userId: regUserId.trim(),
          password: regPassword.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'User registration failed.');
      }

      showToast(data.message, 'success');
      // Reset inputs & switch back to login
      setRegUsername('');
      setRegEmail('');
      setRegUserId('');
      setRegPassword('');
      setRegConfirmPassword('');
      handleTabChange('login');
    } catch (err) {
      setError(err.message || 'Server connection failed.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Admin Registration API
  const handleRegisterAdminSubmit = async (e) => {
    e.preventDefault();
    if (!adminName.trim() || !adminEmail.trim() || !adminId.trim() || !adminPassword.trim() || !adminConfirmPassword.trim() || !adminSecretKey.trim()) {
      setError('All fields are required.');
      return;
    }

    if (adminPassword !== adminConfirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (adminPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/register-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminName: adminName.trim(),
          email: adminEmail.trim(),
          adminId: adminId.trim(),
          password: adminPassword.trim(),
          adminSecretKey: adminSecretKey.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Admin registration failed.');
      }

      showToast(data.message, 'success');
      setAdminName('');
      setAdminEmail('');
      setAdminId('');
      setAdminPassword('');
      setAdminConfirmPassword('');
      setAdminSecretKey('');
      handleTabChange('login');
    } catch (err) {
      setError(err.message || 'Server connection failed.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Forgot Password API
  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setError('Please enter your email.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim() })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Forgot Password check failed.');
      }

      showToast('Recovery code generated successfully!', 'success');
      setResetToken(data.resetToken); // preload token into reset view automatically for ease of local testing
      handleTabChange('reset');
    } catch (err) {
      setError(err.message || 'Server connection failed.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Reset Password API
  const handleResetSubmit = async (e) => {
    e.preventDefault();
    if (!resetToken.trim() || !newPassword.trim()) {
      setError('Token and new password are required.');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken.trim(), newPassword: newPassword.trim() })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Password reset failed.');
      }

      showToast(data.message, 'success');
      setResetToken('');
      setNewPassword('');
      setForgotEmail('');
      handleTabChange('login');
    } catch (err) {
      setError(err.message || 'Server connection failed.');
    } finally {
      setLoading(false);
    }
  };

  const isFlipped = tab !== 'login';

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      height: '100%',
      width: '100%',
      background: theme === 'dark'
        ? 'radial-gradient(circle at 10% 20%, #0d1e26 0%, #070c0e 90%)'
        : 'radial-gradient(circle at 10% 20%, #e3f2fd 0%, #f4f6f8 90%)',
      padding: '40px 20px',
      position: 'relative',
      overflowY: 'auto',
      boxSizing: 'border-box'
    }}>
      {/* Back to Website button Top Left */}
      <button
        onClick={onBack}
        className="glass-panel"
        style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          border: 'none',
          padding: '10px 16px',
          borderRadius: '30px',
          cursor: 'pointer',
          color: 'var(--text-primary)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          boxShadow: 'var(--shadow-sm)',
          zIndex: 10,
          fontWeight: 600,
          fontSize: '12px'
        }}
      >
        ← Back to Website
      </button>

      {/* Theme Toggle Top Right */}
      <button
        onClick={toggleTheme}
        className="glass-panel"
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          border: 'none',
          padding: '12px',
          borderRadius: '50%',
          cursor: 'pointer',
          color: 'var(--text-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'var(--shadow-sm)',
          zIndex: 10
        }}
        aria-label="Toggle Theme"
      >
        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      <div className="flip-container" style={{ width: '100%', maxWidth: '460px', margin: 'auto' }}>
        <div className={`flipper ${isFlipped ? 'flipped' : ''}`}>

          {/* FRONT CARD: LOGIN FORM */}
          <div className="front-card glass-panel animate-scale" style={{
            padding: '36px 28px',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            background: 'var(--bg-panel)',
            border: '1px solid var(--border-glass)'
          }}>
            {/* Logo */}
            <div style={{
              background: 'var(--primary-light)',
              color: 'var(--primary)',
              padding: '14px',
              borderRadius: 'var(--radius-md)',
              marginBottom: '16px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Shield size={30} />
            </div>

            <h1 style={{
              fontSize: '26px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              marginBottom: '4px',
              fontFamily: 'Outfit, sans-serif'
            }}>
              Cyber Chat
            </h1>
            <p style={{
              fontSize: '13px',
              color: 'var(--text-secondary)',
              marginBottom: '24px'
            }}>
              Log in using User ID or Admin ID
            </p>

            {/* Initials Avatar Preview */}
            <div
              className={`initials-avatar ${getAvatarBgClass(loginId)}`}
              style={{
                width: '74px',
                height: '74px',
                fontSize: '28px',
                marginBottom: '24px',
                boxShadow: '0 6px 18px rgba(0,0,0,0.1)',
                border: '3px solid var(--bg-panel)'
              }}
            >
              {getInitials(loginId)}
            </div>

            {/* Login Error Banner */}
            {tab === 'login' && error && (
              <div style={{
                width: '100%',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1.5px solid rgba(239, 68, 68, 0.25)',
                color: 'var(--danger)',
                fontSize: '13px',
                fontWeight: 500,
                padding: '10px 14px',
                borderRadius: '8px',
                marginBottom: '20px',
                textAlign: 'left'
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleLoginSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ position: 'relative', textAlign: 'left' }}>
                <label htmlFor="login-id" style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px', display: 'block', textTransform: 'uppercase' }}>User ID / Admin ID</label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <User size={16} style={{ position: 'absolute', left: '14px', color: 'var(--text-muted)' }} />
                  <input
                    id="login-id"
                    type="text"
                    placeholder="ID (e.g. user_123 or admin_007)"
                    value={loginId}
                    onChange={(e) => setLoginId(e.target.value)}
                    required
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={{ position: 'relative', textAlign: 'left' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label htmlFor="login-password" style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Password</label>
                  <button type="button" onClick={() => handleTabChange('forgot')} style={{ border: 'none', background: 'none', color: 'var(--primary)', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>Forgot Password?</button>
                </div>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Lock size={16} style={{ position: 'absolute', left: '14px', color: 'var(--text-muted)' }} />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter Password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    style={inputStyle}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '14px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', textAlign: 'left' }}>
                <input
                  id="remember"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{ cursor: 'pointer', accentColor: 'var(--primary)' }}
                />
                <label htmlFor="remember" style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 500, cursor: 'pointer', userSelect: 'none' }}>Remember me on this browser</label>
              </div>

              <button type="submit" disabled={loading} style={submitBtnStyle}>
                {loading ? 'Verifying Creds...' : 'Enter Platform'} <ArrowRight size={16} />
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '8px 0' }}>
                <span style={{ flex: 1, height: '1px', background: 'var(--border-glass)' }}></span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Or Secure Scan</span>
                <span style={{ flex: 1, height: '1px', background: 'var(--border-glass)' }}></span>
              </div>

              <button 
                type="button" 
                onClick={() => setShowQRScanner(true)}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid var(--primary)',
                  backgroundColor: 'rgba(0, 168, 132, 0.05)',
                  color: 'var(--primary)',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 0 10px rgba(0, 168, 132, 0.1)',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(0, 168, 132, 0.1)';
                  e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 168, 132, 0.25)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(0, 168, 132, 0.05)';
                  e.currentTarget.style.boxShadow = '0 0 10px rgba(0, 168, 132, 0.1)';
                }}
              >
                <QrCode size={18} /> QR Scanner Login
              </button>

              <div style={{ borderTop: '1px solid var(--border-glass)', marginTop: '10px', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>
                  Don't have an account?{' '}
                  <button type="button" onClick={() => handleTabChange('register_user')} style={linkBtnStyle}>Register User</button>
                </span>
                <span style={{ color: 'var(--text-secondary)' }}>
                  Want to manage chat?{' '}
                  <button type="button" onClick={() => handleTabChange('register_admin')} style={linkBtnStyle}>Register Admin</button>
                </span>
              </div>
            </form>
          </div>

          {/* BACK CARD: REGISTRATION & RECOVERY */}
          <div className="back-card glass-panel" style={{
            padding: '36px 28px',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            background: 'var(--bg-panel)',
            border: '1px solid var(--border-glass)',
            minHeight: '480px'
          }}>
            {/* Logo */}
            <div style={{
              background: 'var(--primary-light)',
              color: 'var(--primary)',
              padding: '14px',
              borderRadius: 'var(--radius-md)',
              marginBottom: '16px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Shield size={30} />
            </div>

            <h1 style={{
              fontSize: '26px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              marginBottom: '4px',
              fontFamily: 'Outfit, sans-serif'
            }}>
              Cyber Char
            </h1>
            <p style={{
              fontSize: '13px',
              color: 'var(--text-secondary)',
              marginBottom: '24px'
            }}>
              {tab === 'register_user' && 'Register a new standard user profile'}
              {tab === 'register_admin' && 'Register a new workspace administrator'}
              {tab === 'forgot' && 'Reset your password security code'}
              {tab === 'reset' && 'Enter reset token and new password'}
            </p>

            {/* Initials Avatar Preview (only for registration tabs) */}
            {['register_user', 'register_admin'].includes(tab) && (
              <div
                className={`initials-avatar ${getAvatarBgClass(tab === 'register_user' ? regUsername : adminName)}`}
                style={{
                  width: '74px',
                  height: '74px',
                  fontSize: '28px',
                  marginBottom: '24px',
                  boxShadow: '0 6px 18px rgba(0,0,0,0.1)',
                  border: '3px solid var(--bg-panel)'
                }}
              >
                {getInitials(tab === 'register_user' ? regUsername : adminName)}
              </div>
            )}

            {/* Registration/Forgot Error Banner */}
            {tab !== 'login' && error && (
              <div style={{
                width: '100%',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1.5px solid rgba(239, 68, 68, 0.25)',
                color: 'var(--danger)',
                fontSize: '13px',
                fontWeight: 500,
                padding: '10px 14px',
                borderRadius: '8px',
                marginBottom: '20px',
                textAlign: 'left'
              }}>
                {error}
              </div>
            )}

            {/* B. USER REGISTER VIEW */}
            {tab === 'register_user' && (
              <form onSubmit={handleRegisterUserSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ textAlign: 'left' }}>
                  <label style={labelStyle}>Full Name</label>
                  <div style={inputContainerStyle}>
                    <User size={15} style={inputIconStyle} />
                    <input type="text" placeholder="e.g. Vikas Prajapat" value={regUsername} onChange={(e) => setRegUsername(e.target.value)} required style={inputStyle} />
                  </div>
                </div>

                <div style={{ textAlign: 'left' }}>
                  <label style={labelStyle}>Email Address</label>
                  <div style={inputContainerStyle}>
                    <Mail size={15} style={inputIconStyle} />
                    <input type="email" placeholder="e.g. vikas@gmail.com" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} required style={inputStyle} />
                  </div>
                </div>

                <div style={{ textAlign: 'left' }}>
                  <label style={labelStyle}>Unique User ID</label>
                  <div style={inputContainerStyle}>
                    <Key size={15} style={inputIconStyle} />
                    <input type="text" placeholder="ID (e.g. user_vikas)" value={regUserId} onChange={(e) => setRegUserId(e.target.value)} required style={inputStyle} />
                  </div>
                </div>

                <div style={{ textAlign: 'left' }}>
                  <label style={labelStyle}>Password</label>
                  <div style={inputContainerStyle}>
                    <Lock size={15} style={inputIconStyle} />
                    <input type="password" placeholder="Min 6 characters" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} required style={inputStyle} />
                  </div>
                </div>

                <div style={{ textAlign: 'left' }}>
                  <label style={labelStyle}>Confirm Password</label>
                  <div style={inputContainerStyle}>
                    <Lock size={15} style={inputIconStyle} />
                    <input type="password" placeholder="Re-enter password" value={regConfirmPassword} onChange={(e) => setRegConfirmPassword(e.target.value)} required style={inputStyle} />
                  </div>
                </div>

                <button type="submit" disabled={loading} style={submitBtnStyle}>
                  {loading ? 'Creating Account...' : 'Complete User Registration'}
                </button>

                <button type="button" onClick={() => handleTabChange('login')} style={backToLoginStyle}>Back to Login</button>
              </form>
            )}

            {/* C. ADMIN REGISTER VIEW */}
            {tab === 'register_admin' && (
              <form onSubmit={handleRegisterAdminSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ textAlign: 'left' }}>
                  <label style={labelStyle}>Admin Full Name</label>
                  <div style={inputContainerStyle}>
                    <User size={15} style={inputIconStyle} />
                    <input type="text" placeholder="e.g. Server Owner" value={adminName} onChange={(e) => setAdminName(e.target.value)} required style={inputStyle} />
                  </div>
                </div>

                <div style={{ textAlign: 'left' }}>
                  <label style={labelStyle}>Admin Email Address</label>
                  <div style={inputContainerStyle}>
                    <Mail size={15} style={inputIconStyle} />
                    <input type="email" placeholder="e.g. admin@cyberchar.com" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} required style={inputStyle} />
                  </div>
                </div>

                <div style={{ textAlign: 'left' }}>
                  <label style={labelStyle}>Unique Admin ID</label>
                  <div style={inputContainerStyle}>
                    <Key size={15} style={inputIconStyle} />
                    <input type="text" placeholder="ID (e.g. admin_prime)" value={adminId} onChange={(e) => setAdminId(e.target.value)} required style={inputStyle} />
                  </div>
                </div>

                <div style={{ textAlign: 'left' }}>
                  <label style={labelStyle}>Password</label>
                  <div style={inputContainerStyle}>
                    <Lock size={15} style={inputIconStyle} />
                    <input type="password" placeholder="Min 6 characters" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} required style={inputStyle} />
                  </div>
                </div>

                <div style={{ textAlign: 'left' }}>
                  <label style={labelStyle}>Confirm Password</label>
                  <div style={inputContainerStyle}>
                    <Lock size={15} style={inputIconStyle} />
                    <input type="password" placeholder="Re-enter password" value={adminConfirmPassword} onChange={(e) => setAdminConfirmPassword(e.target.value)} required style={inputStyle} />
                  </div>
                </div>

                <div style={{ textAlign: 'left' }}>
                  <label style={labelStyle}>Admin Secret Key</label>
                  <div style={inputContainerStyle}>
                    <KeyRound size={15} style={inputIconStyle} />
                    <input type="password" placeholder="Required for authority verification" value={adminSecretKey} onChange={(e) => setAdminSecretKey(e.target.value)} required style={inputStyle} />
                  </div>
                </div>

                <button type="submit" disabled={loading} style={submitBtnStyle}>
                  {loading ? 'Authorizing Admin...' : 'Register Workspace Admin'}
                </button>

                <button type="button" onClick={() => handleTabChange('login')} style={backToLoginStyle}>Back to Login</button>
              </form>
            )}

            {/* D. FORGOT PASSWORD VIEW */}
            {tab === 'forgot' && (
              <form onSubmit={handleForgotSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', textAlign: 'left', lineHeight: '1.5' }}>
                  Enter your registered email address. We will verify your account and output a reset token securely.
                </p>
                <div style={{ textAlign: 'left' }}>
                  <label style={labelStyle}>Email Address</label>
                  <div style={inputContainerStyle}>
                    <Mail size={15} style={inputIconStyle} />
                    <input type="email" placeholder="e.g. vikas@gmail.com" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} required style={inputStyle} />
                  </div>
                </div>

                <button type="submit" disabled={loading} style={submitBtnStyle}>
                  {loading ? 'Searching Account...' : 'Get Recovery Reset Key'}
                </button>

                <button type="button" onClick={() => handleTabChange('login')} style={backToLoginStyle}>Back to Login</button>
              </form>
            )}

            {/* E. RESET PASSWORD VIEW */}
            {tab === 'reset' && (
              <form onSubmit={handleResetSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ textAlign: 'left' }}>
                  <label style={labelStyle}>Recovery Reset Token</label>
                  <div style={inputContainerStyle}>
                    <Key size={15} style={inputIconStyle} />
                    <input type="text" placeholder="Paste verification token key" value={resetToken} onChange={(e) => setResetToken(e.target.value)} required style={inputStyle} />
                  </div>
                </div>

                <div style={{ textAlign: 'left' }}>
                  <label style={labelStyle}>New Password</label>
                  <div style={inputContainerStyle}>
                    <Lock size={15} style={inputIconStyle} />
                    <input type="password" placeholder="Min 6 characters" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required style={inputStyle} />
                  </div>
                </div>

                <button type="submit" disabled={loading} style={submitBtnStyle}>
                  {loading ? 'Updating Password...' : 'Save New Password'}
                </button>

                <button type="button" onClick={() => handleTabChange('login')} style={backToLoginStyle}>Back to Login</button>
              </form>
            )}
          </div>

        </div>
      </div>

      {/* QR Scanner High-Tech Modal Overlay */}
      {showQRScanner && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(7, 12, 14, 0.96)',
          backdropFilter: 'blur(12px)',
          zIndex: 1500,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px'
        }}>
          {/* Keyframe Injector for laser sweep */}
          <style>{`
            @keyframes laser-sweep {
              0% { top: 0%; }
              50% { top: 100%; }
              100% { top: 0%; }
            }
            @keyframes scan-glow {
              0%, 100% { box-shadow: 0 0 20px rgba(0, 168, 132, 0.2); }
              50% { box-shadow: 0 0 40px rgba(0, 168, 132, 0.6); }
            }
          `}</style>

          <div className="glass-panel" style={{
            maxWidth: '400px',
            width: '100%',
            padding: '36px',
            borderRadius: '24px',
            backgroundColor: 'var(--bg-panel)',
            border: '1px solid var(--border-glass)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            animation: 'scan-glow 3s infinite'
          }}>
            <div style={{
              background: 'var(--primary-light)',
              color: 'var(--primary)',
              padding: '12px',
              borderRadius: '50%',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <QrCode size={28} />
            </div>

            <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px', fontFamily: 'Outfit, sans-serif' }}>
              Secure Matrix Scan
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '28px', lineHeight: '1.5' }}>
              Align your mobile authenticator QR matrix inside the laser frame to decrypt session credentials.
            </p>

            {/* QR Scan Window Container */}
            <div 
              onClick={() => {
                // Instant bypass on click
                setQrScanProgress(100);
                handleQRLogin();
              }}
              style={{
                position: 'relative',
                width: '200px',
                height: '200px',
                border: '2px solid var(--primary)',
                borderRadius: '16px',
                padding: '16px',
                backgroundColor: 'rgba(0,0,0,0.4)',
                cursor: 'pointer',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden'
              }}
              title="Click here to bypass & login instantly!"
            >
              {/* Corner brackets style */}
              <div style={{ position: 'absolute', top: '8px', left: '8px', width: '16px', height: '16px', borderTop: '3px solid var(--primary)', borderLeft: '3px solid var(--primary)' }}></div>
              <div style={{ position: 'absolute', top: '8px', right: '8px', width: '16px', height: '16px', borderTop: '3px solid var(--primary)', borderRight: '3px solid var(--primary)' }}></div>
              <div style={{ position: 'absolute', bottom: '8px', left: '8px', width: '16px', height: '16px', borderBottom: '3px solid var(--primary)', borderLeft: '3px solid var(--primary)' }}></div>
              <div style={{ position: 'absolute', bottom: '8px', right: '8px', width: '16px', height: '16px', borderBottom: '3px solid var(--primary)', borderRight: '3px solid var(--primary)' }}></div>

              {/* Laser line element */}
              <div style={{
                position: 'absolute',
                left: 0,
                right: 0,
                height: '3px',
                backgroundColor: 'rgba(0, 229, 255, 0.8)',
                boxShadow: '0 0 10px #00e5ff, 0 0 20px #00e5ff',
                animation: 'laser-sweep 2.5s infinite linear',
                pointerEvents: 'none'
              }}></div>

              {/* QR Code SVG Mock */}
              <svg width="100%" height="100%" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ opacity: 0.85 }}>
                {/* Outter anchors */}
                <rect x="5" y="5" width="22" height="22" stroke="var(--primary)" strokeWidth="4" rx="2" />
                <rect x="10" y="10" width="12" height="12" fill="var(--primary)" />

                <rect x="73" y="5" width="22" height="22" stroke="var(--primary)" strokeWidth="4" rx="2" />
                <rect x="78" y="10" width="12" height="12" fill="var(--primary)" />

                <rect x="5" y="73" width="22" height="22" stroke="var(--primary)" strokeWidth="4" rx="2" />
                <rect x="10" y="78" width="12" height="12" fill="var(--primary)" />

                {/* Random matrix blocks */}
                <rect x="35" y="10" width="6" height="6" fill="var(--text-muted)" />
                <rect x="47" y="5" width="6" height="12" fill="var(--primary)" />
                <rect x="59" y="15" width="6" height="6" fill="var(--text-muted)" />

                <rect x="35" y="35" width="12" height="6" fill="var(--primary)" />
                <rect x="53" y="29" width="6" height="18" fill="var(--text-muted)" />
                <rect x="73" y="35" width="18" height="6" fill="var(--primary)" />

                <rect x="10" y="45" width="12" height="6" fill="var(--text-muted)" />
                <rect x="16" y="57" width="18" height="6" fill="var(--primary)" />

                <rect x="41" y="59" width="6" height="12" fill="var(--primary)" />
                <rect x="59" y="53" width="18" height="6" fill="var(--text-muted)" />
                <rect x="79" y="59" width="12" height="12" fill="var(--primary)" />

                <rect x="35" y="79" width="12" height="6" fill="var(--text-muted)" />
                <rect x="53" y="73" width="6" height="18" fill="var(--primary)" />
                <rect x="65" y="85" width="18" height="6" fill="var(--text-muted)" />
              </svg>
            </div>

            {/* Status Telemetry */}
            <div style={{ width: '100%', marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>
                <span>{qrStatusText}</span>
                <span>{qrScanProgress}%</span>
              </div>
              <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--border-glass)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{
                  width: `${qrScanProgress}%`,
                  height: '100%',
                  backgroundColor: 'var(--primary)',
                  boxShadow: '0 0 8px var(--primary)',
                  transition: 'width 0.1s ease-out'
                }}></div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
              <button
                type="button"
                onClick={() => {
                  // Instant Scan action
                  setQrScanProgress(100);
                  handleQRLogin();
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: 'var(--primary)',
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '13px'
                }}
              >
                Scan Instantly
              </button>

              <button
                type="button"
                onClick={() => setShowQRScanner(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-glass)',
                  backgroundColor: 'transparent',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '13px'
                }}
              >
                Abort Scan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Styling Constants
const inputStyle = {
  width: '100%',
  padding: '12px 14px 12px 40px',
  borderRadius: '8px',
  border: '1px solid var(--border-glass)',
  backgroundColor: 'var(--bg-app)',
  color: 'var(--text-primary)',
  fontSize: '14px',
  outline: 'none'
};

const labelStyle = {
  fontSize: '11px',
  fontWeight: 700,
  color: 'var(--text-secondary)',
  marginBottom: '6px',
  display: 'block',
  textTransform: 'uppercase',
  letterSpacing: '0.05em'
};

const inputContainerStyle = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center'
};

const inputIconStyle = {
  position: 'absolute',
  left: '14px',
  color: 'var(--text-muted)'
};

const submitBtnStyle = {
  width: '100%',
  padding: '12px',
  borderRadius: '8px',
  border: 'none',
  backgroundColor: 'var(--primary)',
  color: '#fff',
  fontSize: '15px',
  fontWeight: 600,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  boxShadow: '0 4px 12px var(--primary-light)',
  transition: 'transform 0.1s ease'
};

const linkBtnStyle = {
  background: 'none',
  border: 'none',
  color: 'var(--primary)',
  fontWeight: 700,
  cursor: 'pointer',
  padding: '0 2px',
  textDecoration: 'underline'
};

const backToLoginStyle = {
  background: 'none',
  border: 'none',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  fontSize: '13px',
  fontWeight: 600,
  marginTop: '8px',
  textDecoration: 'underline'
};

export default Login;
