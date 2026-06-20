// frontend/src/components/Login.jsx
import React, { useState } from 'react';
import { Shield, ArrowRight, Sun, Moon, User, Lock, Mail, Key, KeyRound, Eye, EyeOff } from 'lucide-react';

function Login({ onLogin, theme, toggleTheme, showToast }) {
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
      const res = await fetch('/api/auth/login', {
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
      const res = await fetch('/api/auth/register-user', {
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
      const res = await fetch('/api/auth/register-admin', {
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
      const res = await fetch('/api/auth/forgot-password', {
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
      const res = await fetch('/api/auth/reset-password', {
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

      <div 
        className="glass-panel animate-slide" 
        style={{
          width: '100%',
          maxWidth: '460px',
          padding: '36px 28px',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          margin: 'auto'
        }}
      >
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
          {tab === 'login' && 'Log in using User ID or Admin ID'}
          {tab === 'register_user' && 'Register a new standard user profile'}
          {tab === 'register_admin' && 'Register a new workspace administrator'}
          {tab === 'forgot' && 'Reset your password security code'}
          {tab === 'reset' && 'Enter reset token and new password'}
        </p>

        {/* Initials Avatar Preview (only for registration & login) */}
        {['login', 'register_user', 'register_admin'].includes(tab) && (
          <div 
            className={`initials-avatar ${getAvatarBgClass(
              tab === 'login' ? loginId : (tab === 'register_user' ? regUsername : adminName)
            )}`}
            style={{
              width: '74px',
              height: '74px',
              fontSize: '28px',
              marginBottom: '24px',
              boxShadow: '0 6px 18px rgba(0,0,0,0.1)',
              border: '3px solid var(--bg-panel)'
            }}
          >
            {getInitials(tab === 'login' ? loginId : (tab === 'register_user' ? regUsername : adminName))}
          </div>
        )}

        {/* Global Error Banner */}
        {error && (
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

        {/* A. LOGIN VIEW */}
        {tab === 'login' && (
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
                <input type="email" placeholder="e.g. admin@cyberchat.com" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} required style={inputStyle} />
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
