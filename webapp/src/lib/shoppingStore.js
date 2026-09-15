import { useEffect, useState } from 'react';
import { resolveCast } from '../experience/characters/casting';

// Scenario04 (BlackPi shopping fraud) state store. One JSON blob in
// localStorage (not sessionStorage like scenario02's platform state) because
// the spec explicitly requires "重整後可以恢復" - resuming after a refresh or
// even a closed tab, not just a same-session round trip.
const STATE_KEY = 'cibar-scenario04-state';
const KEY_PREFIX = 'cibar-scenario04-';

// Bump this whenever a dialogue tree's node/choice IDs change shape. A saved
// blob from an older version can point currentDialogueNodeId/askedChoiceIds
// at a choiceId or node that no longer exists, which would otherwise strand
// a returning device on a dead branch. getShoppingState() below detects the
// mismatch and does a full scenario04-scoped reset (never touches other
// scenarios' storage, since every key here already shares the KEY_PREFIX).
export const SCENARIO04_DATA_VERSION = 4;

export const SCORE_KEYS = ['trustScore', 'suspicionScore', 'evidenceScore', 'urgencyScore', 'assertivenessScore', 'sellerPressureScore'];

export const DEFAULT_STATE = {
  dataVersion: SCENARIO04_DATA_VERSION,
  selectedRoute: null, // null | 'health' | 'luckyBag'
  currentScreen: null,
  currentDialogueNodeId: null,
  dialogueHistory: [], // [{ nodeId, choiceId, at }]
  trustScore: 50,
  suspicionScore: 0,
  evidenceScore: 0,
  urgencyScore: 0,
  assertivenessScore: 0,
  sellerPressureScore: 0,
  warningFlags: [],
  evidenceSaved: [],
  orderStatus: 'none', // none|placed|paid|preparing|shipped|delivered|completed
  returnStatus: 'none', // none|requested|evidenceUploaded|shipped|inTransit|received|inspecting|refunded
  refundStatus: 'none', // none|pending|delayed|escalated|refunded|sellerUnreachable
  sellerUnreachable: false,
  completedRoutes: [],
  scenarioStartedAt: null,
  scenarioCompletedAt: null,
  askedChoiceIds: {}, // { [hubNodeId]: string[] }
  premiumOrderCompletedEarly: false,
  disputeStatus: null, // null | 'opened' | 'sellerContacted' | 'returnRequested' | 'returned'
  orderId: null,
  orderCreatedAt: null,
  // The unboxing photos the player has actually seen (asset keys, in the
  // order they are shown on 收貨開箱). Written when the 2x2 grid is revealed
  // and kept afterwards, so the return-request flow can offer these exact
  // shots as evidence rather than assuming which photos exist.
  unboxingPhotoAssets: [],
  // Who the 黑皮安心專員 is on this run. Drawn from the shared character
  // registry (see getPlatformAgentCast below) and persisted, so the name in
  // the chat header stays the same person across re-renders and refreshes.
  characterCast: null,
  returnEvidenceAssets: [],
  returnCode: null,
  trackingCode: null,
  // The single fact the ending outcome is computed from (see
  // pages/scenario04/OutcomeResult.jsx): true only once the player has
  // actually chosen to contact 165 at the platform's final decision point.
  // Everything else the run tracks (scores, warningFlags, sellerUnreachable)
  // is context/record-keeping for the Ending's analysis, never the verdict -
  // finding the platform, by itself, is never success.
  reported: false,
};

function clampScore(n) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

// Wipes every scenario04 key (state + per-chat sessionStorage checkpoints)
// without touching any other scenario's storage - used both by an explicit
// reset and by the stale-data-version guard below.
function wipeScenario04Storage() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(KEY_PREFIX))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore
  }
  try {
    Object.keys(sessionStorage)
      .filter((k) => k.startsWith(KEY_PREFIX))
      .forEach((k) => sessionStorage.removeItem(k));
  } catch {
    // ignore
  }
}

