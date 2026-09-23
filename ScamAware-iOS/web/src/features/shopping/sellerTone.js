// Seller's in-the-moment tone, derived from the player's live scores rather
// than only feeding into the final ending analysis - a handful of key
// dialogue nodes pick their line from this instead of a single fixed string,
// so the player can feel the seller adjust to how they're coming across.
export function getSellerTone(state) {
  if (state.suspicionScore >= 40 || state.assertivenessScore >= 40) return 'defensive';
  if (state.trustScore > state.suspicionScore + 15) return 'trusting';
  return 'cautious';
}

// Picks the line for the current tone, falling back to `cautious` (the
// most neutral, "haven't picked a side yet" register) if a specific node
// only bothered to write two of the three variants.
export function toneLine(state, variants) {
  const tone = getSellerTone(state);
  return variants[tone] ?? variants.cautious ?? variants.trusting ?? variants.defensive;
}
