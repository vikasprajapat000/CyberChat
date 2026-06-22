// frontend/src/utils/audio.js

/**
 * Synthesizes audio alerts and ringtones using the Web Audio API.
 * Avoids referencing external assets which could break or fail to load.
 */
let audioCtx = null;
let incomingInterval = null;
let outgoingInterval = null;

const getAudioContext = () => {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  if (!audioCtx) {
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
};

export const playNotificationSound = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Primary Oscillator: Sweet chimes
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

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
    gainNode.connect(ctx.destination);

    // Playback
    osc.start(now);
    osc.stop(now + 0.4);
  } catch (error) {
    console.warn('Audio synthesis failed:', error);
  }
};

export const startIncomingRingtone = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (incomingInterval) clearInterval(incomingInterval);

    const playRingtoneNoteSequence = () => {
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.15);
        
        gainNode.gain.setValueAtTime(0, now + idx * 0.15);
        gainNode.gain.linearRampToValueAtTime(0.08, now + idx * 0.15 + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.15 + 0.4);
        
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        osc.start(now + idx * 0.15);
        osc.stop(now + idx * 0.15 + 0.5);
      });
    };

    playRingtoneNoteSequence();
    incomingInterval = setInterval(playRingtoneNoteSequence, 2000);
  } catch (error) {
    console.warn('Incoming ringtone synthesis failed:', error);
  }
};

export const startOutgoingRingtone = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (outgoingInterval) clearInterval(outgoingInterval);

    const playRingback = () => {
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';

      // standard dual tone (440Hz + 480Hz)
      osc1.frequency.setValueAtTime(440, now);
      osc2.frequency.setValueAtTime(480, now);

      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.04, now + 0.1);
      gainNode.gain.setValueAtTime(0.04, now + 1.5);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 2.0);
      osc2.stop(now + 2.0);
    };

    playRingback();
    outgoingInterval = setInterval(playRingback, 4000);
  } catch (error) {
    console.warn('Outgoing ringtone synthesis failed:', error);
  }
};

export const stopRingtone = () => {
  if (incomingInterval) {
    clearInterval(incomingInterval);
    incomingInterval = null;
  }
  if (outgoingInterval) {
    clearInterval(outgoingInterval);
    outgoingInterval = null;
  }
};