// An earlier build set orderStatus straight to 'completed' the moment the
// player finished unboxing, before any dispute/return/refund had even
// started - a save from that build (or a mid-run device that hit this
// exact bug) would show "訂單已完成" while the player is still actively
// fighting for a refund. Read-time correction, not a version-gated wipe:
// safe to reapply every load, and never overwrites a genuinely resolved
// order (refundStatus === 'refunded') or a deliberate later completion
// that already set its own disputeStatus.
function correctStaleCompletedOrder(state) {
  if (state.orderStatus === 'completed' && state.refundStatus !== 'refunded' && !state.disputeStatus) {
    return { ...state, orderStatus: 'delivered', disputeStatus: 'opened' };
  }
  return state;
}

export function getShoppingState() {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw);
    if (parsed.dataVersion !== SCENARIO04_DATA_VERSION) {
      // Old save points at node/choice IDs that may no longer exist - the
      // only safe move is a full reset scoped to this scenario, rather than
      // trying to patch a currentDialogueNodeId that might be gone.
      wipeScenario04Storage();
      return { ...DEFAULT_STATE };
    }
    return correctStaleCompletedOrder({ ...DEFAULT_STATE, ...parsed });
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function saveShoppingState(patch) {
  const current = getShoppingState();
  const next = { ...current, ...patch };
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(next));
  } catch {
    // localStorage unavailable (private mode / quota) - state just won't persist.
  }
  return next;
}

// Applies a DialogueEffect object: numeric fields add+clamp, arrays union,
// booleans set. See features/shopping/dialogueEngine.js for the shape.
export function applyEffects(effects) {
  if (!effects) return getShoppingState();
  const current = getShoppingState();
  const patch = {};
  if (typeof effects.trust === 'number') patch.trustScore = clampScore(current.trustScore + effects.trust);
  if (typeof effects.suspicion === 'number') patch.suspicionScore = clampScore(current.suspicionScore + effects.suspicion);
  if (typeof effects.evidence === 'number') patch.evidenceScore = clampScore(current.evidenceScore + effects.evidence);
  if (typeof effects.urgency === 'number') patch.urgencyScore = clampScore(current.urgencyScore + effects.urgency);
  if (typeof effects.assertiveness === 'number') patch.assertivenessScore = clampScore(current.assertivenessScore + effects.assertiveness);
  if (typeof effects.sellerPressure === 'number') patch.sellerPressureScore = clampScore(current.sellerPressureScore + effects.sellerPressure);
  if (Array.isArray(effects.evidenceSaved) && effects.evidenceSaved.length) {
    patch.evidenceSaved = Array.from(new Set([...current.evidenceSaved, ...effects.evidenceSaved]));
  }
  if (Array.isArray(effects.warningFlags) && effects.warningFlags.length) {
    patch.warningFlags = Array.from(new Set([...current.warningFlags, ...effects.warningFlags]));
  }
  return saveShoppingState(patch);
}

