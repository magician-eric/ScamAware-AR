// A screen whose one action is not a decision moves on by itself.
//
// Every swipe a player has to make is a chance for the sensor to miss one,
// and some screens ask for a swipe that decides nothing: a call the scenario
// says cannot be refused, a match screen whose only button opens the chat.
// Those now go on by themselves after a short beat - long enough to read what
// is on screen - and a swipe or a tap still goes on at once.
//
// The action is the screen's own (the same one its RIGHT gesture and button
// run), so an automatic step and a manual one cannot differ in what they do.
// It fires at most once per time `enabled` turns on; leaving the screen or the
// action running first (which changes the stage or unmounts the screen)
// cancels it.
import { useEffect, useRef } from 'react';

/** A ringing call is answered after this long: about two rings, and the caller ID read. */
export const AUTO_ANSWER_CALL_MS = 3000;
/** A match screen opens its chat after this long. */
export const AUTO_START_CHAT_MS = 2000;

export function useAutoAdvance(action, delayMs, enabled = true) {
  const actionRef = useRef(action);
  useEffect(() => {
    actionRef.current = action;
  });
  useEffect(() => {
    if (!enabled) return undefined;
    // Checked as well as cleared: a timer that fires after its screen moved on
    // (or a clock that runs every queued callback) must still do nothing.
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled && typeof actionRef.current === 'function') actionRef.current();
    }, delayMs);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [enabled, delayMs]);
}
