// Best-effort media-autoplay priming. The actual guarantee that datingLead's
// videos play automatically (see PrivateChat.jsx's VideoOverlay) comes from
// starting every video `muted` (browsers always allow muted autoplay) and
// then flipping `.muted = false` once it's already playing - toggling mute
// on a playing element isn't a new play() call, so it isn't re-blocked by
// autoplay policy the way a fresh unmuted play() would be. That mechanism
// works with zero setup.
//
// This module is the extra, non-essential layer on top: resuming a Web
// Audio context on the very first tap anywhere in the app, so audio
// hardware is already "warmed up" by the time a video needs it. If it fails
// or does nothing (unsupported browser, no AudioContext), playback still
// proceeds via the muted/unmute path above - this is only ever a nice-to-
// have, never a requirement for the auto-play flow to work.
let primed = false;

export function primeMediaAutoplay() {
  if (primed) return;
  primed = true;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    setTimeout(() => ctx.close().catch(() => {}), 200);
  } catch {
    // best-effort only
  }
}

// Call once at the app root - primes on the first tap/click anywhere, long
// before the player ever reaches scenario02's videos.
export function installMediaAutoplayPrimer() {
  const handler = () => primeMediaAutoplay();
  window.addEventListener('pointerdown', handler, { once: true, capture: true });
  return () => window.removeEventListener('pointerdown', handler, { capture: true });
}
