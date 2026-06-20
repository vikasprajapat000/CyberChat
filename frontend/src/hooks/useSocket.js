// frontend/src/hooks/useSocket.js
import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://cyberchat-d26c.onrender.com';

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

    socket.on('connect_error', (err) => {
      setConnected(false);
      setError('Connection failed. Retrying...');
      console.warn('Socket connect error:', err);
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
