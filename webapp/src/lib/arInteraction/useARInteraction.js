import { useEffect, useRef } from 'react';
import { registerARInteraction, releaseARInteraction } from './interactionContract';

// The whole API a screen sees. A screen declares what the player can do, in
// story terms, and nothing else:
//
//   useARInteraction({ mode: 'display' });
//   useARInteraction({ mode: 'single', action: continueFlow });
//   useARInteraction({ mode: 'dual', left: () => choose(0), right: () => choose(1) });
//
// A screen never learns how a gesture is recognised, where the camera is,
// which SDK is running, or what hand shape "RIGHT" is - see
// ./interactionContract.js for why that separation is the point.
//
// Anything the screen already disables should be declared unavailable too,
// either with `disabled: true` for the whole screen or by passing `null` for
// that side. Availability is re-read on every gesture, not captured at mount,
// so a quiz that has just been answered is inactive to gestures the moment it
// is inactive to taps.
//
// Lifecycle: the registration is made on mount and dropped on unmount, so
// navigating from a dual screen to a single one leaves exactly the new
// screen's action behind - LEFT can never still reach the previous page's
// handler. Registration happens once; the handlers themselves are read live
// through a ref, so re-rendering with new handlers needs no re-registration
// and cannot momentarily leave the screen without a contract.
export function useARInteraction(declaration) {
  const latest = useRef(declaration);
  latest.current = declaration;

  useEffect(() => {
    const token = registerARInteraction(() => latest.current);
    return () => releaseARInteraction(token);
  }, []);
}
