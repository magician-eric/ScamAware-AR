// Scenario03 (假檢警) sound effects - REMOVED per explicit request: no
// synthesized WebAudio sound effects anywhere in this scenario (no
// ringtone tone, no click, no hangup/dial/sms/callConnected tones). Every
// caller across scenario03 (IncomingCall/ProsecutorCall/PoliceCallback/
// CaseSite/BankSite/FinalDecision/etc.) still calls playSound()/
// startRingtone()/buzz() at the same points in the flow - button presses,
// the incoming-call state, hangups - so those call sites don't need to
// change; these are now harmless no-ops instead of deleting every call
// site individually. buzz() (device vibration, not audio) is unaffected.
import { isSoundEnabled } from './feedback';

function prefersReducedMotion() {
  try {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  } catch {
    return false;
  }
}

// eslint-disable-next-line no-unused-vars
export function playSound(name) {
  // intentionally silent - see file header.
}

// The incoming-call ringtone used to keep repeating an audible tone until
// answered/declined; now it just returns a no-op stop function so callers'
// effect cleanup wiring is unchanged.
// eslint-disable-next-line no-unused-vars
export function startRingtone(intervalMs = 1400) {
  return () => {};
}

// Vibration is simulated visually elsewhere (CSS shake) since kiosk display
// hardware has no vibrator - this still fires navigator.vibrate where it
// happens to exist, and stays silent under prefers-reduced-motion. Not an
// audio effect, so it is unaffected by the sound-effect removal above.
export function buzz(pattern = 60) {
  if (prefersReducedMotion() || !isSoundEnabled()) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // unsupported - ignore
  }
}
