// frontend/src/utils/audio.js

/**
 * Synthesizes a premium message alert sound using the Web Audio API
 * Avoids referencing external assets which could break or fail to load.
 */
let audioCtx = null;

export const playNotificationSound = () => {
  try {
    // Check for browser support
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    // Initialize on first user interaction to satisfy browser policies
    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;

    // Primary Oscillator: Sweet chimes
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc.type = 'sine';
    
    // Bubble chime note sequence (E5 -> A5)
    osc.frequency.setValueAtTime(659.25, now); // E5
    osc.frequency.exponentialRampToValueAtTime(880.00, now + 0.08); // A5

    // Gain envelope: fast attack, smooth decay
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.12, now + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    // Connections
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    // Playback
    osc.start(now);
    osc.stop(now + 0.4);
  } catch (error) {
    // Silent catch (e.g. user hasn't clicked page yet, browser blocked autoplay)
    console.warn('Audio synthesis failed:', error);
  }
};
