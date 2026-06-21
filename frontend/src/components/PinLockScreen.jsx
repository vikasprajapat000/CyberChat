import { useState, useEffect, useRef } from 'react';
import {
  Lock, Unlock, Fingerprint, Eye, EyeOff, AlertCircle, CheckCircle2
} from 'lucide-react';

export default function PinLockScreen({ onUnlock, apiBase }) {
  const [pin, setPin] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [locked, setLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState(0);
  const [showPin, setShowPin] = useState(false);
  const [fingerprintSupported, setFingerprintSupported] = useState(false);
  const inputsRef = useRef([]);
  const token = localStorage.getItem('cc_token');

  useEffect(() => {
    // Check WebAuthn support
    if (window.PublicKeyCredential) {
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        .then(available => setFingerprintSupported(available))
        .catch(() => setFingerprintSupported(false));
    }
    // Auto focus first input
    inputsRef.current[0]?.focus();
  }, []);

  // Lockout timer
  useEffect(() => {
    if (lockTimer > 0) {
      const t = setInterval(() => {
        setLockTimer(prev => {
          if (prev <= 1) {
            setLocked(false);
            setAttempts(0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(t);
    }
  }, [lockTimer]);

  const handlePinInput = (value, index) => {
    if (locked) return;
    const digit = value.replace(/\D/g, '').slice(-1);
    const newPin = [...pin];
    newPin[index] = digit;
    setPin(newPin);
    setError('');

    if (digit && index < 3) {
      inputsRef.current[index + 1]?.focus();
    }

    // Auto-submit when all 4 filled
    if (index === 3 && digit) {
      const full = [...newPin.slice(0, 3), digit];
      submitPin(full.join(''));
    }
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const submitPin = async (pinValue) => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/api/auth/pin-lock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'verify', pin: pinValue })
      });
      const data = await res.json();

      if (data.success) {
        setError('');
        // Small celebration delay
        setTimeout(() => onUnlock(), 300);
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        setPin(['', '', '', '']);
        inputsRef.current[0]?.focus();

        if (newAttempts >= 5) {
          setLocked(true);
          setLockTimer(30);
          setError('Too many attempts. Try again in 30 seconds.');
        } else {
          setError(`Incorrect PIN. ${5 - newAttempts} attempts remaining.`);
        }
      }
    } catch (e) {
      setError('Unable to verify PIN. Check connection.');
      setPin(['', '', '', '']);
    } finally {
      setLoading(false);
    }
  };

  const handleFingerprintAuth = async () => {
    if (!fingerprintSupported) return;
    try {
      // WebAuthn credential assertion (simplified biometric prompt)
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: new Uint8Array(32).map(() => Math.floor(Math.random() * 256)),
          rpId: window.location.hostname,
          userVerification: 'required',
          timeout: 60000
        }
      });
      if (credential) {
        onUnlock();
      }
    } catch (e) {
      setError('Fingerprint authentication failed. Please use PIN.');
    }
  };

  return (
    <div className="pin-lock-overlay">
      <div className="pin-lock-card">
        {/* Lock icon */}
        <div className={`pin-lock-icon ${loading ? 'unlocking' : ''}`}>
          {loading ? <Unlock size={40} /> : <Lock size={40} />}
        </div>

        <h2 className="pin-lock-title">CyberChar Locked</h2>
        <p className="pin-lock-subtitle">
          {locked
            ? `Locked for ${lockTimer}s...`
            : 'Enter your PIN to continue'}
        </p>

        {/* PIN input boxes */}
        <div className="pin-inputs">
          {pin.map((digit, i) => (
            <input
              key={i}
              ref={el => inputsRef.current[i] = el}
              type={showPin ? 'text' : 'password'}
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={e => handlePinInput(e.target.value, i)}
              onKeyDown={e => handleKeyDown(e, i)}
              className={`pin-input ${digit ? 'filled' : ''} ${error ? 'error' : ''}`}
              disabled={locked || loading}
            />
          ))}
        </div>

        {/* Show/hide PIN */}
        <button
          className="pin-show-btn"
          onClick={() => setShowPin(!showPin)}
          type="button"
        >
          {showPin ? <EyeOff size={14} /> : <Eye size={14} />}
          {showPin ? 'Hide PIN' : 'Show PIN'}
        </button>

        {/* Error */}
        {error && (
          <div className="pin-error">
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}

        {/* Fingerprint option */}
        {fingerprintSupported && !locked && (
          <button className="pin-fingerprint-btn" onClick={handleFingerprintAuth} type="button">
            <Fingerprint size={20} />
            <span>Use Fingerprint</span>
          </button>
        )}

        {/* Number pad for mobile */}
        <div className="pin-numpad">
          {[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map((num, i) => (
            <button
              key={i}
              className={`pin-numpad-btn ${num === '' ? 'empty' : ''}`}
              disabled={num === '' || locked || loading}
              onClick={() => {
                if (num === '⌫') {
                  // backspace
                  const lastFilled = pin.map((d, i) => d ? i : -1).filter(i => i >= 0);
                  if (lastFilled.length > 0) {
                    const idx = lastFilled[lastFilled.length - 1];
                    const newPin = [...pin];
                    newPin[idx] = '';
                    setPin(newPin);
                    inputsRef.current[idx]?.focus();
                  }
                } else {
                  const emptyIdx = pin.findIndex(d => !d);
                  if (emptyIdx !== -1) {
                    handlePinInput(String(num), emptyIdx);
                  }
                }
              }}
            >
              {num}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
