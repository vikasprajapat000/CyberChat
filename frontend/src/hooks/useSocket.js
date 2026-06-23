// frontend/src/hooks/useSocket.js
import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:5000' : 'https://cyberchat-1-qiqj.onrender.com');

export const useSocket = () => {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);
  const socketRef = useRef(null);

  // Initialize socket instance if not active
  const connectSocket = (user) => {
    if (socketRef.current) return socketRef.current;

    const token = localStorage.getItem('cc_token');

    // Connect to backend
    const socket = io(BACKEND_URL, {
      auth: { token },
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      transports: ['websocket', 'polling']
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      setError(null);
      // Automatically login on connect (or reconnect)
      socket.emit('user_login');
    });

    socket.on('disconnect', (reason) => {
      setConnected(false);
      if (reason === 'io server disconnect') {
        // the disconnection was initiated by the server, need to reconnect manually
        socket.connect();
      }
    });

    socket.on('connect_error', async (err) => {
      console.warn('Socket connect error:', err);

      if (err.message && (err.message.includes('Authentication error') || err.message.includes('Token') || err.message.includes('token'))) {
        const refreshToken = localStorage.getItem('cc_refresh_token');
        if (refreshToken) {
          try {
            const res = await fetch(`${BACKEND_URL}/api/auth/refresh`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refreshToken })
            });

            if (res.ok) {
              const data = await res.json();
              if (data.success && data.accessToken) {
                localStorage.setItem('cc_token', data.accessToken);
                if (data.refreshToken) {
                  localStorage.setItem('cc_refresh_token', data.refreshToken);
                }

                socket.auth.token = data.accessToken;
                socket.connect();
                return;
              }
            }
          } catch (e) {
            console.error('[CyberChat Socket] Failed to refresh token on connection error:', e);
          }
        }
      }

      setConnected(false);
      setError('Connection failed. Retrying...');
    });

    return socket;
  };

  const disconnectSocket = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setConnected(false);
      setError(null);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnectSocket();
    };
  }, []);

  return {
    socket: socketRef.current,
    connected,
    error,
    connectSocket,
    disconnectSocket
  };
};
