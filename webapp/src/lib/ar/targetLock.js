// Which target the player is being offered right now - held steady across the
// gaps in recognition, so the offer does not flicker.
//
// The recogniser (./imageRecognition.js) answers one question per frame: is a
// target in view *this frame*. That is not the question the scan page asks. A
// player holding a printed card in front of AR glasses produces a stream of
// matched frames with holes in it - a hand tremor, a head turn, a reflection
// off the print, the alternating zoom pass looking at the wrong scale - and a
// prompt driven straight off "matched this frame" would blink out and back
// several times a second while the card never left the player's hand.
//
// So the page does not read frames, it reads this: the target it is currently
// offering, which a sighting sets and only the *absence* of sightings clears,
// after TARGET_LOSS_TOLERANCE_MS of them. Between those two the offer holds
// still, whatever individual frames did.
//
// Deliberately not a tracker. There is no pose, no motion model, no filter and
// no per-frame history - the whole state is "which target, and when was it
// last seen". Everything above it (the prompt, the CTA, the RIGHT gesture)
// reads `selected`, and nothing anywhere reads a frame.

// How long an offer outlives its last sighting. Long enough to cover the
// tracking gaps described above; short enough that a player who has walked
// away from the poster is back to searching before they wonder why the
// glasses are still offering a scenario they can no longer see.
export const TARGET_LOSS_TOLERANCE_MS = 3500;

/**
 * @param {object} [options]
 * @param {number} [options.toleranceMs] - how long an offer survives with no
 *   sighting. Exposed for tests; the app uses the constant above.
 * @returns {{
 *   selected: number|null,
 *   lastSeenAt: number,
 *   see: (targetIndex: number, at: number) => boolean,
 *   expire: (at: number) => boolean,
 *   clear: () => boolean,
 * }} `see` and `expire` return whether the *selection* changed, so a caller
 *   can re-render on exactly the transitions a player can see and ignore the
 *   many frames that change nothing.
 */
export function createTargetLock({ toleranceMs = TARGET_LOSS_TOLERANCE_MS } = {}) {
  let selected = null;
  let lastSeenAt = 0;

  return {
    get selected() {
      return selected;
    },
    get lastSeenAt() {
      return lastSeenAt;
    },

    // A frame matched `targetIndex`. Two cases, and the difference is the
    // whole module: the same target refreshes the offer silently (this is the
    // steady state - it happens many times a second while a card is in view),
    // a different one replaces it. Replacing rather than queueing is what
    // keeps exactly one scenario on offer when a player sweeps the glasses
    // from one printed card to the next.
    see(targetIndex, at) {
      lastSeenAt = at;
      if (selected === targetIndex) return false;
      selected = targetIndex;
      return true;
    },

    // Time passed with no sighting. Drops the offer once the gap since the
    // last one exceeds the tolerance; a no-op at every other moment, so it is
    // safe to call on a plain interval.
    expire(at) {
      if (selected === null) return false;
      if (at - lastSeenAt < toleranceMs) return false;
      selected = null;
      return true;
    },

    // Drop the offer now, whatever the clock says - the player took it, or the
    // page is going away.
    clear() {
      if (selected === null) return false;
      selected = null;
      return true;
    },
  };
}