// Local (device-timezone) date, not UTC - new Date().toISOString() would
// roll back to "yesterday" for anyone in Taiwan playing after midnight UTC
// (i.e. most of the day, since UTC+8 means local time is always 8h ahead).
export function formatLocalDateYYYYMMDD(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

function randomDigits(count) {
  let out = '';
  for (let i = 0; i < count; i += 1) out += Math.floor(Math.random() * 10);
  return out;
}

// Single place every scenario04 identifier is built, all keyed off the
// player's local date rather than a hardcoded one. Once generated and
// saved to state, callers must persist the result (see checkout/return-
// shipping) instead of calling this again on every render/revisit.
export function generateScenarioId(type, _route) {
  const datePart = formatLocalDateYYYYMMDD();
  switch (type) {
    case 'order':
      // CIB identifies the training experience; 165 is intentionally
      // embedded in every fictional order number, followed by two digits.
      return `BP${datePart}-CIB-165${randomDigits(2)}`;
    case 'return':
      return `BP-RT-${datePart}-${randomDigits(5)}`;
    case 'tracking':
      return `BPX-${datePart}-${randomDigits(5)}`;
    default:
      return `BP-${datePart}-${randomDigits(5)}`;
  }
}

// The 黑皮安心專員 for this run. Resolved lazily on first read and persisted,
// so a player who lands mid-scenario still gets one and two screens can never
// disagree about who she is - same approach as scenario05's getBuyerCast().
// One draw settles her name AND her face together (resolveCast returns both
// on the same role entry), so the two can never be picked apart into a
// mismatched person. The name and the visual both come from the shared pools
// in experience/characters/; nothing here owns a list of its own.
//
// The visualId condition matters as much as the roleId one: a save written
// before she had a face carries a cast with visualId null, and re-drawing it
// once is what gives that run an avatar instead of a permanent blank.
export function getPlatformAgentCast() {
  const state = getShoppingState();
  const cast = state.characterCast?.roles?.platformAgent;
  if (cast?.roleId === 'scenario04.platformAgent' && cast.visualId) return state.characterCast;
  const characterCast = resolveCast('scenario04', [{ roleId: 'scenario04.platformAgent', slotId: 'platformAgent' }]);
  return saveShoppingState({ characterCast }).characterCast;
}

export function generateReturnCode() {
  return generateScenarioId('return');
}

export function generateTrackingCode() {
  return generateScenarioId('tracking');
}

export function markChoiceAsked(hubNodeId, choiceId) {
  const current = getShoppingState();
  const existing = current.askedChoiceIds[hubNodeId] || [];
  if (existing.includes(choiceId)) return current;
  return saveShoppingState({
    askedChoiceIds: { ...current.askedChoiceIds, [hubNodeId]: [...existing, choiceId] },
  });
}

export function getAskedChoiceIds(hubNodeId) {
  return getShoppingState().askedChoiceIds[hubNodeId] || [];
}

export function useShoppingState() {
  const [state, setState] = useState(() => getShoppingState());
  function update(patch) {
    setState(() => saveShoppingState(patch));
  }
  // Keep in sync if another tab / the debug panel mutates storage directly.
  useEffect(() => {
    function onStorage(e) {
      if (e.key === STATE_KEY) setState(getShoppingState());
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);
  return [state, update, () => setState(getShoppingState())];
}

// Starts a fresh run: clears everything including completedRoutes. Used by
// the splash screen's fresh entry and the debug panel's "重設".
export function resetShoppingAll() {
  wipeScenario04Storage();
  return saveShoppingState({ scenarioStartedAt: Date.now() });
}

// Banks the finished route: keeps completedRoutes + lifetime flags and clears
// the per-route order/dialogue/refund state. Called when the player finishes a
// run at 詐騙疑點分析 (and by the debug panel's per-route reset).
export function resetShoppingRoute() {
  const current = getShoppingState();
  const completed = current.selectedRoute && !current.completedRoutes.includes(current.selectedRoute)
    ? [...current.completedRoutes, current.selectedRoute]
    : current.completedRoutes;
  return saveShoppingState({
    ...DEFAULT_STATE,
    completedRoutes: completed,
    scenarioStartedAt: current.scenarioStartedAt,
    askedChoiceIds: {},
  });
}

// Per-chat-screen resumable timeline, keyed by screen id, so a mid-chat
// refresh restores the rendered message history instead of replaying the
// whole script from the top. Lives in sessionStorage (history is only ever
// meaningful for the current run) - cleared by resetShoppingAll/Route via the
// same key-prefix sweep above.
export function saveDialogueCheckpoint(screenKey, checkpoint) {
  try {
    sessionStorage.setItem(`${KEY_PREFIX}chat-${screenKey}`, JSON.stringify(checkpoint));
  } catch {
    // ignore
  }
}

export function loadDialogueCheckpoint(screenKey) {
  try {
    const raw = sessionStorage.getItem(`${KEY_PREFIX}chat-${screenKey}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearDialogueCheckpoint(screenKey) {
  try {
    sessionStorage.removeItem(`${KEY_PREFIX}chat-${screenKey}`);
  } catch {
    // ignore
  }
}
