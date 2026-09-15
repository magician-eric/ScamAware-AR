// Lightweight, dependency-free sound + haptic feedback for scenario04. Tones
// are synthesized with WebAudio (no audio asset files to ship/load) and kept
// very short and quiet - this runs on a public demo kiosk, not headphones.
// Respects prefers-reduced-motion (haptics count as "motion") and a
// persisted soundEnabled toggle, defaulting to on.

const SOUND_KEY = 'cibar-scenario04-sound-enabled';

export function isSoundEnabled() {
  try {
    const raw = localStorage.getItem(SOUND_KEY);
    return raw === null ? true : raw === '1';
  } catch {
    return true;
  }
}

export function setSoundEnabled(enabled) {
  try {
    localStorage.setItem(SOUND_KEY, enabled ? '1' : '0');
  } catch {
    // ignore
  }
}

function prefersReducedMotion() {
  try {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  } catch {
    return false;
  }
}

let audioCtx = null;
function getAudioContext() {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  if (!audioCtx) audioCtx = new Ctor();
  return audioCtx;
}

// name -> [frequencyHz, durationMs, gainPeak]. Deliberately short and quiet.
const TONES = {
  message: [740, 70, 0.05],
  paymentSuccess: [880, 140, 0.08],
  delivered: [660, 160, 0.08],
  anomaly: [220, 180, 0.07],
  sellerUnreachable: [180, 260, 0.06],
  hotlineConnected: [520, 120, 0.07],
};

function playTone(name) {
  if (!isSoundEnabled()) return;
  const spec = TONES[name];
  if (!spec) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    if (ctx.state === 'suspended') ctx.resume();
    const [freq, durationMs, peak] = spec;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = name === 'sellerUnreachable' || name === 'anomaly' ? 'triangle' : 'sine';
    osc.frequency.value = freq;
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(peak, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + durationMs / 1000 + 0.02);
  } catch {
    // WebAudio unavailable or blocked - silently skip, never breaks the flow.
  }
}

// name -> vibrate pattern (ms). Values per spec section 25.
const HAPTICS = {
  paymentSuccess: 50,
  delivered: 50,
  anomaly: 80,
  sellerUnreachable: 100,
  hotlineConnected: 40,
};

function vibrate(name) {
  if (prefersReducedMotion()) return;
  if (!isSoundEnabled()) return;
  const pattern = HAPTICS[name];
  if (!pattern) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // unsupported - ignore
  }
}

// Single entry point most call sites use: plays the tone and fires the
// matching haptic together for one named beat (see TONES/HAPTICS above).
export function feedback(name) {
  playTone(name);
  vibrate(name);
}
