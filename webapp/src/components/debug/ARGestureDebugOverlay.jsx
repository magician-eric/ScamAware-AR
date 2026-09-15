import { useEffect, useState } from 'react';
import {
  getARGestureSnapshot,
  subscribeARGestureDispatch,
} from '../../lib/arInteraction/gestureBridge';
import { isARGestureDebugEnabled } from '../../lib/arInteraction/debug/gestureDebugFlag';
import { startARGestureKeyboardAdapter } from '../../lib/arInteraction/debug/keyboardGestureAdapter';

// DEV-only engineering readout for the AR Gesture Bridge, and the thing that
// starts the DEV keyboard adapter. Off unless VITE_AR_GESTURE_DEBUG=true, in
// which case it prints what the Bridge would aim a gesture at right now and
// what the last dispatch did.
//
// This is not player-facing UI and is not meant to look like any. There is
// no gesture tutorial, no ← / → hint, no hand icon, no animation: the AR
// build's real screens must look exactly as they do today, so nothing here
// is ever visible in a production build, and nothing here styles, wraps or
// touches a scenario. All styling is inline for the same reason - it cannot
// reach a scenario stylesheet even by accident - and the whole layer is
// `pointer-events: none`, so touch and click on the screen underneath keep
// working exactly as before.
const BOX = {
  position: 'fixed',
  top: 8,
  left: 8,
  zIndex: 2147483647,
  pointerEvents: 'none',
  maxWidth: 'min(320px, calc(100vw - 16px))',
  padding: '8px 10px',
  borderRadius: 6,
  background: 'rgba(0, 0, 0, 0.78)',
  color: '#e8e8e8',
  font: '11px/1.45 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-all',
};

const TITLE = { color: '#9ad', marginBottom: 4, letterSpacing: '0.04em' };

// The overlay only mirrors state it is given; it keeps no second copy of the
// contract. The poll is a UI refresh so that a surface reached by *tapping*
// shows up too - it is not a gesture timer, and no dispatch decision anywhere
// depends on it.
const REFRESH_MS = 250;

function describe(event) {
  if (!event) return 'none';
  const gesture = (event.gesture ?? 'invalid').toUpperCase();
  if (!event.accepted) return `${gesture} rejected (${event.reason})`;
  if (event.phase === 'settled') {
    return event.outcome?.status === 'ok'
      ? `${gesture} accepted`
      : `${gesture} accepted, ${event.outcome?.status}`;
  }
  return `${gesture} accepted, running`;
}

export function ARGestureDebugOverlay() {
  const enabled = isARGestureDebugEnabled();
  const [snapshot, setSnapshot] = useState(null);
  const [last, setLast] = useState(null);

  useEffect(() => {
    if (!enabled) return undefined;
    const stopKeyboard = startARGestureKeyboardAdapter();
    const unsubscribe = subscribeARGestureDispatch((event) => {
      setLast(event);
      setSnapshot(getARGestureSnapshot());
    });
    setSnapshot(getARGestureSnapshot());
    const timer = setInterval(() => setSnapshot(getARGestureSnapshot()), REFRESH_MS);
    return () => {
      clearInterval(timer);
      unsubscribe();
      stopKeyboard();
    };
  }, [enabled]);

  if (!enabled || !snapshot) return null;

  return (
    <div style={BOX} aria-hidden="true">
      <div style={TITLE}>AR GESTURE DEBUG</div>
      <div>{`Surface:  ${snapshot.surfaceId ?? '(none)'}`}</div>
      <div>{`Mode:     ${snapshot.mode}${snapshot.declaredMode === snapshot.mode ? '' : ` (declared ${snapshot.declaredMode})`}`}</div>
      <div>{`Revision: ${snapshot.revision}`}</div>
      <div>{`LEFT:     ${snapshot.leftAvailable ? 'ON' : 'OFF'}`}</div>
      <div>{`RIGHT:    ${snapshot.rightAvailable ? 'ON' : 'OFF'}`}</div>
      <div>{`Last:     ${describe(last)}`}</div>
    </div>
  );
}
