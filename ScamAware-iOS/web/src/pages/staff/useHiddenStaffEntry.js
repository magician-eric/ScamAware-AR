import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const HOLD_MS = 5000;

// Hidden staff-mode entry: long-press the home logo for 5s (spec section 3,
// the preferred option of the three suggested). Deliberately renders no
// visible progress indicator while holding - a progress ring or growing
// highlight would tip off a curious player that something is there to find.
// Returns plain pointer-event handlers to spread onto the logo element;
// works for touch and mouse alike via Pointer Events, and a normal tap
// (release before 5s) does nothing, so it never interferes with any other
// click behavior the logo might have.
export function useHiddenStaffEntry() {
  const navigate = useNavigate();
  const timerRef = useRef(null);

  function start() {
    clear();
    timerRef.current = setTimeout(() => {
      navigate('/staff-setup');
    }, HOLD_MS);
  }

  function clear() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  return {
    onPointerDown: start,
    onPointerUp: clear,
    onPointerLeave: clear,
    onPointerCancel: clear,
    onContextMenu: (e) => e.preventDefault(), // a 5s hold can trigger a long-press context menu on some browsers
  };
}
